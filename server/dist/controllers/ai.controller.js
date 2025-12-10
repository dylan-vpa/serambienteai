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
const ai_service_1 = require("../services/ai.service");
const fs_1 = __importDefault(require("fs"));
const pdfParse = require('pdf-parse');
const chat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { message, model } = req.body;
        if (!message) {
            return res.status(400).json({ message: 'Message is required' });
        }
        const response = yield ai_service_1.aiService.chat(message, model);
        res.status(200).json({ response });
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'AI service error' });
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
        // Check if files were uploaded
        if (!req.files || typeof req.files !== 'object') {
            return res.status(400).json({
                valid: false,
                message: 'Se requieren ambos archivos PDF',
                errors: ['No se recibieron archivos']
            });
        }
        const uploaded = req.files;
        const oitFile = (_a = uploaded['oitFile']) === null || _a === void 0 ? void 0 : _a[0];
        const quotationFile = (_b = uploaded['quotationFile']) === null || _b === void 0 ? void 0 : _b[0];
        if (!oitFile || !quotationFile) {
            return res.status(400).json({
                valid: false,
                message: 'Se requieren ambos archivos: OIT y Cotización',
                errors: ['Falta uno o ambos archivos PDF']
            });
        }
        // Validate file types
        if (oitFile.mimetype !== 'application/pdf' || quotationFile.mimetype !== 'application/pdf') {
            return res.status(400).json({
                valid: false,
                message: 'Ambos archivos deben ser PDFs',
                errors: ['Formato de archivo inválido']
            });
        }
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
        let oitText = '';
        let quotationText = '';
        try {
            const oitRes = yield pdfParse(oitBuf);
            const quoRes = yield pdfParse(quotationBuf);
            oitText = ((oitRes === null || oitRes === void 0 ? void 0 : oitRes.text) || '').trim();
            quotationText = ((quoRes === null || quoRes === void 0 ? void 0 : quoRes.text) || '').trim();
        }
        catch (_c) { }
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
        const result = yield ai_service_1.aiService.extractOITDataCombined({
            textOIT: oitText,
            textQuotation: quotationText,
            files: fileSummaries,
        });
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
