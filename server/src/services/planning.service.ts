import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class PlanningService {
    /**
     * Cleans AI response by removing markdown code blocks
     */
    private cleanAIResponse(response: string): string {
        // Remove markdown code blocks like ```json ... ```
        let cleaned = response
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .trim();

        // Extract JSON if still wrapped in text
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleaned = jsonMatch[0];
        }

        return cleaned;
    }

    async generateProposal(oitId: string) {
        const oit = await prisma.oIT.findUnique({ where: { id: oitId } });

        if (!oit) {
            throw new Error('OIT not found');
        }

        const resources = await prisma.resource.findMany({
            where: { status: 'AVAILABLE' }
        });

        const templates = await prisma.samplingTemplate.findMany();

        if (templates.length === 0) {
            // No templates available, create generic proposal
            const proposal = {
                templateId: null,
                templateName: 'Planeación Genérica',
                proposedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                proposedTime: '09:00',
                steps: [
                    { id: '1', title: 'Preparación de equipos', description: 'Verificar y preparar equipos necesarios' },
                    { id: '2', title: 'Recolección de muestras', description: 'Ejecutar protocolo de muestreo' },
                    { id: '3', title: 'Documentación', description: 'Registrar datos y fotografías' },
                    { id: '4', title: 'Entrega a laboratorio', description: 'Enviar muestras para análisis' }
                ],
                assignedResources: resources.slice(0, 3),
                estimatedDuration: '4 horas'
            };

            await prisma.oIT.update({
                where: { id: oitId },
                data: {
                    aiData: JSON.stringify({
                        valid: true,
                        data: proposal,
                        message: 'Propuesta genérica creada'
                    }),
                    planningProposal: JSON.stringify(proposal)
                }
            });

            return proposal;
        }

        // AI suggests best template
        const { aiService } = await import('./ai.service');

        const templatesList = templates.map(t =>
            `- ID: ${t.id}, Nombre: ${t.name}, Tipo: ${t.oitType}, Descripción: ${t.description}`
        ).join('\n');

        const prompt = `
Analiza esta OIT y selecciona la plantilla de muestreo más apropiada.

**OIT:**
- Número: ${oit.oitNumber}
- Descripción: ${oit.description || 'Sin descripción'}

**Plantillas Disponibles:**
${templatesList}

**Responde ÚNICAMENTE en formato JSON:**
{
  "templateId": "id de la plantilla seleccionada",
  "reason": "razón de la selección",
  "confidence": número entre 0 y 1
}
        `;

        let selectedTemplate;
        try {
            const aiResponse = await aiService.chat(prompt);
            console.log('AI Response for template selection:', aiResponse);

            const cleanedResponse = this.cleanAIResponse(aiResponse);
            const templateSuggestion = JSON.parse(cleanedResponse);

            selectedTemplate = await prisma.samplingTemplate.findUnique({
                where: { id: templateSuggestion.templateId }
            });
        } catch (error) {
            console.error('Failed to parse AI response:', error);
            console.error('Error details:', error instanceof Error ? error.message : String(error));
        }

        // Fallback to first template if AI fails
        if (!selectedTemplate) {
            selectedTemplate = templates[0];
        }

        const proposal = {
            templateId: selectedTemplate.id,
            templateName: selectedTemplate.name,
            proposedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            proposedTime: '09:00',
            steps: JSON.parse(selectedTemplate.steps),
            assignedResources: resources.slice(0, 3),
            estimatedDuration: '4 horas'
        };

        await prisma.oIT.update({
            where: { id: oitId },
            data: {
                selectedTemplateId: selectedTemplate.id,
                aiData: JSON.stringify({
                    valid: true,
                    data: proposal,
                    message: 'Propuesta de planificación generada'
                }),
                planningProposal: JSON.stringify(proposal)
            }
        });

        return proposal;
    }

    async acceptProposal(oitId: string) {
        await prisma.oIT.update({
            where: { id: oitId },
            data: {
                planningAccepted: true,
                status: 'SCHEDULED'
            }
        });
    }

    async rejectProposal(oitId: string) {
        await prisma.oIT.update({
            where: { id: oitId },
            data: {
                planningProposal: null,
                selectedTemplateId: null
            }
        });
    }
}

export default new PlanningService();
