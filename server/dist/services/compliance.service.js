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
exports.complianceService = exports.ComplianceService = void 0;
const client_1 = require("@prisma/client");
const ai_service_1 = require("./ai.service");
const notification_controller_1 = require("../controllers/notification.controller");
const fs = __importStar(require("fs"));
const pdf_service_1 = require("./pdf.service");
const prisma = new client_1.PrismaClient();
// Category mapping for OIT types
const OIT_TYPE_CATEGORIES = {
    'AGUA_POTABLE': ['agua_potable'],
    'VERTIMIENTOS': ['vertimientos'],
    'AGUAS_MARINAS': ['aguas_marinas'],
    'AGUAS_RESIDUALES': ['aguas_residuales'],
    'PISCINA': ['piscina'],
    'RUIDO': ['ruido'],
    'AIRE': ['aire', 'olores'],
    'FUENTES_FIJAS': ['fuentes_fijas'],
    'REUSO': ['reuso'],
    // Default catches all
    'DEFAULT': ['decreto', 'general', 'lousiana']
};
class ComplianceService {
    /**
     * Detect OIT type from aiData or description
     */
    detectOitType(oit) {
        const aiData = oit.aiData ? JSON.parse(oit.aiData) : {};
        const description = (oit.description || '').toLowerCase();
        const oitType = (aiData.tipoMuestreo || aiData.tipo || '').toLowerCase();
        const combined = `${description} ${oitType}`;
        if (combined.includes('agua potable') || combined.includes('potable'))
            return 'AGUA_POTABLE';
        if (combined.includes('vertimiento'))
            return 'VERTIMIENTOS';
        if (combined.includes('marina') || combined.includes('mar'))
            return 'AGUAS_MARINAS';
        if (combined.includes('residual'))
            return 'AGUAS_RESIDUALES';
        if (combined.includes('piscina'))
            return 'PISCINA';
        if (combined.includes('ruido'))
            return 'RUIDO';
        if (combined.includes('aire') || combined.includes('atmosféric'))
            return 'AIRE';
        if (combined.includes('fuente fija') || combined.includes('chimenea') || combined.includes('emisión'))
            return 'FUENTES_FIJAS';
        if (combined.includes('reuso') || combined.includes('reúso'))
            return 'REUSO';
        return 'DEFAULT';
    }
    /**
     * Get applicable standards based on OIT type
     */
    getApplicableStandards(oitType) {
        return __awaiter(this, void 0, void 0, function* () {
            const categories = OIT_TYPE_CATEGORIES[oitType] || OIT_TYPE_CATEGORIES['DEFAULT'];
            // Get standards for specific categories + always include general/decreto
            const allCategories = [...categories, ...OIT_TYPE_CATEGORIES['DEFAULT']];
            return prisma.standard.findMany({
                where: {
                    OR: [
                        { category: { in: allCategories } },
                        { type: 'OIT' }
                    ]
                }
            });
        });
    }
    /**
     * Extract text from quotation PDF
     */
    extractQuotationContent(quotationFileUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[Compliance] Received quotation path: ${quotationFileUrl}`);
            if (!quotationFileUrl)
                return '';
            let filePath = quotationFileUrl;
            // Fix: If path starts with slash but doesn't exist at root, assume relative to project root
            // and strip the leading slash to make it relative to process.cwd()
            if (filePath.startsWith('/') && !fs.existsSync(filePath)) {
                filePath = filePath.substring(1); // Remove leading slash -> "uploads/file.pdf"
            }
            // Ensure absolute path resolution if needed or rely on cwd (server/)
            if (!fs.existsSync(filePath)) {
                // Try resolving relative to CWD
                filePath = require('path').join(process.cwd(), filePath);
            }
            console.log(`[Compliance] Resolved path: ${filePath}`);
            if (!fs.existsSync(filePath)) {
                console.warn(`[Compliance] FINAL CHECK - File not found: ${filePath}`);
                return '';
            }
            try {
                return yield pdf_service_1.pdfService.extractText(filePath);
            }
            catch (error) {
                console.error('Error extracting quotation:', error);
                return '';
            }
        });
    }
    /**
     * Build standards content for prompt - FULL content, no truncation
     */
    buildStandardsContent(standards) {
        return standards.map(s => {
            return `
### NORMA: ${s.title}
**Categoría:** ${s.category || 'general'}
**Contenido Normativo Completo:**
${s.content || s.description || 'Sin contenido'}
`;
        }).join('\n---\n');
    }
    checkCompliance(oitId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const oit = yield prisma.oIT.findUnique({
                where: { id: oitId }
            });
            if (!oit) {
                throw new Error('OIT not found');
            }
            // Detect OIT type
            const oitType = this.detectOitType(oit);
            console.log(`📋 OIT Type detected: ${oitType}`);
            // Get applicable standards based on OIT type
            const standards = yield this.getApplicableStandards(oitType);
            console.log(`📚 Applicable standards: ${standards.length}`);
            if (standards.length === 0) {
                yield (0, notification_controller_1.createNotification)(userId, 'Sin Normas Configuradas', 'No hay normas configuradas para este tipo de OIT.', 'INFO', oitId);
                return {
                    compliant: true,
                    score: 100,
                    oitType,
                    summary: 'No hay normas configuradas para verificar.',
                    issues: [],
                    exclusions: [],
                    recommendations: ['Configure normas en la sección de Normas para habilitar verificación automática.']
                };
            }
            // Extract quotation content to detect exclusions
            const quotationContent = yield this.extractQuotationContent(oit.quotationFileUrl);
            console.log(`📄 Quotation content extracted: ${quotationContent.length} chars`);
            // Parse OIT AI data
            const aiData = oit.aiData ? JSON.parse(oit.aiData) : {};
            // Build standards content - use ALL standards with FULL content
            const standardsContent = this.buildStandardsContent(standards);
            // Build enhanced prompt
            const prompt = `
Actúa como Auditor de Calidad Ambiental experto en normativa colombiana.

## OIT A VERIFICAR
- **Número:** ${oit.oitNumber}
- **Tipo detectado:** ${oitType}
- **Descripción:** ${oit.description || 'Sin descripción'}
- **Ubicación:** ${oit.location || 'No especificada'}
- **Datos extraídos:**
${JSON.stringify(aiData, null, 2).substring(0, 5000)}

## COTIZACIÓN (puede contener exclusiones o modificaciones)
${quotationContent.substring(0, 10000) || 'No disponible'}

## NORMAS APLICABLES
${standardsContent}

## INSTRUCCIONES
1. **Analiza la cotización** para identificar qué parámetros/análisis se incluyeron y cuáles se excluyeron
2. **Compara con las normas aplicables** para verificar cumplimiento
3. **Identifica exclusiones**: Si la cotización excluye algún parámetro que la norma exige, márcalo
4. **Calcula el score de cumplimiento** considerando las exclusiones acordadas

## RESPONDE ÚNICAMENTE EN JSON VÁLIDO:
{
  "compliant": true/false,
  "score": 0-100,
  "oitType": "${oitType}",
  "summary": "resumen ejecutivo del análisis",
  "appliedStandards": ["lista de normas aplicadas"],
  "exclusions": ["lista de parámetros/análisis excluidos en la cotización"],
  "issues": ["lista de incumplimientos NO cubiertos por exclusiones"],
  "recommendations": ["recomendaciones para mejorar cumplimiento"]
}
        `.trim();
            try {
                const aiResponse = yield ai_service_1.aiService.chat(prompt);
                let result;
                try {
                    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                    const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
                    result = JSON.parse(jsonStr);
                }
                catch (e) {
                    console.error('Error parsing AI compliance response:', e);
                    result = {
                        compliant: false,
                        score: 0,
                        oitType,
                        summary: 'Error al analizar la respuesta de la IA.',
                        appliedStandards: standards.map(s => s.title),
                        exclusions: [],
                        issues: ['Falló el análisis automático.'],
                        recommendations: ['Revisar manualmente el cumplimiento.']
                    };
                }
                // Ensure required fields
                result.oitType = result.oitType || oitType;
                result.appliedStandards = result.appliedStandards || standards.map(s => s.title);
                result.exclusions = result.exclusions || [];
                // Create notification
                const exclusionNote = result.exclusions.length > 0
                    ? ` | ${result.exclusions.length} exclusiones detectadas`
                    : '';
                yield (0, notification_controller_1.createNotification)(userId, `Revisión de Normativa: ${oit.oitNumber}`, `Resultado: ${result.compliant ? 'CUMPLE' : 'NO CUMPLE'} (Score: ${result.score}/100)${exclusionNote}`, result.compliant ? 'SUCCESS' : 'WARNING', oitId);
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
