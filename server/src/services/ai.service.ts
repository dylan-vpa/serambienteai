import axios from 'axios';
import fs from 'fs';
import path from 'path';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';

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
    async chat(message: string, model?: string): Promise<string> {
        const useModel = model || this.defaultModel;

        try {
            const response = await axios.post(`${this.baseURL}/api/generate`, {
                model: useModel,
                prompt: message,
                stream: false,
            });

            return response.data.response || 'No response from AI';
        } catch (error: any) {
            console.error('AI Chat error:', error.message);
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
            const prompt = `Analiza el siguiente documento OIT y responde SOLO con un JSON válido (sin markdown, sin explicaciones adicionales):

{
  "status": "check|alerta|error",
  "alerts": ["lista de alertas encontradas"],
  "missing": ["lista de items faltantes"],
  "evidence": ["lista de evidencias encontradas"]
}

Criterios:
- status "check": Documento completo y correcto
- status "alerta": Falta información menor
- status "error": Faltan datos críticos

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

            try {
                const parsed = JSON.parse(rawResponse);
                return {
                    status: parsed.status || 'alerta',
                    alerts: parsed.alerts || [],
                    missing: parsed.missing || [],
                    evidence: parsed.evidence || [],
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
            const prompt = `Basándote en este documento OIT, recomienda los recursos necesarios. Responde SOLO con un JSON array de strings:

["recurso1", "recurso2", ...]

Documento:
${documentText}

JSON:`;

            const response = await axios.post(`${this.baseURL}/api/generate`, {
                model: this.defaultModel,
                prompt: prompt,
                stream: false,
                format: 'json',
            });

            const parsed = JSON.parse(response.data.response);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
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
            try {
                const parsed = JSON.parse(rawResponse);
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
        if (lower.includes('en progreso') || lower.includes('in progress')) status = 'IN_PROGRESS';
        else if (lower.includes('complet') || lower.includes('finaliz')) status = 'COMPLETED';

        const missing: string[] = [];
        if (!oitNumber) missing.push('Número de OIT no encontrado');
        if (!description || description.length < 20) missing.push('Descripción insuficiente');

        const valid = missing.length === 0;
        const warnings = [] as string[];
        const errors = valid ? [] : missing;

        return {
            valid,
            data: { oitNumber, description, status },
            message: valid ? 'Validación heurística exitosa (IA no disponible)' : 'Validación heurística: faltan datos',
            errors,
            warnings,
        };
    }

    /**
     * Extract OIT Data by sending file context directly to Ollama
     */
    async extractOITDataFromFiles(files: { name: string; buffer: Buffer }[]): Promise<any> {
        const available = await this.isAvailable();

        if (!available) {
            console.error('Ollama not available');
            return {
                valid: false,
                message: 'Servicio de IA no disponible',
                errors: ['Ollama no está en ejecución. Por favor inicia el servicio de Ollama para validar documentos.']
            };
        }

        // Limit how much base64 we include to avoid huge prompts
        const MAX_BASE64_CHARS = 10000;
        const fileSummaries = files.map(f => {
            const b64 = f.buffer.toString('base64');
            const preview = b64.slice(0, MAX_BASE64_CHARS);
            return {
                name: f.name,
                sizeKB: Math.round(f.buffer.length / 1024),
                base64Preview: preview,
            };
        });

        try {
            const prompt = `Recibirás metadatos y un preview en base64 de PDFs (OIT y Cotización).
Intenta inferir el número de OIT, una breve descripción y el estado sugerido.
Si el contenido no es legible, responde igual con JSON válido indicando faltantes.

Responde SOLO con JSON válido con este formato:
{
  "valid": boolean,
  "data": {
    "oitNumber": "string",
    "description": "string",
    "status": "PENDING|IN_PROGRESS|COMPLETED"
  },
  "message": "string",
  "errors": ["string"],
  "warnings": ["string"]
}

Archivos:
${JSON.stringify(fileSummaries, null, 2)}

Nota:
- Si el preview base64 parece binario o ilegible, indica en "errors" que falta extraer texto del PDF.
- No incluyas comentarios fuera del JSON.

JSON:`;

            const response = await axios.post(`${this.baseURL}/api/generate`, {
                model: this.defaultModel,
                prompt,
                stream: false,
                format: 'json',
            });

            const rawResponse = response.data.response;
            try {
                const parsed = JSON.parse(rawResponse);
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
                return {
                    valid: false,
                    message: 'Error al procesar respuesta de IA',
                    errors: ['Formato de respuesta inválido'],
                    warnings: []
                };
            }
        } catch (error) {
            console.error('AI Extraction from files error:', error);
            return {
                valid: false,
                message: 'Error de conexión con IA',
                errors: ['No se pudo conectar con el servicio de IA']
            }
        }
    }

    async extractOITDataCombined(input: {
        textOIT: string;
        textQuotation: string;
        files: { name: string; sizeKB: number; base64Preview: string }[];
    }): Promise<any> {
        console.log('🤖 [AI SERVICE] Iniciando extractOITDataCombined');
        console.log('📊 [AI SERVICE] Input recibido:', {
            textOITLength: input.textOIT?.length || 0,
            textQuotationLength: input.textQuotation?.length || 0,
            filesCount: input.files?.length || 0
        });

        console.log('🔍 [AI SERVICE] Verificando disponibilidad de Ollama...');
        const available = await this.isAvailable();
        console.log(`${available ? '✅' : '❌'} [AI SERVICE] Ollama ${available ? 'disponible' : 'NO disponible'}`);

        if (!available) {
            console.log('⚠️ [AI SERVICE] Usando análisis heurístico (fallback)');
            return this.extractOITDataHeuristic(
                `DOCUMENTO OIT:\n${input.textOIT || ''}\nDOCUMENTO COTIZACIÓN:\n${input.textQuotation || ''}`
            );
        }

        // Read validation criteria from MD file
        let validationCriteria = '';
        try {
            const criteriaPath = path.join(__dirname, '../../OIT_VALIDATION_CRITERIA.md');
            if (fs.existsSync(criteriaPath)) {
                validationCriteria = fs.readFileSync(criteriaPath, 'utf-8');
            } else {
                console.warn('⚠️ [AI SERVICE] No se encontró el archivo de criterios de validación en:', criteriaPath);
            }
        } catch (err) {
            console.error('⚠️ [AI SERVICE] Error al leer criterios de validación:', err);
        }

        // Use FULL text as requested by user (no limit)
        const oitContext = input.textOIT || '';
        const quotationContext = input.textQuotation || '';

        // ... existing prompt setup ...
        const prompt = `Eres un asistente experto en validación de documentos técnicos.
Tu tarea es analizar una Orden de Inspección de Trabajo (OIT) y su Cotización correspondiente, siguiendo ESTRICTAMENTE los criterios de validación proporcionados.

CRITERIOS DE VALIDACIÓN (IMPORTANTE):
${validationCriteria}

DOCUMENTOS A ANALIZAR:
1. OIT (Texto completo):
${oitContext}

2. COTIZACIÓN (Texto completo):
${quotationContext}

INSTRUCCIONES:
1. Analiza ambos documentos buscando CADA UNO de los puntos mencionados en los "Criterios de Validación".
2. Extrae los datos clave (Número OIT, Descripción, Estado).
3. EXTRAE FECHAS Y HORAS propuestas para la visita/inspección si se mencionan.
4. EXTRAE LOS RECURSOS NECESARIOS (Equipos y Personal) mencionados en la OIT o Cotización.
5. Verifica la coherencia entre documentos.

FORMATO DE RESPUESTA (JSON):
{
  "valid": boolean,
  "data": {
    "oitNumber": "string",
    "description": "string",
    "status": "PENDING" | "IN_PROGRESS" | "COMPLETED",
    "proposedDate": "YYYY-MM-DD (si se menciona)",
    "proposedTime": "HH:mm (si se menciona)",
    "resources": [
      { "name": "string", "type": "EQUIPMENT" | "PERSONNEL", "quantity": number }
    ]
  },
  "message": "Resumen del resultado",
  "errors": ["Lista de criterios NO cumplidos"],
  "warnings": ["Lista de observaciones menores"]
}

Responde ÚNICAMENTE con el JSON válido.`;

        console.log('📤 [AI SERVICE] Enviando request a Ollama con contexto completo...');
        console.log('🔗 [AI SERVICE] URL:', `${this.baseURL}/api/generate`);
        console.log('🎯 [AI SERVICE] Modelo:', this.defaultModel);

        try {
            const response = await axios.post(`${this.baseURL}/api/generate`, {
                model: this.defaultModel,
                prompt,
                stream: false,
                format: 'json',
                options: {
                    temperature: 0.1,
                    num_ctx: 32768,
                    num_predict: 1024
                }
            });

            console.log('✅ [AI SERVICE] Respuesta recibida de Ollama');
            const rawResponse = response.data.response;
            console.log('📝 [AI SERVICE] Raw response:', rawResponse.substring(0, 200) + '...');

            try {
                const parsed = JSON.parse(rawResponse);
                console.log('✅ [AI SERVICE] JSON parseado correctamente');
                const valid = !!parsed.valid;
                const data = parsed.data || {};
                const errors = Array.isArray(parsed.errors) ? parsed.errors : [];
                const warnings = Array.isArray(parsed.warnings) ? parsed.warnings : [];
                const message = parsed.message || (valid ? 'Validación exitosa' : 'Validación fallida');
                if (!valid && errors.length === 0) {
                    errors.push('Faltan detalles de error. Verifica número de OIT y descripción.');
                }
                console.log('📊 [AI SERVICE] Resultado final:', { valid, data, message, errorsCount: errors.length, warningsCount: warnings.length });
                return { valid, data, message, errors, warnings };
            } catch (e) {
                console.log('❌ [AI SERVICE] Error al parsear JSON de Ollama:', e);
                console.log('⚠️ [AI SERVICE] Usando análisis heurístico (fallback por error de parseo)');
                return this.extractOITDataHeuristic(
                    `DOCUMENTO OIT: \n${input.textOIT || ''} \nDOCUMENTO COTIZACIÓN: \n${input.textQuotation || ''}`
                );
            }
        } catch (error: any) {
            console.log('❌ [AI SERVICE] Error en request a Ollama:', error.message);
            console.log('⚠️ [AI SERVICE] Usando análisis heurístico (fallback por error de conexión)');
            return this.extractOITDataHeuristic(
                `DOCUMENTO OIT: \n${input.textOIT || ''} \nDOCUMENTO COTIZACIÓN: \n${input.textQuotation || ''}`
            );
        }
    }

    // New method for background processing
    async processOITBackground(oitId: string, files: { oitFile: Express.Multer.File, quotationFile: Express.Multer.File }) {
        console.log(`🔄 [AI SERVICE] Iniciando procesamiento en segundo plano para OIT ${oitId}`);
        try {
            // 1. Extract Text (Reusing logic - ideally refactor to helper)
            const getFileBuffer = async (file: Express.Multer.File): Promise<Buffer> => {
                if (file.buffer) return file.buffer;
                if (file.path) return await fs.promises.readFile(file.path);
                throw new Error('Archivo inválido');
            };

            const oitBuf = await getFileBuffer(files.oitFile);
            const quotationBuf = await getFileBuffer(files.quotationFile);

            const extractText = async (file: Express.Multer.File, buffer: Buffer) => {
                if (file.mimetype === 'text/plain') return buffer.toString('utf-8');
                if (file.mimetype === 'application/pdf') {
                    const pdfParse = require('pdf-parse');
                    const res = await pdfParse(buffer);
                    return res.text;
                }
                return '';
            };

            const oitText = await extractText(files.oitFile, oitBuf);
            const quotationText = await extractText(files.quotationFile, quotationBuf);

            // 2. Call AI
            const result = await this.extractOITDataCombined({
                textOIT: oitText,
                textQuotation: quotationText,
                files: []
            });

            // 3. Update DB
            const PrismaClient = require('@prisma/client').PrismaClient;
            const prisma = new PrismaClient();

            await prisma.oIT.update({
                where: { id: oitId },
                data: {
                    oitNumber: result.data?.oitNumber || `PENDING-${oitId.slice(0, 8)}`,
                    description: result.data?.description || 'Sin descripción',
                    status: result.valid ? 'REVIEW_REQUIRED' : 'REVIEW_REQUIRED',
                    aiData: JSON.stringify(result),
                    resources: JSON.stringify(result.data?.resources || []),
                }
            });

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
    // New method for Lab Results Analysis
    async analyzeLabResults(documentText: string, oitContext?: string): Promise<any> {
        const available = await this.isAvailable();
        if (!available) {
            return {
                summary: "Análisis no disponible (IA desconectada)",
                findings: [],
                status: "UNKNOWN"
            };
        }

        try {
            const prompt = `Actúa como un auditor de calidad técnica.
            Tienes el contexto de una Orden de Inspección (OIT) y el reporte de laboratorio recibido.
            
            Contexto OIT (Lo que se pidió):
            "${oitContext || 'Sin contexto específico'}"

            Texto del Reporte de Laboratorio (Resultados):
            "${documentText.substring(0, 5000)}"

            Tarea:
            1. Resume los hallazgos del reporte.
            2. Lista anomalías o resultados fuera de norma.
            3. VERIFICA si el reporte corresponde a lo pedido en la OIT (si hay contexto).

            Genera un JSON con este formato:
            {
                "summary": "Resumen ejecutivo y concordancia con OIT (máx 200 caracteres)",
                "findings": ["Hallazgo 1", "Hallazgo 2 (concordancia o discrepancia)"],
                "status": "COMPLIANT" | "NON_COMPLIANT" | "REVIEW_NEEDED"
            }

            JSON:`;

            const response = await axios.post(`${this.baseURL}/api/generate`, {
                model: this.defaultModel,
                prompt,
                stream: false,
                format: 'json',
            });

            const parsed = JSON.parse(response.data.response);
            return parsed;

        } catch (error) {
            console.error('AI Lab Analysis error:', error);
            return {
                summary: "Error al analizar resultados",
                findings: [],
                status: "ERROR"
            };
        }
    }
}

export const aiService = new AIService();
