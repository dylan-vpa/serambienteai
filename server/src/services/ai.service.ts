import axios from 'axios';
import fs from 'fs';
import path from 'path';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'gpt-oss';

interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
}

interface AIAnalysisResult {
    status: 'check' | 'alerta' | 'error';
    alerts: string[];
    missing: string[];
    evidence: string[];
    services?: Array<{
        name: string;
        proposedDate: string | null;
        duration: number;
    }>;
    location?: string | null;
    generalProposedDate?: string | null;
    rawResponse?: string;
}

export class AIService {
    private baseURL: string;
    private defaultModel: string;

    constructor() {
        this.baseURL = OLLAMA_URL;
        this.defaultModel = DEFAULT_MODEL;
    }

    /**
     * Check if Ollama is available
     */
    async isAvailable(): Promise<boolean> {
        try {
            await axios.get(`${this.baseURL}/api/tags`, { timeout: 2000 });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get list of available models
     */
    async getModels(): Promise<string[]> {
        try {
            const response = await axios.get(`${this.baseURL}/api/tags`);
            return response.data.models?.map((m: any) => m.name) || [];
        } catch (error) {
            console.error('Failed to fetch models:', error);
            return [];
        }
    }

    /**
     * Chat with AI
     */
    async chat(message: string, model?: string, system?: string): Promise<string> {
        const useModel = model || this.defaultModel;

        try {
            console.log(`[AI] Sending Chat Request. Model: ${useModel}`);
            if (system) console.log(`[AI] System Prompt: ${system.substring(0, 100)}...`);
            console.log(`[AI] User Prompt: ${message.substring(0, 200)}...`);

            const response = await axios.post(`${this.baseURL}/api/generate`, {
                model: useModel,
                prompt: message,
                system: system, // Pass system prompt
                stream: false,
            });

            const reply = response.data.response || 'No response from AI';
            console.log(`[AI] Response: ${reply.substring(0, 200)}...`);
            return reply;
        } catch (error: any) {
            console.error('AI Chat error:', error.message);
            if (error.response) {
                console.error('AI Error Data:', error.response.data);
            }
            throw new Error('AI service unavailable. Please ensure Ollama is running.');
        }
    }

    /**
     * Analyze OIT document
     */
    async analyzeDocument(documentText: string): Promise<AIAnalysisResult> {
        const available = await this.isAvailable();

        if (!available) {
            // Fallback to heuristic analysis
            return this.heuristicAnalysis(documentText);
        }

        try {
            const prompt = `Analiza el siguiente documento OIT (Orden de Inspección y/o Trabajo) y responde SOLO con un JSON válido (sin markdown, sin explicaciones adicionales):

{
  "status": "check|alerta|error",
  "alerts": ["lista de alertas encontradas"],
  "missing": ["lista de items faltantes"],
  "evidence": ["lista de evidencias encontradas"],
  "services": [
    {
      "name": "nombre del servicio (ej: Calidad de Aire, Ruido Ambiental, Calidad de Agua)",
      "proposedDate": "fecha sugerida formato YYYY-MM-DD o null",
      "duration": "duración estimada en días (número)"
    }
  ],
  "location": "ubicación/dirección del proyecto extraída del documento",
  "generalProposedDate": "fecha general del proyecto si no hay servicios específicos (YYYY-MM-DD)"
}

INSTRUCCIONES DETALLADAS:
1. **status**: Evalúa completitud del documento
   - "check": Documento completo y correcto
   - "alerta": Falta información menor
   - "error": Faltan datos críticos

2. **services**: Extrae TODOS los servicios mencionados (ej: monitoreos, análisis, inspecciones)
   - Si el documento tiene cronograma con fechas específicas por servicio, úsalas
   - Si no, propón fechas consecutivas razonables
   - duration: estima días necesarios (generalmente 1-3 días por servicio)

3. **location**: Extrae dirección completa, coordenadas, o nombre del sitio

4. **generalProposedDate**: Solo si NO hay servicios específicos, extrae o propón fecha general

Documento:
${documentText}

JSON:`;

            const response = await axios.post(`${this.baseURL}/api/generate`, {
                model: this.defaultModel,
                prompt: prompt,
                stream: false,
                format: 'json',
            });

            const rawResponse = response.data.response;
            let responseText = rawResponse;

            // Simple sanitization
            responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonStart = responseText.indexOf('{');
            const jsonEnd = responseText.lastIndexOf('}');

            if (jsonStart !== -1 && jsonEnd !== -1) {
                responseText = responseText.substring(jsonStart, jsonEnd + 1);
            }

            try {
                const parsed = JSON.parse(responseText);
                return {
                    status: parsed.status || 'alerta',
                    alerts: parsed.alerts || [],
                    missing: parsed.missing || [],
                    evidence: parsed.evidence || [],
                    services: parsed.services || [],
                    location: parsed.location || null,
                    generalProposedDate: parsed.generalProposedDate || null,
                    rawResponse,
                };
            } catch (parseError) {
                console.error('Failed to parse AI response:', rawResponse);
                return this.heuristicAnalysis(documentText);
            }
        } catch (error) {
            console.error('AI Analysis error:', error);
            return this.heuristicAnalysis(documentText);
        }
    }

    /**
     * Recommend resources based on OIT content
     */
    async recommendResources(documentText: string): Promise<string[]> {
        const available = await this.isAvailable();

        if (!available) {
            return this.heuristicResourceRecommendation(documentText);
        }

        try {
            // Fetch actual resources from database
            const PrismaClient = require('@prisma/client').PrismaClient;
            const prisma = new PrismaClient();
            const dbResources = await prisma.resource.findMany({
                where: { status: 'AVAILABLE' },
                select: { name: true, type: true }
            });
            await prisma.$disconnect();

            // Group resources by type for the prompt
            const resourcesByType: Record<string, string[]> = {};
            for (const r of dbResources) {
                const type = r.type || 'General';
                if (!resourcesByType[type]) resourcesByType[type] = [];
                resourcesByType[type].push(r.name);
            }

            // Build inventory list
            const inventoryList = Object.entries(resourcesByType)
                .map(([type, names]) => `- ${type}: ${names.slice(0, 10).join(', ')}`)
                .join('\n');

            const systemPrompt = `Eres un Gerente de Operaciones experto en monitoreo ambiental en Colombia.
Tu objetivo es PLANIFICAR COMPLETAMENTE los equipos necesarios para una jornada de muestreo en campo.

INSTRUCCIONES CRÍTICAS (Estricto cumplimiento):
1. Usa **ÚNICAMENTE** los nombres EXACTOS del inventario proporcionado abajo.
2. ❌ NO inventes nombres compuestos (Ej: si el inventario dice "Multiparámetro", NO escribas "Multiparámetro de campo").
3. ❌ NO agregues marcas ni modelos (Ej: si el inventario dice "GPS", NO escribas "GPS Garmin").
4. Si un equipo necesario no está en la lista exacta, busca el más cercano o GENÉRICO disponible (ej: "Analizador SO2" en vez de "Monitor de gases").

INVENTARIO DISPONIBLE (Copia estos nombres EXACTAMENTE):
${inventoryList}

Planifica una operación robusta (5-15 equipos).`;

            const prompt = `Analiza esta cotización/OIT y lista los equipos necesarios usando SOLO el vocabulario del inventario.

REGLAS:
- Identifica el tipo de monitoreo (Agua, Aire, Ruido, etc.)
- Selecciona TODOS los equipos necesarios de la lista.
- Copia los nombres EXACTAMENTE como aparecen en el inventario.
- Incluye siempre equipos base como GPS, Cámara Fotográfica si están en lista.

Documento:
${documentText.substring(0, 8000)}

Responde con un JSON array de strings.
Ejemplo CORRECTO: ["Multiparámetro", "GPS", "Botella Muestreo"]
Ejemplo INCORRECTO: ["Multiparámetro de ph", "GPS Garmin 64s"]`;

            const response = await axios.post(`${this.baseURL}/api/generate`, {
                model: this.defaultModel,
                prompt: prompt,
                system: systemPrompt,
                stream: false,
                format: 'json',
            });

            let responseText = response.data.response;
            console.log('[AI] Raw resource response:', responseText.substring(0, 200));
            responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

            // Try to extract JSON array or object
            const jsonArrayStart = responseText.indexOf('[');
            const jsonArrayEnd = responseText.lastIndexOf(']');
            const jsonObjStart = responseText.indexOf('{');
            const jsonObjEnd = responseText.lastIndexOf('}');

            let parsed: any;

            // First try to parse as array
            if (jsonArrayStart !== -1 && jsonArrayEnd !== -1) {
                const arrayStr = responseText.substring(jsonArrayStart, jsonArrayEnd + 1);
                try {
                    parsed = JSON.parse(arrayStr);
                } catch (e) { }
            }

            // If not an array, try to parse as object and extract VALUES (equipment arrays)
            if (!parsed && jsonObjStart !== -1 && jsonObjEnd !== -1) {
                const objStr = responseText.substring(jsonObjStart, jsonObjEnd + 1);
                try {
                    const obj = JSON.parse(objStr);
                    // FIX: Extract VALUES (equipment arrays) not KEYS (category names)
                    // AI returns: {"Monitoreo Agua": ["equipo1", "equipo2"], "Monitoreo Aire": ["equipo3"]}
                    // We want: ["equipo1", "equipo2", "equipo3"]
                    const allEquipment: string[] = [];
                    for (const [category, items] of Object.entries(obj)) {
                        if (Array.isArray(items)) {
                            allEquipment.push(...items.map(String));
                            console.log(`[AI] Extracted ${items.length} items from category "${category}"`);
                        } else if (typeof items === 'string') {
                            allEquipment.push(items);
                        }
                    }
                    parsed = allEquipment;
                    console.log('[AI] Total equipment extracted from object:', parsed.length);
                } catch (e) { }
            }

            if (parsed && Array.isArray(parsed) && parsed.length > 0) {
                // Post-processing: Validate against DB resources to ensure exact matches
                const validResources: string[] = [];
                const dbResourceNames = dbResources.map((r: any) => r.name); // dbResources is available in scope

                console.log('[AI] Validating AI response against DB inventory...');

                for (const aiName of parsed) {
                    // 1. Check exact match
                    if (dbResourceNames.includes(aiName)) {
                        validResources.push(aiName);
                        continue;
                    }

                    // 2. Find best partial match in DB inventory
                    // (e.g. AI: "Multiparámetro de campo", DB: "Multiparámetro" -> Match)
                    const bestMatch = dbResourceNames.find((dbName: string) =>
                        aiName.toLowerCase().includes(dbName.toLowerCase()) ||
                        dbName.toLowerCase().includes(aiName.toLowerCase())
                    );

                    if (bestMatch) {
                        console.log(`[AI] Corrected "${aiName}" -> "${bestMatch}"`);
                        validResources.push(bestMatch);
                    } else {
                        console.log(`[AI] Dropped invalid resource "${aiName}"`);
                    }
                }

                console.log('[AI] Final valid resource recommendations:', validResources);
                return validResources.length > 0 ? validResources : this.heuristicResourceRecommendation(documentText);
            }

            console.log('[AI] Failed to parse resources, falling back to heuristic');
            return this.heuristicResourceRecommendation(documentText);
        } catch (error) {
            console.error('[AI] Error in recommendResources:', error);
            return this.heuristicResourceRecommendation(documentText);
        }
    }

    /**
     * Heuristic analysis fallback
     */
    private heuristicAnalysis(text: string): AIAnalysisResult {
        const lowerText = text.toLowerCase();
        const alerts: string[] = [];
        const missing: string[] = [];
        const evidence: string[] = [];

        // Check for urgency keywords
        if (lowerText.includes('urgente') || lowerText.includes('crítico')) {
            alerts.push('Documento marcado como urgente');
        }

        // Check for common missing items
        if (!lowerText.includes('fecha')) {
            missing.push('Fecha no especificada');
        }
        if (!lowerText.includes('responsable')) {
            missing.push('Responsable no especificado');
        }
        if (!lowerText.includes('ubicación') && !lowerText.includes('ubicacion')) {
            missing.push('Ubicación no especificada');
        }

        // Check for evidence
        if (lowerText.includes('foto') || lowerText.includes('imagen')) {
            evidence.push('Evidencia fotográfica mencionada');
        }

        const status = missing.length > 2 ? 'error' : missing.length > 0 ? 'alerta' : 'check';

        return { status, alerts, missing, evidence };
    }

    /**
     * Heuristic resource recommendation
     */
    private heuristicResourceRecommendation(text: string): string[] {
        const lowerText = text.toLowerCase();
        const resources: string[] = [];

        if (lowerText.includes('vehículo') || lowerText.includes('vehiculo') || lowerText.includes('transporte')) {
            resources.push('Vehículo de transporte');
        }
        if (lowerText.includes('herramienta') || lowerText.includes('equipo')) {
            resources.push('Herramientas especializadas');
        }
        if (lowerText.includes('personal') || lowerText.includes('técnico')) {
            resources.push('Personal técnico');
        }
        if (lowerText.includes('seguridad') || lowerText.includes('protección')) {
            resources.push('Equipo de protección personal');
        }

        return resources.length > 0 ? resources : ['Recursos estándar'];
    }
    /**
     * Extract OIT Data (Number, Description, Status) and Validate
     */
    async extractOITData(documentText: string): Promise<any> {
        const available = await this.isAvailable();
        if (!available) {
            return this.extractOITDataHeuristic(documentText);
        }

        try {
            const prompt = `Analiza el texto de los documentos de OIT y Cotización. Extrae la siguiente información y valídalos.
            Responde SOLO con un JSON válido con este formato:
            {
                "valid": boolean,
                "data": {
                    "oitNumber": "string (número de OIT encontrado)",
                    "description": "string (resumen breve del trabajo)",
                    "status": "string (PENDING, IN_PROGRESS, o COMPLETED - sugerido)"
                },
                "message": "string (resumen de validación)",
                "errors": ["string (lista de errores si valid=false)"],
                "warnings": ["string (lista de advertencias)"]
            }

            Texto del documento:
            ${documentText.substring(0, 3000)}... (truncado)

            JSON:`;

            const response = await axios.post(`${this.baseURL}/api/generate`, {
                model: this.defaultModel,
                prompt: prompt,
                stream: false,
                format: 'json',
            });

            const rawResponse = response.data.response;
            let responseText = rawResponse;
            responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonStart = responseText.indexOf('{');
            const jsonEnd = responseText.lastIndexOf('}');

            if (jsonStart !== -1 && jsonEnd !== -1) {
                responseText = responseText.substring(jsonStart, jsonEnd + 1);
            }

            try {
                const parsed = JSON.parse(responseText);
                const valid = !!parsed.valid;
                const data = parsed.data || {};
                const errors = Array.isArray(parsed.errors) ? parsed.errors : [];
                const warnings = Array.isArray(parsed.warnings) ? parsed.warnings : [];
                const message = parsed.message || (valid ? 'Validación exitosa' : 'Validación fallida');

                if (!valid && errors.length === 0) {
                    errors.push('Faltan detalles de error. Verifica número de OIT y descripción.');
                }

                return { valid, data, message, errors, warnings };
            } catch (e) {
                return this.extractOITDataHeuristic(documentText);
            }
        } catch (error) {
            return this.extractOITDataHeuristic(documentText);
        }
    }

    private extractOITDataHeuristic(documentText: string): any {
        const text = documentText || '';
        const lower = text.toLowerCase();

        let oitNumber = '';
        const m1 = text.match(/\bOIT\s*(?:N°|No|#|:)?\s*([A-Za-z0-9-]+)/i);
        const m2 = text.match(/\b(?:codigo|code)\s*[:#]?\s*([A-Za-z0-9-]+)/i);
        if (m1 && m1[1]) oitNumber = m1[1];
        else if (m2 && m2[1]) oitNumber = m2[1];

        let description = '';
        const descLabel = text.match(/(?:descripcion|descripción)\s*[:\-]?\s*(.{20,200})/i);
        if (descLabel && descLabel[1]) description = descLabel[1].trim();
        if (!description) description = text.replace(/\s+/g, ' ').slice(0, 240);

        let status = 'PENDING';
        if (lower.includes('completado') || lower.includes('terminado')) status = 'COMPLETED';
        else if (lower.includes('en curso') || lower.includes('progreso')) status = 'IN_PROGRESS';

        const valid = !!oitNumber;
        const errors = valid ? [] : ['No se encontró número de OIT'];
        const warnings = [];
        if (!description || description.length < 10) warnings.push('Descripción incompleta');

        return {
            valid,
            data: { oitNumber, description, status },
            message: valid ? 'Extracción completada con heurística' : 'No se pudo validar documento',
            errors,
            warnings
        };
    }
    /**
     * Background OIT processing - Full Analysis
     */
    async processOITInBackground(oitId: string, oitFilePath: string | null, quotationFilePath: string | null, userId: string): Promise<void> {
        console.log(`🚀 [AI SERVICE] Iniciando procesamiento OIT ${oitId}`);
        try {
            const extractText = async (filePath: string): Promise<string> => {
                const pdfService = (await import('../services/pdf.service')).pdfService;
                return await pdfService.extractText(filePath);
            };

            const { complianceService } = await import('../services/compliance.service');
            const { default: planningService } = await import('../services/planning.service');
            const PrismaClient = require('@prisma/client').PrismaClient;
            const prisma = new PrismaClient();

            // Set state to ANALYZING
            await prisma.oIT.update({
                where: { id: oitId },
                data: { status: 'ANALYZING' }
            });

            const aiDataContent: any = {};
            let extractedDescription: string | null = null;
            let extractedLocation: string | null = null;
            let finalDocumentText = '';

            // Analyze OIT File
            if (oitFilePath && fs.existsSync(oitFilePath)) {
                const oitText = await extractText(oitFilePath);
                finalDocumentText = oitText;
                const extracted = await this.extractOITData(oitText);
                if (extracted.valid && extracted.data.description) {
                    extractedDescription = extracted.data.description;
                }
            }

            // Run Compliance Check
            try {
                const complianceResult = await complianceService.checkCompliance(oitId, userId);
                if (complianceResult) {
                    aiDataContent.compliance = complianceResult;
                }
            } catch (complianceError) {
                console.error('Compliance check error:', complianceError);
            }

            // Generate Planning
            try {
                const proposal = await planningService.generateProposal(oitId, finalDocumentText);
                if (proposal) {
                    aiDataContent.data = proposal;
                }
            } catch (planningError) {
                console.error('Planning error:', planningError);
            }

            // Update final data
            const updateData: any = {
                aiData: JSON.stringify(aiDataContent),
                status: 'PENDING',
            };

            if (extractedDescription) {
                updateData.description = extractedDescription;
            }
            if (extractedLocation) {
                updateData.location = extractedLocation;
            }

            await prisma.oIT.update({
                where: { id: oitId },
                data: updateData
            });

            // Create notification
            if (aiDataContent.data?.proposedDate) {
                await prisma.notification.create({
                    data: {
                        userId,
                        oitId,
                        title: 'Análisis IA Completado',
                        message: `La IA ha propuesto una fecha para la OIT: ${new Date(aiDataContent.data.proposedDate).toLocaleDateString()}`,
                        type: 'INFO'
                    }
                });
            }

            console.log(`✅ [AI SERVICE] Procesamiento finalizado para OIT ${oitId}`);

        } catch (error: any) {
            console.error(`❌ [AI SERVICE] Error en procesamiento background OIT ${oitId}:`, error);
            const PrismaClient = require('@prisma/client').PrismaClient;
            const prisma = new PrismaClient();
            await prisma.oIT.update({
                where: { id: oitId },
                data: {
                    status: 'ERROR',
                    aiData: JSON.stringify({ error: error.message })
                }
            });
        }
    }
    // New method for Lab Results Analysis - Returns NARRATIVE TEXT
    async analyzeLabResults(documentText: string, oitContext?: string): Promise<string> {
        const available = await this.isAvailable();
        if (!available) {
            return "Análisis no disponible. El servicio de IA está desconectado.";
        }

        try {
            const prompt = `Eres un auditor técnico de calidad especialista en laboratorios ambientales. Analiza el siguiente reporte de laboratorio y compáralo con los objetivos de la OIT.

Contexto de la OIT (Servicio):
"${oitContext || 'Sin contexto específico'}"

Contenido Extraído del Reporte de Laboratorio:
"${documentText.substring(0, 5000).replace(/"/g, "'")}"

Tu tarea es generar un informe de supervisión detallado utilizando estrictamente formato MARKDOWN. 

Estructura requerida del informe:
1. **Resumen Ejecutivo**: Una síntesis profesional de lo hallado.
2. **Tabla de Resultados Clave**: Una tabla comparando los parámetros analizados vs los límites normativos (si el texto los menciona) o vs valores de referencia típicos. Debe tener columnas: Parámetro, Valor Hallado, Límite/Referencia, Estado (Cumple/No Cumple).
3. **Hallazgos Críticos**: Si hay excedencias o valores preocupantes, lístalos con negritas.
4. **Opinión Técnica**: Análisis sobre si el muestreo y los resultados son coherentes con lo solicitado en la OIT.
5. **Recomendaciones**: Pasos a seguir basándose en estos resultados.

Usa tablas de Markdown, negritas e iconos empaquetados si es necesario para que sea muy legible y "Premium". No incluyas meta-comentarios como "Aquí tienes el análisis". Ve directo al grano.`;

            console.log('[LAB ANALYSIS] Calling AI for narrative analysis, prompt length:', prompt.length);

            const response = await axios.post(`${this.baseURL}/api/generate`, {
                model: this.defaultModel,
                prompt,
                stream: false,
            });

            // For reasoning models, use thinking field which contains the actual analysis
            let analysis = response.data.response || response.data.thinking || '';

            if (!analysis || analysis.trim().length === 0) {
                console.warn('[LAB ANALYSIS] Empty response from AI');
                return "Error: No se pudo generar el análisis. Respuesta vacía del modelo.";
            }

            console.log('[LAB ANALYSIS] Generated analysis, length:', analysis.length);
            console.log('[LAB ANALYSIS] First 300 chars:', analysis.substring(0, 300));

            return analysis.trim();

        } catch (error) {
            console.error('AI Lab Analysis error:', error);
            return "Error al analizar los resultados de laboratorio. Por favor, revise manualmente el documento.";
        }
    }
    async analyzeSamplingResults(samplingData: any, oitContext?: string): Promise<string> {
        const available = await this.isAvailable();
        if (!available) {
            return "Análisis no disponible (Offline).";
        }

        try {
            const dataStr = JSON.stringify(samplingData, null, 2).substring(0, 3000);
            const prompt = `Eres un supervisor técnico de campo. Analiza los siguientes datos de un muestreo ambiental ejecutado.

Contexto OIT: "${oitContext || 'N/A'}"
Datos del Muestreo:
${dataStr}

Genera un informe corto de supervisión (en texto plano/markdown) que incluya:
1. Resumen de lo ejecutado (cantidad de muestras, condiciones).
2. Verificación de completitud (¿Faltan datos obvios?).
3. Anomalías detectadas en los valores o comentarios.
4. Conclusión: ¿El muestreo parece válido?

Responde en español de forma profesional.`;

            const response = await axios.post(`${this.baseURL}/api/generate`, {
                model: this.defaultModel,
                prompt,
                stream: false,
            });

            return response.data.response || "No se pudo generar análisis.";
        } catch (error) {
            console.error('AI Sampling Analysis error:', error);
            return "Error al analizar datos de muestreo.";
        }
    }

    /**
     * Analyze sampling sheets (planillas de muestreo) before final report generation
     * This provides quality assessment and feedback before proceeding to lab analysis
     */
    async analyzeSamplingSheets(documentText: string, oitContext?: string): Promise<{
        summary: string;
        quality: 'buena' | 'regular' | 'deficiente';
        findings: string[];
        recommendations: string[];
    }> {
        const available = await this.isAvailable();

        if (!available) {
            // Fallback heuristic analysis
            return {
                summary: "Análisis automático no disponible. Revise manualmente las planillas.",
                quality: 'regular',
                findings: ["Servicio de IA no disponible para análisis detallado"],
                recommendations: ["Verificar completitud de datos manualmente"]
            };
        }

        try {
            const prompt = `Eres un supervisor técnico de campo especializado en monitoreos ambientales. Analiza las siguientes planillas de muestreo y responde SOLO con un JSON válido (sin markdown, sin explicaciones adicionales):

{
  "summary": "resumen ejecutivo breve del estado de las planillas",
  "quality": "buena|regular|deficiente",
  "findings": ["hallazgo 1", "hallazgo 2", "..."],
  "recommendations": ["recomendación 1", "recomendación 2", "..."]
}

CRITERIOS DE EVALUACIÓN:
1. **quality**: 
   - "buena": Datos completos, consistentes, sin anomalías evidentes
   - "regular": Algunos datos faltantes o inconsistencias menores
   - "deficiente": Datos críticos faltantes o inconsistencias graves

2. **findings**: Lista de observaciones importantes (ej: datos faltantes, valores anómalos, comentarios relevantes)

3. **recommendations**: Sugerencias de mejora o acciones correctivas necesarias

Contexto OIT: "${oitContext || 'Sin contexto'}"

Contenido de las Planillas:
${documentText.substring(0, 5000)}

JSON:`;

            console.log('[SAMPLING_SHEETS] Analyzing with AI...');

            const response = await axios.post(`${this.baseURL}/api/generate`, {
                model: this.defaultModel,
                prompt: prompt,
                stream: false,
                format: 'json',
            });

            let responseText = response.data.response || '';

            // Sanitize JSON
            responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonStart = responseText.indexOf('{');
            const jsonEnd = responseText.lastIndexOf('}');

            if (jsonStart !== -1 && jsonEnd !== -1) {
                responseText = responseText.substring(jsonStart, jsonEnd + 1);
            }

            const parsed = JSON.parse(responseText);

            return {
                summary: parsed.summary || "Análisis completado",
                quality: parsed.quality || 'regular',
                findings: parsed.findings || [],
                recommendations: parsed.recommendations || []
            };

        } catch (error) {
            console.error('[SAMPLING_SHEETS] Analysis error:', error);
            return {
                summary: "Error al analizar las planillas. Por favor, revise manualmente.",
                quality: 'regular',
                findings: ["Error en el análisis automático"],
                recommendations: ["Verificar planillas manualmente antes de continuar"]
            };
        }
    }
}

export const aiService = new AIService();
