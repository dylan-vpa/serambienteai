import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Map OIT types to resource matrix types
const OIT_TO_RESOURCE_TYPE: Record<string, string[]> = {
    'AGUA': ['Aguas'],
    'AGUA_POTABLE': ['Aguas'],
    'AGUAS_MARINAS': ['Aguas'],
    'AGUAS_RESIDUALES': ['Aguas'],
    'VERTIMIENTOS': ['Aguas'],
    'PISCINA': ['Aguas'],
    'AIRE': ['Calidad del aire'],
    'FUENTES_FIJAS': ['Fuentes fijas'],
    'RUIDO': ['Ruido'],
    'BIOTA': ['Hidrobiología y Biota'],
    'SUELO': ['Aguas'], // Suelos uses some water equipment
    'SEDIMENTOS': ['Aguas'],
    'LODOS': ['Aguas'],
    'DEFAULT': ['General']
};

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

    /**
     * Detect OIT type from description and aiData
     */
    private detectOitType(oit: any): string {
        const aiData = oit.aiData ? JSON.parse(oit.aiData) : {};
        const description = (oit.description || '').toLowerCase();
        const templateName = (aiData.data?.templateName || '').toLowerCase();

        const combined = `${description} ${templateName}`;

        if (combined.includes('agua potable') || combined.includes('potable')) return 'AGUA_POTABLE';
        if (combined.includes('vertimiento')) return 'VERTIMIENTOS';
        if (combined.includes('marina') || combined.includes('mar')) return 'AGUAS_MARINAS';
        if (combined.includes('residual')) return 'AGUAS_RESIDUALES';
        if (combined.includes('piscina')) return 'PISCINA';
        if (combined.includes('ruido')) return 'RUIDO';
        if (combined.includes('aire') || combined.includes('atmosféric') || combined.includes('calidad del aire')) return 'AIRE';
        if (combined.includes('fuente fija') || combined.includes('chimenea') || combined.includes('emisión')) return 'FUENTES_FIJAS';
        if (combined.includes('biota') || combined.includes('hidrobiolog')) return 'BIOTA';
        if (combined.includes('suelo')) return 'SUELO';
        if (combined.includes('sedimento')) return 'SEDIMENTOS';
        if (combined.includes('lodo')) return 'LODOS';
        if (combined.includes('agua')) return 'AGUA';

        return 'DEFAULT';
    }

    /**
     * Get resources filtered by OIT type
     */
    private async getRelevantResources(oitType: string, limit: number = 5): Promise<any[]> {
        const resourceTypes = OIT_TO_RESOURCE_TYPE[oitType] || OIT_TO_RESOURCE_TYPE['DEFAULT'];

        // Get resources matching the type
        const relevantResources = await prisma.resource.findMany({
            where: {
                status: 'AVAILABLE',
                type: { in: resourceTypes }
            },
            take: limit,
            orderBy: { name: 'asc' }
        });

        // If no resources found for specific type, get general ones
        if (relevantResources.length === 0) {
            return prisma.resource.findMany({
                where: { status: 'AVAILABLE' },
                take: limit,
                orderBy: { name: 'asc' },
                distinct: ['name']
            });
        }

        return relevantResources;
    }

    async generateProposal(oitId: string, documentText?: string) {
        const oit = await prisma.oIT.findUnique({
            where: { id: oitId },
            include: { assignedEngineers: { include: { user: true } } }
        });

        if (!oit) {
            throw new Error('OIT not found');
        }

        // Detect OIT type
        const oitType = this.detectOitType(oit);

        // ... existing resource logic ...
        // (This part is long, omitting for brevity in replacement if possible, but replace_file_content requires context.
        // I will target the specific block where `oit` is fetched and then where `combinedSteps` is processed.)
        // Since I need to replace the fetch at top AND the logic at bottom, and they are far apart, I should use multi_replace.


        // Better Resource Selection Logic
        let resources: any[] = [];
        const { aiService } = await import('./ai.service');

        // 1. Try to get resources from FULL DOCUMENT text if available
        let candidateNames: string[] = [];
        let fullDocumentText = documentText || '';

        // If no documentText provided, try to extract from quotation PDF
        if (!fullDocumentText && oit.quotationFileUrl) {
            try {
                console.log('[Planning] Extracting quotation content for resource analysis...');
                const { pdfService } = await import('./pdf.service');
                const fs = await import('fs');
                let filePath = oit.quotationFileUrl;
                if (filePath.startsWith('/') && !fs.existsSync(filePath)) {
                    filePath = filePath.substring(1);
                }
                if (fs.existsSync(filePath)) {
                    fullDocumentText = await pdfService.extractText(filePath);
                    console.log(`[Planning] Extracted ${fullDocumentText.length} chars from quotation`);
                }
            } catch (extractError) {
                console.error('[Planning] Failed to extract quotation:', extractError);
            }
        }

        if (fullDocumentText && fullDocumentText.length > 100) {
            console.log('[Planning] Analyzing FULL DOCUMENT for resources...');
            try {
                candidateNames = await aiService.recommendResources(fullDocumentText);
                console.log('[AI] Resource recommendations:', candidateNames);
            } catch (err) {
                console.error('[Planning] AI Resource Extraction Failed:', err);
            }
        }

        // Deduplicate candidates immediately to avoid redundancy
        candidateNames = [...new Set(candidateNames)];

        // 2. Fallback to existing metadata (Quotation/OIT resources)
        if (candidateNames.length === 0) {
            try {
                if (oit.resources) {
                    const parsed = JSON.parse(oit.resources);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        console.log(`[Planning] Using resources from document analysis: ${parsed.length}`);
                        candidateNames = parsed;
                    }
                }
            } catch (e) { }
        }

        // 3. Last resort: ask AI using description
        if (candidateNames.length === 0 && oit.description) {
            console.log('[Planning] Asking AI for resource recommendations based on description...');
            candidateNames = await aiService.recommendResources(oit.description);
        }

        // 3. Match candidates to DB Resources
        if (candidateNames.length > 0) {
            console.log('[Planning] Matching candidates to DB:', candidateNames);

            // We want unique equipment. If AI asks for "H2S Analyzer", pick ONE.
            const uniqueTypes = new Set<string>();

            for (const name of candidateNames) {
                // Skip generic terms if better matches exist
                // Search available resources loosely matching the name
                const match = await prisma.resource.findFirst({
                    where: {
                        status: 'AVAILABLE',
                        OR: [
                            { name: { contains: name } }, // removed mode: 'insensitive' to avoid sqlite error if not supported or check prisma version. Default contains is case sensitive in some DBs, insensitive in others. SQLite is case insensitive naturally for ASCII? No, depends.
                            // Case insensitive mode requires Prisma feature? 
                            // Safest is to just try. If Postgres, mode: insensitive. If SQLite, it might not support mode.
                            // User environment is Linux, DB is SQLite (from schema).
                            // SQLite contains is case-insensitive usually.
                            { type: { contains: name } },
                            { observations: { contains: name } }
                        ]
                    }
                });

                if (match && !uniqueTypes.has(match.id)) {
                    resources.push(match);
                    uniqueTypes.add(match.id);
                }
            }
        }

        // 4. Fallback to generic relevant resources if nothing found
        if (resources.length === 0) {
            console.log('[Planning] No specific matches, using category fallback.');
            resources = await this.getRelevantResources(oitType, 3);
        }

        console.log(`[Planning] OIT tipo: ${oitType}, recursos finales: ${resources.length}`);

        const templates = await prisma.samplingTemplate.findMany();

        if (templates.length === 0) {
            // No templates available, create generic proposal
            const proposal = {
                templateIds: [],
                templateName: 'Planeación Genérica',
                proposedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                proposedTime: '09:00',
                steps: [
                    { id: '1', title: 'Preparación de equipos', description: 'Verificar y preparar equipos necesarios' },
                    { id: '2', title: 'Recolección de muestras', description: 'Ejecutar protocolo de muestreo' },
                    { id: '3', title: 'Documentación', description: 'Registrar datos y fotografías' },
                    { id: '4', title: 'Entrega a laboratorio', description: 'Enviar muestras para análisis' }
                ],
                assignedResources: resources.map(r => ({
                    id: r.id,
                    name: r.name,
                    code: r.code,
                    type: r.type,
                    brand: r.brand,
                    model: r.model
                })),
                estimatedDuration: '4 horas'
            };

            let currentAiData: any = { valid: true, data: {} };
            try {
                if (oit.aiData) {
                    const parsed = JSON.parse(oit.aiData);
                    if (parsed.data) currentAiData = parsed;
                    else currentAiData = { valid: true, data: parsed };
                }
            } catch (e) { }

            await prisma.oIT.update({
                where: { id: oitId },
                data: {
                    aiData: JSON.stringify({
                        ...currentAiData,
                        message: 'Propuesta genérica creada',
                        data: { ...currentAiData.data, ...proposal }
                    }),
                    planningProposal: JSON.stringify(proposal)
                }
            });

            return proposal;
        }

        // AI suggests best template

        const templatesList = templates.map((t: any) =>
            `- ID: ${t.id}, Nombre: ${t.name}, Tipo: ${t.oitType}, Descripción: ${t.description}`
        ).join('\n');

        const systemPrompt = `Eres un Planificador Senior de Operaciones Ambientales. 
Tu responsabilidad es asignar la metodología de muestreo correcta para cada OIT basándote en su descripción y los estándares técnicos.
Analiza si se requiere monitoreo de aguas, aire, suelos o una combinación.`;

        const prompt = `Analiza esta OIT y selecciona la plantilla de muestreo más apropiada.

**OIT:**
- Número: ${oit.oitNumber}
- Descripción: ${oit.description || 'Sin descripción'}

**Plantillas Disponibles:**
${templatesList}

**Responde ÚNICAMENTE en formato JSON:**
{
  "templateIds": ["id1", "id2"],
  "reason": "razón técnica de la selección",
  "confidence": número entre 0 y 1
}
Si se requieren múltiples tipos de muestreo, selecciona ambas.`;

        let selectedTemplates: any[] = [];
        try {
            const aiResponse = await aiService.chat(prompt, undefined, systemPrompt);
            console.log('AI Response for template selection:', aiResponse);

            const cleanedResponse = this.cleanAIResponse(aiResponse);
            const templateSuggestion = JSON.parse(cleanedResponse);

            // Normalize response (array vs single)
            const ids = templateSuggestion.templateIds || (templateSuggestion.templateId ? [templateSuggestion.templateId] : []);

            if (ids.length > 0) {
                selectedTemplates = await prisma.samplingTemplate.findMany({
                    where: { id: { in: ids } }
                });
                // Re-sort to match AI order if possible, or keep DB order. AI order might be better for sequence.
            }
        } catch (error) {
            console.error('Failed to parse AI response:', error);
            console.error('Error details:', error instanceof Error ? error.message : String(error));
        }

        // Fallback to first template if AI fails or returns nothing
        if (selectedTemplates.length === 0) {
            selectedTemplates = [templates[0]];
        }

        // Combine steps from all templates
        let combinedSteps: any[] = [];
        selectedTemplates.forEach(t => {
            try {
                const steps = JSON.parse(t.steps);
                combinedSteps = [...combinedSteps, ...steps];
            } catch (e) { }
        });

        // AUTO-FILL HEADER STEPS
        // Populate administrative data automatically from OIT context
        combinedSteps = combinedSteps.map(step => {
            const title = step.title;

            if (title === 'Número OT') {
                return { ...step, value: oit.oitNumber };
            }
            if (title === 'Cliente') {
                try {
                    const aiData = JSON.parse(oit.aiData || '{}');
                    const clientName = aiData.data?.clientName || aiData.clientName || '';
                    if (clientName) return { ...step, value: clientName };
                } catch (e) { }
            }
            if (title === 'Responsable en Campo') {
                if (oit.assignedEngineers && oit.assignedEngineers.length > 0) {
                    return { ...step, value: oit.assignedEngineers.map((ae: any) => ae.user.name).join(', ') };
                }
            }
            if (title === 'Fecha de Inicio' && oit.scheduledDate) {
                return { ...step, value: new Date(oit.scheduledDate).toISOString().slice(0, 16) };
            }
            if (title === 'Fecha de Fin' && oit.scheduledDate) {
                // Default duration 4 hours
                const end = new Date(new Date(oit.scheduledDate).getTime() + 4 * 60 * 60 * 1000);
                return { ...step, value: end.toISOString().slice(0, 16) };
            }
            if (title === 'Coordenadas de la Estación' && oit.location) {
                return { ...step, value: oit.location };
            }
            return step;
        });

        const proposal = {
            templateIds: selectedTemplates.map(t => t.id),
            templateName: selectedTemplates.map(t => t.name).join(' + '),
            proposedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            proposedTime: '09:00',
            steps: combinedSteps,
            assignedResources: resources.map(r => ({
                id: r.id,
                name: r.name,
                code: r.code,
                type: r.type,
                brand: r.brand,
                model: r.model
            })),
            estimatedDuration: '4 horas'
        };

        let currentAiData: any = { valid: true, data: {} };
        try {
            if (oit.aiData) {
                const parsed = JSON.parse(oit.aiData);
                if (parsed.data) currentAiData = parsed;
                else currentAiData = { valid: true, data: parsed };
            }
        } catch (e) { }

        await prisma.oIT.update({
            where: { id: oitId },
            data: {
                selectedTemplateIds: JSON.stringify(selectedTemplates.map(t => t.id)),
                aiData: JSON.stringify({
                    ...currentAiData,
                    message: 'Propuesta de planificación generada',
                    data: { ...currentAiData.data, ...proposal }
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
                selectedTemplateIds: null
            }
        });
    }
}

export default new PlanningService();
