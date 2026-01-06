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
const client_1 = require("@prisma/client");
const ai_service_1 = require("./ai.service");
const pdf_service_1 = require("./pdf.service");
const fs_1 = __importDefault(require("fs"));
const prisma = new client_1.PrismaClient();
class VerificationService {
    verifyConsistency(oitId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const oit = yield prisma.oIT.findUnique({
                where: { id: oitId },
                include: { assignedEngineers: { include: { user: true } } }
            });
            if (!oit)
                throw new Error('OIT not found');
            // 1. Gather Data Sources
            const sources = {
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
                    sources.clientName = ((_a = ai.data) === null || _a === void 0 ? void 0 : _a.clientName) || ai.clientName;
                    sources.aiResources = (_b = ai.data) === null || _b === void 0 ? void 0 : _b.assignedResources;
                }
            }
            catch (e) { }
            // Sampling Data (What was actually done in app)
            let samplingSummary = '';
            try {
                if (oit.stepValidations) {
                    const steps = JSON.parse(oit.stepValidations);
                    const stepValues = Object.values(steps).map((s) => { var _a, _b; return ((_a = s.data) === null || _a === void 0 ? void 0 : _a.value) || ((_b = s.data) === null || _b === void 0 ? void 0 : _b.result); }).filter(Boolean);
                    samplingSummary = stepValues.join(', ');
                }
            }
            catch (e) { }
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
                    if (fs_1.default.existsSync(path)) {
                        labText = yield pdf_service_1.pdfService.extractText(path);
                    }
                }
                catch (e) {
                    console.error('Error reading lab summary', e);
                }
            }
            // Field Form Text
            let fieldFormText = '';
            if (oit.fieldFormUrl) {
                try {
                    let path = oit.fieldFormUrl;
                    if (path.includes('/uploads/')) {
                        path = 'uploads/' + path.split('/uploads/')[1];
                    }
                    if (fs_1.default.existsSync(path)) {
                        fieldFormText = yield pdf_service_1.pdfService.extractText(path);
                    }
                }
                catch (e) {
                    console.error('Error reading field form', e);
                }
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
                const aiResponse = yield ai_service_1.aiService.chat(prompt);
                const cleanResponse = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                const result = JSON.parse(cleanResponse);
                yield prisma.oIT.update({
                    where: { id: oitId },
                    data: { fieldFormAnalysis: JSON.stringify(result) }
                });
                return result;
            }
            catch (error) {
                console.error('AI Verification failed', error);
                throw new Error('Falló la verificación por IA');
            }
        });
    }
}
exports.default = new VerificationService();
