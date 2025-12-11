import { aiService } from './ai.service';

interface ValidationResult {
    validated: boolean;
    feedback: string;
    confidence: number;
}

class ValidationService {
    /**
     * Validate sampling step data against step requirements using AI
     */
    async validateStepData(
        stepDescription: string,
        stepRequirements: string,
        userData: any
    ): Promise<ValidationResult> {
        try {
            const validationPrompt = `Eres un validador experto de datos de muestreo ambiental.

DESCRIPCIÓN DEL PASO:
${stepDescription}

REQUISITOS:
${stepRequirements}

DATOS PROPORCIONADOS POR EL USUARIO (JSON):
${JSON.stringify(userData, null, 2)}

TAREA:
Evalúa si los datos proporcionados cumplen con los requisitos del paso de muestreo.
ATENCIÓN: El valor principal ingresado por el usuario se encuentra en el campo "value" del JSON de datos.

Verifica:
1. Completitud: ¿El campo "value" tiene contenido válido según lo solicitado?
2. Formato: ¿Los datos tienen el formato correcto?
3. Coherencia: ¿Los datos son lógicos y consistentes?

RESPONDE EN JSON CON ESTE FORMATO:
{
  "validated": true/false,
  "feedback": "Explicación detallada de por qué se aprueba o rechaza",
  "confidence": 0.0-1.0
}`;

            const response = await aiService.chat(validationPrompt);

            // Parse AI response
            const cleanedResponse = this.cleanAIResponse(response);
            const result = JSON.parse(cleanedResponse);

            return {
                validated: result.validated === true,
                feedback: result.feedback || 'Validación completada',
                confidence: result.confidence || 0.8
            };

        } catch (error) {
            console.error('Validation error:', error);
            return {
                validated: false,
                feedback: 'Error al validar los datos. Por favor intenta de nuevo.',
                confidence: 0
            };
        }
    }

    /**
     * Generate final comprehensive analysis from all sampling data
     */
    async generateFinalAnalysis(
        oitNumber: string,
        templateName: string,
        allStepsData: Array<{ step: string; data: any; validation: any }>
    ): Promise<string> {
        try {
            const analysisPrompt = `Eres un analista experto en muestreo ambiental.

OIT: ${oitNumber}
PLANTILLA: ${templateName}

DATOS RECOPILADOS EN TODOS LOS PASOS:
${JSON.stringify(allStepsData, null, 2)}

TAREA:
Genera un análisis comprehensivo del muestreo realizado. Incluye:

1. RESUMEN EJECUTIVO
   - Objetivo del muestreo
   - Metodología aplicada
   - Principales hallazgos

2. ANÁLISIS POR PASO
   - Evaluación de cada paso completado
   - Calidad de los datos recopilados
   - Observaciones relevantes

3. CUMPLIMIENTO NORMATIVO
   - Verificación de cumplimiento con estándares
   - Requisitos satisfechos
   - Áreas de atención

4. CONCLUSIONES Y RECOMENDACIONES
   - Conclusiones principales
   - Recomendaciones para próximos pasos
   - Acciones sugeridas

IMPORTANTE: Responde en español, de forma profesional y técnica.`;

            const response = await aiService.chat(analysisPrompt);

            return response;

        } catch (error) {
            console.error('Analysis generation error:', error);
            throw new Error('Error al generar el análisis final');
        }
    }
    async generateFinalReportContent(oit: any, labResultsText: string): Promise<string> {
        try {
            const prompt = `
            ACTÚA COMO: Consultor Ambiental Senior.
            TAREA: Redactar el INFORME TÉCNICO FINAL para el cliente.
            
            CONTEXTO:
            - Orden de Servicio: ${oit.oitNumber}
            - Descripción: ${oit.description}
            - Hallazgos de Campo: ${oit.finalAnalysis || 'Sin observaciones mayores'}
            
            DATOS DE LABORATORIO (Extraídos del anexo):
            "${labResultsText.slice(0, 8000)}"
            
            ESTRUCTURA DEL INFORME (Markdown):
            # INFORME DE MONITOREO AMBIENTAL
            
            ## 1. RESUMEN EJECUTIVO
            Breve síntesis de todo el trabajo y conclusión principal.
            
            ## 2. RESULTADOS DE CAMPO
            Resumen de lo observado durante la toma de muestras.
            
            ## 3. ANÁLISIS DE LABORATORIO
            Interpretación de los resultados obtenidos (No copies tablas enteras, interpreta los valores).
            
            ## 4. CONCLUSIONES
            Veredicto final sobre el cumplimiento normativo.
            
            IMPORTANTE:
            - Usa un tono formal y objetivo.
            - Si los resultados de laboratorio mencionan límites normativos, compáralos.
            - Formato limpio usando Markdown.
            `;

            const response = await aiService.chat(prompt);
            return response;
        } catch (error) {
            console.error('Final Report generation error:', error);
            throw new Error('Error al generar el contenido del informe final');
        }
    }

    private cleanAIResponse(response: string): string {
        let cleaned = response.trim();

        // Remove markdown code blocks
        cleaned = cleaned.replace(/```json\s*/gi, '');
        cleaned = cleaned.replace(/```\s*/g, '');

        // Try to extract JSON object if embedded in text
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleaned = jsonMatch[0];
        }

        return cleaned;
    }
}

export const validationService = new ValidationService();
