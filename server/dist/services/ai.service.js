"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiService = exports.AIService = void 0;
const axios_1 = __importDefault(require("axios"));
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';
class AIService {
    constructor() {
        this.baseURL = OLLAMA_URL;
        this.defaultModel = DEFAULT_MODEL;
    }
    /**
     * Check if Ollama is available
     */
    isAvailable() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield axios_1.default.get(`${this.baseURL}/api/tags`, { timeout: 2000 });
                return true;
            }
            catch (error) {
                return false;
            }
        });
    }
    /**
     * Get list of available models
     */
    getModels() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const response = yield axios_1.default.get(`${this.baseURL}/api/tags`);
                return ((_a = response.data.models) === null || _a === void 0 ? void 0 : _a.map((m) => m.name)) || [];
            }
            catch (error) {
                console.error('Failed to fetch models:', error);
                return [];
            }
        });
    }
    /**
     * Chat with AI
     */
    chat(message, model) {
        return __awaiter(this, void 0, void 0, function* () {
            const useModel = model || this.defaultModel;
            try {
                const response = yield axios_1.default.post(`${this.baseURL}/api/generate`, {
                    model: useModel,
                    prompt: message,
                    stream: false,
                });
                return response.data.response || 'No response from AI';
            }
            catch (error) {
                console.error('AI Chat error:', error.message);
                throw new Error('AI service unavailable. Please ensure Ollama is running.');
            }
        });
    }
    /**
     * Analyze OIT document
     */
    analyzeDocument(documentText) {
        return __awaiter(this, void 0, void 0, function* () {
            const available = yield this.isAvailable();
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
                const response = yield axios_1.default.post(`${this.baseURL}/api/generate`, {
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
                }
                catch (parseError) {
                    console.error('Failed to parse AI response:', rawResponse);
                    return this.heuristicAnalysis(documentText);
                }
            }
            catch (error) {
                console.error('AI Analysis error:', error);
                return this.heuristicAnalysis(documentText);
            }
        });
    }
    /**
     * Recommend resources based on OIT content
     */
    recommendResources(documentText) {
        return __awaiter(this, void 0, void 0, function* () {
            const available = yield this.isAvailable();
            if (!available) {
                return this.heuristicResourceRecommendation(documentText);
            }
            try {
                const prompt = `Basándote en este documento OIT, recomienda los recursos necesarios. Responde SOLO con un JSON array de strings:

["recurso1", "recurso2", ...]

Documento:
${documentText}

JSON:`;
                const response = yield axios_1.default.post(`${this.baseURL}/api/generate`, {
                    model: this.defaultModel,
                    prompt: prompt,
                    stream: false,
                    format: 'json',
                });
                const parsed = JSON.parse(response.data.response);
                return Array.isArray(parsed) ? parsed : [];
            }
            catch (error) {
                return this.heuristicResourceRecommendation(documentText);
            }
        });
    }
    /**
     * Heuristic analysis fallback
     */
    heuristicAnalysis(text) {
        const lowerText = text.toLowerCase();
        const alerts = [];
        const missing = [];
        const evidence = [];
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
    heuristicResourceRecommendation(text) {
        const lowerText = text.toLowerCase();
        const resources = [];
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
    extractOITData(documentText) {
        return __awaiter(this, void 0, void 0, function* () {
            const available = yield this.isAvailable();
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
                const response = yield axios_1.default.post(`${this.baseURL}/api/generate`, {
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
                }
                catch (e) {
                    return this.extractOITDataHeuristic(documentText);
                }
            }
            catch (error) {
                return this.extractOITDataHeuristic(documentText);
            }
        });
    }
    extractOITDataHeuristic(documentText) {
        const text = documentText || '';
        const lower = text.toLowerCase();
        let oitNumber = '';
        const m1 = text.match(/\bOIT\s*(?:N°|No|#|:)?\s*([A-Za-z0-9-]+)/i);
        const m2 = text.match(/\b(?:codigo|code)\s*[:#]?\s*([A-Za-z0-9-]+)/i);
        if (m1 && m1[1])
            oitNumber = m1[1];
        else if (m2 && m2[1])
            oitNumber = m2[1];
        let description = '';
        const descLabel = text.match(/(?:descripcion|descripción)\s*[:\-]?\s*(.{20,200})/i);
        if (descLabel && descLabel[1])
            description = descLabel[1].trim();
        if (!description)
            description = text.replace(/\s+/g, ' ').slice(0, 240);
        let status = 'PENDING';
        if (lower.includes('en progreso') || lower.includes('in progress'))
            status = 'IN_PROGRESS';
        else if (lower.includes('complet') || lower.includes('finaliz'))
            status = 'COMPLETED';
        const missing = [];
        if (!oitNumber)
            missing.push('Número de OIT no encontrado');
        if (!description || description.length < 20)
            missing.push('Descripción insuficiente');
        const valid = missing.length === 0;
        const warnings = [];
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
    extractOITDataFromFiles(files) {
        return __awaiter(this, void 0, void 0, function* () {
            const available = yield this.isAvailable();
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
                const response = yield axios_1.default.post(`${this.baseURL}/api/generate`, {
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
                }
                catch (e) {
                    return {
                        valid: false,
                        message: 'Error al procesar respuesta de IA',
                        errors: ['Formato de respuesta inválido'],
                        warnings: []
                    };
                }
            }
            catch (error) {
                console.error('AI Extraction from files error:', error);
                return {
                    valid: false,
                    message: 'Error de conexión con IA',
                    errors: ['No se pudo conectar con el servicio de IA']
                };
            }
        });
    }
    extractOITDataCombined(input) {
        return __awaiter(this, void 0, void 0, function* () {
            const available = yield this.isAvailable();
            if (!available) {
                return this.extractOITDataHeuristic(`DOCUMENTO OIT:\n${input.textOIT || ''}\nDOCUMENTO COTIZACIÓN:\n${input.textQuotation || ''}`);
            }
            const prompt = `Analiza dos documentos: OIT y Cotización. Usa el texto proporcionado y la metadata de archivos.
Debes comparar ambos para extraer y validar:
- Número de OIT
- Descripción breve
- Estado sugerido (PENDING, IN_PROGRESS, COMPLETED)
Devuelve SOLO JSON válido con:
{
  "valid": boolean,
  "data": { "oitNumber": string, "description": string, "status": string },
  "message": string,
  "errors": [string],
  "warnings": [string]
}
Reglas de error sugeridas:
- Si falta número de OIT: agrega "Número de OIT no encontrado"
- Si falta descripción o es corta: agrega "Descripción insuficiente"
- Si OIT y Cotización no coinciden: agrega "Inconsistencias entre OIT y Cotización"
Texto OIT:\n${(input.textOIT || '').slice(0, 4000)}
Texto Cotización:\n${(input.textQuotation || '').slice(0, 4000)}
Archivos:\n${JSON.stringify(input.files)}
JSON:`;
            try {
                const response = yield axios_1.default.post(`${this.baseURL}/api/generate`, {
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
                }
                catch (e) {
                    return this.extractOITDataHeuristic(`DOCUMENTO OIT:\n${input.textOIT || ''}\nDOCUMENTO COTIZACIÓN:\n${input.textQuotation || ''}`);
                }
            }
            catch (error) {
                return this.extractOITDataHeuristic(`DOCUMENTO OIT:\n${input.textOIT || ''}\nDOCUMENTO COTIZACIÓN:\n${input.textQuotation || ''}`);
            }
        });
    }
}
exports.AIService = AIService;
exports.aiService = new AIService();
