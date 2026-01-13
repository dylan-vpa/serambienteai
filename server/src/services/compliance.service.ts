import { PrismaClient } from '@prisma/client';
import { aiService } from './ai.service';
import { createNotification } from '../controllers/notification.controller';
import * as fs from 'fs';
import { pdfService } from './pdf.service';

const prisma = new PrismaClient();

// Category mapping for OIT types
const OIT_TYPE_CATEGORIES: Record<string, string[]> = {
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

export class ComplianceService {

    /**
     * Detect OIT type from aiData or description
     */
    private detectOitType(oit: any): string {
        const aiData = oit.aiData ? JSON.parse(oit.aiData) : {};
        const description = (oit.description || '').toLowerCase();
        const oitType = (aiData.tipoMuestreo || aiData.tipo || '').toLowerCase();

        const combined = `${description} ${oitType}`;

        if (combined.includes('agua potable') || combined.includes('potable')) return 'AGUA_POTABLE';
        if (combined.includes('vertimiento')) return 'VERTIMIENTOS';
        if (combined.includes('marina') || combined.includes('mar')) return 'AGUAS_MARINAS';
        if (combined.includes('residual')) return 'AGUAS_RESIDUALES';
        if (combined.includes('piscina')) return 'PISCINA';
        if (combined.includes('ruido')) return 'RUIDO';
        if (combined.includes('aire') || combined.includes('atmosféric')) return 'AIRE';
        if (combined.includes('fuente fija') || combined.includes('chimenea') || combined.includes('emisión')) return 'FUENTES_FIJAS';
        if (combined.includes('reuso') || combined.includes('reúso')) return 'REUSO';

        return 'DEFAULT';
    }

    /**
     * Get applicable standards based on OIT type
     */
    private async getApplicableStandards(oitType: string): Promise<any[]> {
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
    }

    /**
     * Extract text from quotation PDF
     */
    private async extractQuotationContent(quotationFileUrl: string | null): Promise<string> {
        console.log(`[Compliance] Received quotation path: ${quotationFileUrl}`);

        if (!quotationFileUrl) return '';

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
            return await pdfService.extractText(filePath);
        } catch (error) {
            console.error('Error extracting quotation:', error);
            return '';
        }
    }

    /**
     * Build standards content for prompt - FULL content, no truncation
     */
    private buildStandardsContent(standards: any[]): string {
        return standards.map(s => {
            return `
### NORMA: ${s.title}
**Categoría:** ${s.category || 'general'}
**Contenido Normativo Completo:**
${s.content || s.description || 'Sin contenido'}
`;
        }).join('\n---\n');
    }

    async checkCompliance(oitId: string, userId: string) {
        const oit = await prisma.oIT.findUnique({
            where: { id: oitId }
        });

        if (!oit) {
            throw new Error('OIT not found');
        }

        // Detect OIT type
        const oitType = this.detectOitType(oit);
        console.log(`📋 OIT Type detected: ${oitType}`);

        // Get applicable standards based on OIT type
        const standards = await this.getApplicableStandards(oitType);
        console.log(`📚 Applicable standards: ${standards.length}`);

        if (standards.length === 0) {
            await createNotification(
                userId,
                'Sin Normas Configuradas',
                'No hay normas configuradas para este tipo de OIT.',
                'INFO',
                oitId
            );

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
        const quotationContent = await this.extractQuotationContent(oit.quotationFileUrl);
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
            const aiResponse = await aiService.chat(prompt);

            let result;
            try {
                const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
                result = JSON.parse(jsonStr);
            } catch (e) {
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

            await createNotification(
                userId,
                `Revisión de Normativa: ${oit.oitNumber}`,
                `Resultado: ${result.compliant ? 'CUMPLE' : 'NO CUMPLE'} (Score: ${result.score}/100)${exclusionNote}`,
                result.compliant ? 'SUCCESS' : 'WARNING',
                oitId
            );

            return result;

        } catch (error) {
            console.error('Compliance check error:', error);
            throw error;
        }
    }
}

export const complianceService = new ComplianceService();
