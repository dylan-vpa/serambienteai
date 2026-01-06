import { PrismaClient } from '@prisma/client';
import { aiService } from './ai.service';
import { pdfService } from './pdf.service';
import fs from 'fs';

const prisma = new PrismaClient();

class VerificationService {
    async verifyConsistency(oitId: string) {
        const oit = await prisma.oIT.findUnique({
            where: { id: oitId },
            include: { assignedEngineers: { include: { user: true } } }
        });

        if (!oit) throw new Error('OIT not found');

        // 1. Gather Data Sources
        const sources: any = {
            oitNumber: oit.oitNumber,
            description: oit.description,
            location: oit.location,
            clientName: '',
            dates: {
                scheduled: oit.scheduledDate,
                serviceDates: oit.serviceDates ? JSON.parse(oit.serviceDates) : null
            }
        };

        // Extract Client Name from AI Data
        try {
            if (oit.aiData) {
                const ai = JSON.parse(oit.aiData);
                sources.clientName = ai.data?.clientName || ai.clientName;
                sources.aiResources = ai.data?.assignedResources;
            }
        } catch (e) { }

        // Sampling Data (What was actually done in app)
        let samplingSummary = '';
        try {
            if (oit.stepValidations) {
                const steps = JSON.parse(oit.stepValidations);
                const stepValues = Object.values(steps).map((s: any) => s.data?.value || s.data?.result).filter(Boolean);
                samplingSummary = stepValues.join(', ');
            }
        } catch (e) { }

        // Lab Results Text
        let labText = '';
        if (oit.labResultsUrl) {
            try {
                // If local file
                let path = oit.labResultsUrl;
                if (path.startsWith('http')) {
                    // Skip for now if remote URL without download logic here
                    // Assuming local path for prototype or mapped volume
                    if (path.includes('/uploads/')) {
                        path = 'uploads/' + path.split('/uploads/')[1];
                    }
                }
                if (fs.existsSync(path)) {
                    labText = await pdfService.extractText(path);
                }
            } catch (e) { console.error('Error reading lab summary', e); }
        }

        // Field Form Text
        let fieldFormText = '';
        if (oit.fieldFormUrl) {
            try {
                let path = oit.fieldFormUrl;
                if (path.includes('/uploads/')) {
                    path = 'uploads/' + path.split('/uploads/')[1];
                }
                if (fs.existsSync(path)) {
                    fieldFormText = await pdfService.extractText(path);
                }
            } catch (e) { console.error('Error reading field form', e); }
        }

        // 2. AI Prompt
        const prompt = `Actúa como Auditor de Calidad. Verifica la consistencia entre estos documentos de una orden de trabajo (OIT).

DATOS OIT:
- Número: ${sources.oitNumber}
- Cliente: ${sources.clientName}
- Ubicación: ${sources.location}
- Fechas Programadas: ${JSON.stringify(sources.dates)}
- Descripción: ${sources.description}

DATOS MUESTREO (App):
${samplingSummary}

TEXTO PLANILLA CAMPO (OCR/Extracción):
${fieldFormText.substring(0, 5000)}

TEXTO REPORTE LABORATORIO:
${labText.substring(0, 5000)}

TAREA:
Compara los datos. Busca discrepancias CRÍTICAS en:
1. Fechas (¿Coinciden la planilla y el reporte con lo programado?)
2. Ubicación / Cliente (¿Es el mismo sitio?)
3. Parámetros (¿Se midió lo que se pidió?)
4. Códigos de Muestra (¿Coinciden planilla y reporte?)

Responde en JSON:
{
  "valid": boolean, // true si no hay discrepancias BLOQUEANTES
  "score": number, // 0-100 consistencia
  "discrepancies": ["lista de errores encontrados"],
  "matches": ["lista de cosas correctas validadas"],
  "summary": "Resumen corto para el ingeniero"
}`;

        try {
            const aiResponse = await aiService.chat(prompt);
            const cleanResponse = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(cleanResponse);

            await prisma.oIT.update({
                where: { id: oitId },
                data: { fieldFormAnalysis: JSON.stringify(result) }
            });

            return result;
        } catch (error) {
            console.error('AI Verification failed', error);
            throw new Error('Falló la verificación por IA');
        }
    }
}

export default new VerificationService();
