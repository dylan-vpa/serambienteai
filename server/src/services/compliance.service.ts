import { PrismaClient } from '@prisma/client';
import { aiService } from './ai.service';
import { createNotification } from '../controllers/notification.controller';

const prisma = new PrismaClient();

export class ComplianceService {

    async checkCompliance(oitId: string, userId: string) {
        const oit = await prisma.oIT.findUnique({
            where: { id: oitId }
        });

        if (!oit) {
            throw new Error('OIT not found');
        }

        // Fetch ACTIVE Standards of type 'OIT' from database
        const standards = await prisma.standard.findMany({
            where: { type: 'OIT' }
        });

        if (standards.length === 0) {
            // No standards to check against
            await createNotification(
                userId,
                'Sin Normas Configuradas',
                'No hay normas de tipo OIT configuradas para verificar cumplimiento.',
                'INFO',
                oitId
            );

            return {
                compliant: true,
                score: 100,
                summary: 'No hay normas configuradas para verificar.',
                issues: [],
                recommendations: ['Configure normas en la sección de Normas para habilitar verificación automática.']
            };
        }

        // Build detailed prompt for AI with OIT data and Standards
        const standardsList = standards.map(s =>
            `- **${s.title}**: ${s.description}`
        ).join('\n');

        const prompt = `
Actúa como Auditor de Calidad y Cumplimiento experto.

**OIT a Verificar:**
- Número: ${oit.oitNumber}
- Descripción: ${oit.description || 'Sin descripción'}
- Estado: ${oit.status}

**Normas a Verificar:**
${standardsList}

**Tarea:**
Analiza si la OIT cumple con cada una de las normas especificadas. Verifica cada criterio detalladamente.

**Responde ÚNICAMENTE en formato JSON válido con esta estructura exacta:**
{
  "compliant": true/false,
  "score": número del 0 al 100,
  "summary": "resumen general del cumplimiento",
  "issues": ["lista de incumplimientos encontrados"],
  "recommendations": ["lista de recomendaciones para mejorar"]
}
        `;

        try {
            const aiResponse = await aiService.chat(prompt, 'llama3.2:3b'); // Use default model

            let result;
            try {
                // Try to parse JSON from AI response (it might contain markdown code blocks)
                const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
                result = JSON.parse(jsonStr);
            } catch (e) {
                console.error('Error parsing AI compliance response:', e);
                result = {
                    compliant: false,
                    score: 0,
                    summary: 'Error al analizar la respuesta de la IA.',
                    issues: ['Falló el análisis automático.'],
                    recommendations: []
                };
            }

            // 5. Create Notification
            await createNotification(
                userId,
                `Revisión de Normativa: ${oit.oitNumber}`,
                `Resultado: ${result.compliant ? 'CUMPLE' : 'NO CUMPLE'} (Score: ${result.score}/100)`,
                result.compliant ? 'SUCCESS' : 'WARNING',
                oitId
            );

            return result;

        } catch (error) {
            console.error('Compliance check error:', error);
            throw error;
        }
    }
}

export const complianceService = new ComplianceService();
