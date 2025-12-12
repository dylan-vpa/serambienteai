"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class PlanningService {
    /**
     * Cleans AI response by removing markdown code blocks
     */
    cleanAIResponse(response) {
        // Remove markdown code blocks like ```json ... ```
        let cleaned = response
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .trim();
        // Extract JSON if still wrapped in text
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleaned = jsonMatch[0];
        }
        return cleaned;
    }
    generateProposal(oitId) {
        return __awaiter(this, void 0, void 0, function* () {
            const oit = yield prisma.oIT.findUnique({ where: { id: oitId } });
            if (!oit) {
                throw new Error('OIT not found');
            }
            const resources = yield prisma.resource.findMany({
                where: { status: 'AVAILABLE' }
            });
            const templates = yield prisma.samplingTemplate.findMany();
            if (templates.length === 0) {
                // No templates available, create generic proposal
                const proposal = {
                    templateId: null,
                    templateName: 'Planeación Genérica',
                    proposedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                    proposedTime: '09:00',
                    steps: [
                        { id: '1', title: 'Preparación de equipos', description: 'Verificar y preparar equipos necesarios' },
                        { id: '2', title: 'Recolección de muestras', description: 'Ejecutar protocolo de muestreo' },
                        { id: '3', title: 'Documentación', description: 'Registrar datos y fotografías' },
                        { id: '4', title: 'Entrega a laboratorio', description: 'Enviar muestras para análisis' }
                    ],
                    assignedResources: resources.slice(0, 3),
                    estimatedDuration: '4 horas'
                };
                yield prisma.oIT.update({
                    where: { id: oitId },
                    data: {
                        aiData: JSON.stringify({
                            valid: true,
                            data: proposal,
                            message: 'Propuesta genérica creada'
                        }),
                        planningProposal: JSON.stringify(proposal)
                    }
                });
                return proposal;
            }
            // AI suggests best template
            const { aiService } = yield Promise.resolve().then(() => __importStar(require('./ai.service')));
            const templatesList = templates.map(t => `- ID: ${t.id}, Nombre: ${t.name}, Tipo: ${t.oitType}, Descripción: ${t.description}`).join('\n');
            const prompt = `
Analiza esta OIT y selecciona la plantilla de muestreo más apropiada.

**OIT:**
- Número: ${oit.oitNumber}
- Descripción: ${oit.description || 'Sin descripción'}

**Plantillas Disponibles:**
${templatesList}

**Responde ÚNICAMENTE en formato JSON:**
{
  "templateId": "id de la plantilla seleccionada",
  "reason": "razón de la selección",
  "confidence": número entre 0 y 1
}
        `;
            let selectedTemplate;
            try {
                const aiResponse = yield aiService.chat(prompt);
                console.log('AI Response for template selection:', aiResponse);
                const cleanedResponse = this.cleanAIResponse(aiResponse);
                const templateSuggestion = JSON.parse(cleanedResponse);
                selectedTemplate = yield prisma.samplingTemplate.findUnique({
                    where: { id: templateSuggestion.templateId }
                });
            }
            catch (error) {
                console.error('Failed to parse AI response:', error);
                console.error('Error details:', error instanceof Error ? error.message : String(error));
            }
            // Fallback to first template if AI fails
            if (!selectedTemplate) {
                selectedTemplate = templates[0];
            }
            const proposal = {
                templateId: selectedTemplate.id,
                templateName: selectedTemplate.name,
                proposedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                proposedTime: '09:00',
                steps: JSON.parse(selectedTemplate.steps),
                assignedResources: resources.slice(0, 3),
                estimatedDuration: '4 horas'
            };
            yield prisma.oIT.update({
                where: { id: oitId },
                data: {
                    selectedTemplateId: selectedTemplate.id,
                    aiData: JSON.stringify({
                        valid: true,
                        data: proposal,
                        message: 'Propuesta de planificación generada'
                    }),
                    planningProposal: JSON.stringify(proposal)
                }
            });
            return proposal;
        });
    }
    acceptProposal(oitId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield prisma.oIT.update({
                where: { id: oitId },
                data: {
                    planningAccepted: true,
                    status: 'SCHEDULED'
                }
            });
        });
    }
    rejectProposal(oitId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield prisma.oIT.update({
                where: { id: oitId },
                data: {
                    planningProposal: null,
                    selectedTemplateId: null
                }
            });
        });
    }
}
exports.default = new PlanningService();
