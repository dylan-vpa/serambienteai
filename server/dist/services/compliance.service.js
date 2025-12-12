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
Object.defineProperty(exports, "__esModule", { value: true });
exports.complianceService = exports.ComplianceService = void 0;
const client_1 = require("@prisma/client");
const ai_service_1 = require("./ai.service");
const notification_controller_1 = require("../controllers/notification.controller");
const prisma = new client_1.PrismaClient();
class ComplianceService {
    checkCompliance(oitId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const oit = yield prisma.oIT.findUnique({
                where: { id: oitId }
            });
            if (!oit) {
                throw new Error('OIT not found');
            }
            // Fetch ACTIVE Standards of type 'OIT' from database
            const standards = yield prisma.standard.findMany({
                where: { type: 'OIT' }
            });
            if (standards.length === 0) {
                // No standards to check against
                yield (0, notification_controller_1.createNotification)(userId, 'Sin Normas Configuradas', 'No hay normas de tipo OIT configuradas para verificar cumplimiento.', 'INFO', oitId);
                return {
                    compliant: true,
                    score: 100,
                    summary: 'No hay normas configuradas para verificar.',
                    issues: [],
                    recommendations: ['Configure normas en la sección de Normas para habilitar verificación automática.']
                };
            }
            // Build detailed prompt for AI with OIT data and Standards
            const standardsList = standards.map(s => `- **${s.title}**: ${s.description}`).join('\n');
            const prompt = `
Actúa como Auditor de Calidad y Cumplimiento experto.

**OIT a Verificar:**
- Número: ${oit.oitNumber}
- Descripción: ${oit.description || 'Sin descripción'}
- Estado: ${oit.status}

**Normas a Verificar:**
${standardsList}

**Tarea:**
Analiza si la OIT cumple con cada una de las normas especificadas. Verifica cada criterio detalladamente.

**Responde ÚNICAMENTE en formato JSON válido con esta estructura exacta:**
{
  "compliant": true/false,
  "score": número del 0 al 100,
  "summary": "resumen general del cumplimiento",
  "issues": ["lista de incumplimientos encontrados"],
  "recommendations": ["lista de recomendaciones para mejorar"]
}
        `;
            try {
                const aiResponse = yield ai_service_1.aiService.chat(prompt, 'llama3.2:3b'); // Use default model
                let result;
                try {
                    // Try to parse JSON from AI response (it might contain markdown code blocks)
                    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                    const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
                    result = JSON.parse(jsonStr);
                }
                catch (e) {
                    console.error('Error parsing AI compliance response:', e);
                    result = {
                        compliant: false,
                        score: 0,
                        summary: 'Error al analizar la respuesta de la IA.',
                        issues: ['Falló el análisis automático.'],
                        recommendations: []
                    };
                }
                // 5. Create Notification
                yield (0, notification_controller_1.createNotification)(userId, `Revisión de Normativa: ${oit.oitNumber}`, `Resultado: ${result.compliant ? 'CUMPLE' : 'NO CUMPLE'} (Score: ${result.score}/100)`, result.compliant ? 'SUCCESS' : 'WARNING', oitId);
                return result;
            }
            catch (error) {
                console.error('Compliance check error:', error);
                throw error;
            }
        });
    }
}
exports.ComplianceService = ComplianceService;
exports.complianceService = new ComplianceService();
