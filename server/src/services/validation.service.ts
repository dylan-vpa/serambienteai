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

DATOS PROPORCIONADOS POR EL USUARIO:
${JSON.stringify(userData, null, 2)}

TAREA:
Evalúa si los datos proporcionados cumplen con los requisitos del paso de muestreo.
Verifica:
1. Completitud: ¿Están todos los datos necesarios?
2. Formato: ¿Los datos tienen el formato correcto?
3. Coherencia: ¿Los datos son lógicos y consistentes?
4. Calidad: ¿Los datos son suficientemente detallados?

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
