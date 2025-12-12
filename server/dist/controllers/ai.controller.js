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
exports.validateOITDocuments = exports.recommendResources = exports.analyzeDocument = exports.getModels = exports.chat = void 0;
const client_1 = require("@prisma/client");
const ai_service_1 = require("../services/ai.service");
const fs_1 = __importDefault(require("fs"));
const pdfParse = require('pdf-parse');
const prisma = new client_1.PrismaClient();
const chat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { message, model } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
        // 🔥 OBTENER TODO EL CONTEXTO DE LA BASE DE DATOS
        const [oits, templates, standards, resources] = yield Promise.all([
            prisma.oIT.findMany({
                orderBy: { createdAt: 'desc' },
                take: 50 // Últimos 50 OITs
            }),
            prisma.samplingTemplate.findMany(),
            prisma.standard.findMany(),
            prisma.resource.findMany()
        ]);
        // Construir contexto enriquecido
        const contextPrompt = `
Eres un asistente experto del sistema ALS V2 para gestión de Órdenes de Inspección y Toma de muestras (OIT).

CONTEXTO DE LA BASE DE DATOS:

📊 OITs EN SISTEMA (${oits.length} total):
${oits.slice(0, 10).map(oit => `
- OIT #${oit.oitNumber}
  Estado: ${oit.status}
  Descripción: ${oit.description || 'N/A'}
  Fecha: ${oit.createdAt.toLocaleDateString()}
  Planeación aceptada: ${oit.planningAccepted ? 'Sí' : 'No'}
  Tiene muestreo: ${oit.samplingData ? 'Sí' : 'No'}
`).join('\n')}
${oits.length > 10 ? `... y ${oits.length - 10} OITs más` : ''}

🧪 PLANTILLAS DE MUESTREO (${templates.length} total):
${templates.map(t => `
- ${t.name}
  Tipo OIT: ${t.oitType}
  Descripción: ${t.description}
  Pasos: ${JSON.parse(t.steps).length} pasos configurados
`).join('\n')}

📋 NORMAS Y ESTÁNDARES (${standards.length} total):
${standards.map(s => `
- ${s.title}
  Tipo: ${s.type}
  Descripción: ${s.description}
`).join('\n')}

🔧 RECURSOS DISPONIBLES (${resources.length} total):
${resources.map(r => `
- ${r.name} (${r.type})
  Cantidad: ${r.quantity}
  Estado: ${r.status}
`).join('\n')}

ESTADÍSTICAS:
- OITs Pendientes: ${oits.filter(o => o.status === 'PENDING').length}
- OITs En Análisis: ${oits.filter(o => o.status === 'ANALYZING').length}
- OITs Agendados: ${oits.filter(o => o.status === 'SCHEDULED').length}
- OITs En Progreso: ${oits.filter(o => o.status === 'IN_PROGRESS').length}
- OITs Completados: ${oits.filter(o => o.status === 'COMPLETED').length}

Usa esta información para dar respuestas precisas y útiles sobre el estado del sistema.

PREGUNTA DEL USUARIO: ${message}

Responde de manera clara, profesional y basándote en los datos reales del sistema.
`.trim();
        const response = yield ai_service_1.aiService.chat(contextPrompt, model);
        res.json({ response });
    }
    catch (error) {
        console.error('Error in chat:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});
exports.chat = chat;
const getModels = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const models = yield ai_service_1.aiService.getModels();
        const available = yield ai_service_1.aiService.isAvailable();
        res.status(200).json({
            available,
            models,
            defaultModel: process.env.OLLAMA_MODEL || 'llama3.2:3b'
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch models' });
    }
});
exports.getModels = getModels;
const analyzeDocument = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ message: 'Document text is required' });
        }
        const analysis = yield ai_service_1.aiService.analyzeDocument(text);
        res.status(200).json(analysis);
    }
    catch (error) {
        res.status(500).json({ message: 'Analysis failed' });
    }
});
exports.analyzeDocument = analyzeDocument;
const recommendResources = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ message: 'Document text is required' });
        }
        const recommendations = yield ai_service_1.aiService.recommendResources(text);
        res.status(200).json({ recommendations });
    }
    catch (error) {
        res.status(500).json({ message: 'Recommendation failed' });
    }
});
exports.recommendResources = recommendResources;
const validateOITDocuments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        console.log('🔍 [VALIDATE] Iniciando validación de documentos OIT');
        // Check if files were uploaded
        if (!req.files || typeof req.files !== 'object') {
            console.log('❌ [VALIDATE] No se recibieron archivos');
            return res.status(400).json({
                valid: false,
                message: 'Se requieren ambos archivos PDF',
                errors: ['No se recibieron archivos']
            });
        }
        const uploaded = req.files;
        const oitFile = (_a = uploaded['oitFile']) === null || _a === void 0 ? void 0 : _a[0];
        const quotationFile = (_b = uploaded['quotationFile']) === null || _b === void 0 ? void 0 : _b[0];
        console.log('📄 [VALIDATE] Archivos recibidos:', {
            oitFile: oitFile === null || oitFile === void 0 ? void 0 : oitFile.originalname,
            quotationFile: quotationFile === null || quotationFile === void 0 ? void 0 : quotationFile.originalname
        });
        if (!oitFile || !quotationFile) {
            console.log('❌ [VALIDATE] Falta uno o ambos archivos');
            return res.status(400).json({
                valid: false,
                message: 'Se requieren ambos archivos: OIT y Cotización',
                errors: ['Falta uno o ambos archivos PDF']
            });
        }
        // Validate file types
        const allowedTypes = ['application/pdf', 'text/plain'];
        if (!allowedTypes.includes(oitFile.mimetype) || !allowedTypes.includes(quotationFile.mimetype)) {
            console.log('❌ [VALIDATE] Formato de archivo inválido');
            return res.status(400).json({
                valid: false,
                message: 'Los archivos deben ser PDF o TXT',
                errors: ['Formato de archivo inválido. Use PDF o TXT.']
            });
        }
        console.log('📦 [VALIDATE] Extrayendo buffers de archivos...');
        // Helper to get a Buffer regardless of storage engine
        const getFileBuffer = (file) => __awaiter(void 0, void 0, void 0, function* () {
            if (file.buffer)
                return file.buffer;
            if (file.path)
                return yield fs_1.default.promises.readFile(file.path);
            throw new Error('Archivo inválido');
        });
        const oitBuf = yield getFileBuffer(oitFile);
        const quotationBuf = yield getFileBuffer(quotationFile);
        console.log('✅ [VALIDATE] Buffers extraídos:', {
            oitSize: `${Math.round(oitBuf.length / 1024)}KB`,
            quotationSize: `${Math.round(quotationBuf.length / 1024)}KB`
        });
        console.log('📖 [VALIDATE] Extrayendo texto de documentos...');
        let oitText = '';
        let quotationText = '';
        const extractText = (file, buffer) => __awaiter(void 0, void 0, void 0, function* () {
            if (file.mimetype === 'text/plain') {
                return buffer.toString('utf-8');
            }
            else if (file.mimetype === 'application/pdf') {
                const res = yield pdfParse(buffer);
                return res.text;
            }
            return '';
        });
        try {
            oitText = (yield extractText(oitFile, oitBuf)).trim();
            quotationText = (yield extractText(quotationFile, quotationBuf)).trim();
            console.log('✅ [VALIDATE] Texto extraído:', {
                oitTextLength: oitText.length,
                quotationTextLength: quotationText.length
            });
        }
        catch (err) {
            console.log('⚠️ [VALIDATE] Error al extraer texto:', err);
        }
        const MAX_BASE64_CHARS = 8000;
        const fileSummaries = [
            {
                name: oitFile.originalname || 'oit.pdf',
                sizeKB: Math.round(oitBuf.length / 1024),
                base64Preview: oitBuf.toString('base64').slice(0, MAX_BASE64_CHARS),
            },
            {
                name: quotationFile.originalname || 'cotizacion.pdf',
                sizeKB: Math.round(quotationBuf.length / 1024),
                base64Preview: quotationBuf.toString('base64').slice(0, MAX_BASE64_CHARS),
            },
        ];
        console.log('🤖 [VALIDATE] Enviando a servicio de IA...');
        const result = yield ai_service_1.aiService.extractOITDataCombined({
            textOIT: oitText,
            textQuotation: quotationText,
            files: fileSummaries,
        });
        console.log('✅ [VALIDATE] Respuesta de IA recibida:', result);
        return res.status(200).json(result);
    }
    catch (error) {
        console.error('Error validating OIT documents:', error);
        res.status(500).json({
            valid: false,
            message: 'Error al validar documentos',
            errors: [error.message || 'Error interno del servidor']
        });
    }
});
exports.validateOITDocuments = validateOITDocuments;
