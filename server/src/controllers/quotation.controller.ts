import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Get all quotations
export const getQuotations = async (req: Request, res: Response) => {
    try {
        const quotations = await prisma.quotation.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                linkedOITs: {
                    select: { id: true, oitNumber: true, status: true }
                }
            }
        });
        res.json(quotations);
    } catch (error) {
        console.error('Error fetching quotations:', error);
        res.status(500).json({ error: 'Error al obtener cotizaciones' });
    }
};

// Get single quotation by ID
export const getQuotation = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const quotation = await prisma.quotation.findUnique({
            where: { id },
            include: {
                linkedOITs: {
                    select: { id: true, oitNumber: true, status: true, description: true }
                }
            }
        });

        if (!quotation) {
            return res.status(404).json({ error: 'Cotización no encontrada' });
        }

        res.json(quotation);
    } catch (error) {
        console.error('Error fetching quotation:', error);
        res.status(500).json({ error: 'Error al obtener cotización' });
    }
};

// Create new quotation
export const createQuotation = async (req: Request, res: Response) => {
    try {
        const { quotationNumber, description, clientName } = req.body;
        const file = req.file;

        // Generate quotation number if not provided
        const finalQuotationNumber = quotationNumber || `COT-${Date.now()}`;

        // Store file URL with /uploads/ prefix for consistency
        const fileUrl = file ? `/uploads/${file.filename}` : undefined;

        const quotation = await prisma.quotation.create({
            data: {
                quotationNumber: finalQuotationNumber,
                description,
                clientName,
                fileUrl,
                status: file ? 'ANALYZING' : 'PENDING'
            }
        });

        res.status(201).json(quotation);

        // Trigger analysis in background if file was uploaded
        if (file && fileUrl) {
            runQuotationAnalysis(quotation.id, fileUrl).catch(err => {
                console.error('Error in background quotation analysis:', err);
            });
        }
    } catch (error) {
        console.error('Error creating quotation:', error);
        res.status(500).json({ error: 'Error al crear cotización' });
    }
};

// Update quotation
export const updateQuotation = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { quotationNumber, description, clientName, status } = req.body;
        const file = req.file;

        const data: any = {};
        if (quotationNumber) data.quotationNumber = quotationNumber;
        if (description !== undefined) data.description = description;
        if (clientName !== undefined) data.clientName = clientName;
        if (status) data.status = status;

        let shouldReanalyze = false;
        if (file) {
            data.fileUrl = `/uploads/${file.filename}`;
            data.status = 'ANALYZING';
            shouldReanalyze = true;
        }

        const quotation = await prisma.quotation.update({
            where: { id },
            data
        });

        res.json(quotation);

        // Trigger re-analysis if file was updated
        if (shouldReanalyze && quotation.fileUrl) {
            runQuotationAnalysis(id, quotation.fileUrl).catch(err => {
                console.error('Error in background quotation re-analysis:', err);
            });
        }
    } catch (error) {
        console.error('Error updating quotation:', error);
        res.status(500).json({ error: 'Error al actualizar cotización' });
    }
};

// Delete quotation
export const deleteQuotation = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Check if quotation is linked to any OITs
        const linkedOITs = await prisma.oIT.count({
            where: { quotationId: id }
        });

        if (linkedOITs > 0) {
            return res.status(400).json({
                error: `No se puede eliminar: esta cotización está vinculada a ${linkedOITs} OIT(s)`
            });
        }

        // Get quotation to delete file
        const quotation = await prisma.quotation.findUnique({ where: { id } });

        if (quotation?.fileUrl) {
            try {
                fs.unlinkSync(quotation.fileUrl);
            } catch (e) {
                console.warn('Could not delete file:', e);
            }
        }

        await prisma.quotation.delete({ where: { id } });
        res.json({ message: 'Cotización eliminada' });
    } catch (error) {
        console.error('Error deleting quotation:', error);
        res.status(500).json({ error: 'Error al eliminar cotización' });
    }
};

// Analyze quotation for compliance
export const analyzeQuotation = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const quotation = await prisma.quotation.findUnique({ where: { id } });
        if (!quotation) {
            return res.status(404).json({ error: 'Cotización no encontrada' });
        }

        if (!quotation.fileUrl) {
            return res.status(400).json({ error: 'La cotización no tiene archivo adjunto para analizar' });
        }

        // Update status to analyzing
        await prisma.quotation.update({
            where: { id },
            data: { status: 'ANALYZING' }
        });

        // Return immediate response
        res.json({
            message: 'Análisis iniciado',
            quotationId: id,
            status: 'ANALYZING'
        });

        // Run analysis in background
        runQuotationAnalysis(id, quotation.fileUrl).catch(err => {
            console.error('Error in background quotation analysis:', err);
        });

    } catch (error) {
        console.error('Error analyzing quotation:', error);
        res.status(500).json({ error: 'Error al analizar cotización' });
    }
};

// Background analysis function
async function runQuotationAnalysis(quotationId: string, fileUrl: string) {
    try {
        console.log(`[Quotation] Starting compliance analysis for ${quotationId}`);

        // Import services
        const { pdfService } = require('../services/pdf.service');
        const { aiService } = require('../services/ai.service');

        // Resolve file path
        const uploadsRoot = path.join(__dirname, '../../');
        let filePath = fileUrl;
        if (!path.isAbsolute(filePath)) {
            filePath = path.join(uploadsRoot, fileUrl.replace(/^\//, ''));
        }
        if (!fs.existsSync(filePath)) {
            filePath = path.join(uploadsRoot, 'uploads', path.basename(fileUrl));
        }

        if (!fs.existsSync(filePath)) {
            console.error(`[Quotation] File not found: ${filePath}`);
            await prisma.quotation.update({
                where: { id: quotationId },
                data: {
                    status: 'REVIEW_REQUIRED',
                    complianceResult: JSON.stringify({
                        error: 'Archivo no encontrado',
                        message: 'No se pudo localizar el archivo de cotización para análisis'
                    })
                }
            });
            return;
        }

        // Extract text from PDF
        console.log(`[Quotation] Extracting text from: ${filePath}`);
        let extractedText = '';
        try {
            extractedText = await pdfService.extractText(filePath);
            console.log(`[Quotation] Extracted ${extractedText.length} characters`);
        } catch (extractError) {
            console.error('[Quotation] Text extraction error:', extractError);
            extractedText = 'Error al extraer texto del documento';
        }

        // Fetch ALL standards from database - no limit
        console.log(`[Quotation] Fetching ALL standards from database...`);
        const standards = await prisma.standard.findMany({
            orderBy: { createdAt: 'desc' }
        });

        console.log(`[Quotation] Found ${standards.length} total standards to verify against`);

        // Build standards content for AI prompt - include FULL content of each standard
        const standardsContent = standards.map(s => {
            return `
### NORMA: ${s.title}
**Categoría:** ${s.category || 'general'}
**Tipo:** ${s.type}
**Descripción:** ${s.description || 'N/A'}
**Contenido Normativo Completo:**
${s.content || 'Sin contenido'}
`;
        }).join('\n---\n');

        // Build EXHAUSTIVE compliance check prompt
        const systemPrompt = `Eres un auditor de calidad que SOLO reporta errores REALES.

REGLA #1: NO INVENTES ERRORES
- Si un parámetro (como pH, DBO, etc.) APARECE en el documento, NO lo reportes como faltante
- Lee el documento COMPLETO antes de decidir qué falta
- Si no estás 100% seguro de que algo falta, NO lo reportes

REGLA #2: NO INVENTES NORMAS
- Solo usa las normas que el documento MENCIONA en "Documentos de referencia"
- Si el documento dice "Resolución 0699", solo verificas contra 0699
- NO uses otras normas aunque las conozcas`;

        const prompt = `
## DOCUMENTO A ANALIZAR
${extractedText}

## NORMAS DISPONIBLES (solo como referencia)
${standardsContent || 'Sin normas configuradas.'}

## INSTRUCCIONES

PASO 1: Lee el documento y encuentra la sección "Documentos de referencia" o "Normativa"
PASO 2: Lista SOLO las normas que el documento menciona (ej: "Resolución 0699")
PASO 3: Lee TODOS los parámetros/análisis que el documento ofrece
PASO 4: Si alguna norma mencionada exige un parámetro que NO está en el documento, repórtalo

⚠️ MUY IMPORTANTE - ANTI-ALUCINACIÓN:
- Si el documento incluye "pH" en su lista de análisis, NO reportes "pH faltante"
- Si el documento incluye "Coliformes", NO reportes "Coliformes faltante"  
- SOLO reporta como faltante algo que REALMENTE no está en el documento
- Si no hay errores reales, responde con "compliant": true y "issues": []

## RESPONDE EN JSON:
{
  "compliant": true si no hay errores reales / false si hay errores,
  "score": 100 si cumple / menos si hay errores reales,
  "summary": "Descripción breve",
  "appliedStandards": ["solo las normas que el DOCUMENTO menciona"],
  "foundParameters": ["lista de parámetros que SÍ encontraste en el documento"],
  "issues": [solo errores REALES - si no hay, dejar vacío],
  "compliantItems": ["requisitos que sí cumple"],
  "missingParameters": [solo parámetros que REALMENTE faltan],
  "recommendations": ["recomendaciones si aplica"]
}

Recuerda: Es mejor reportar 0 errores que inventar errores falsos.

`;

        // Run AI compliance check
        console.log(`[Quotation] Running AI compliance check...`);
        let complianceResult: any;

        try {
            const aiResponse = await aiService.chat(prompt, undefined, systemPrompt);

            // Parse JSON response
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
            complianceResult = JSON.parse(jsonStr);
        } catch (parseError) {
            console.error('[Quotation] Error parsing AI compliance response:', parseError);
            complianceResult = {
                compliant: false,
                score: 0,
                summary: 'Error al analizar la respuesta de la IA.',
                issues: [{
                    severity: 'WARNING',
                    category: 'Sistema',
                    description: 'No se pudo completar el análisis automático',
                    recommendation: 'Revisar manualmente la cotización'
                }],
                recommendations: ['Verificar manualmente el cumplimiento normativo']
            };
        }

        // Ensure required fields
        complianceResult.appliedStandards = complianceResult.appliedStandards || standards.map(s => s.title);
        complianceResult.issues = complianceResult.issues || [];
        complianceResult.analyzedAt = new Date().toISOString();
        complianceResult.standardsCount = standards.length;

        // Determine final status
        let finalStatus = 'REVIEW_REQUIRED';
        if (complianceResult.compliant === true && complianceResult.score >= 80) {
            finalStatus = 'COMPLIANT';
        } else if (complianceResult.compliant === false || complianceResult.score < 50) {
            finalStatus = 'NON_COMPLIANT';
        }

        // Also run general document analysis for additional info
        const generalAnalysis = await aiService.analyzeDocument(extractedText);

        // Update quotation with results
        await prisma.quotation.update({
            where: { id: quotationId },
            data: {
                status: finalStatus,
                extractedText: extractedText.substring(0, 10000),
                aiData: JSON.stringify({
                    ...generalAnalysis,
                    rawResponse: generalAnalysis.rawResponse
                }),
                complianceResult: JSON.stringify(complianceResult)
            }
        });

        console.log(`[Quotation] Compliance check complete for ${quotationId}.Status: ${finalStatus}, Score: ${complianceResult.score}/100`);

    } catch (error: any) {
        console.error(`[Quotation] Analysis failed for ${quotationId}:`, error);
        await prisma.quotation.update({
            where: { id: quotationId },
            data: {
                status: 'REVIEW_REQUIRED',
                complianceResult: JSON.stringify({
                    error: error.message || 'Error desconocido',
                    message: 'El análisis automático falló. Por favor revise manualmente.',
                    issues: [{
                        severity: 'CRITICAL',
                        category: 'Sistema',
                        description: `Error en análisis: ${error.message}`,
                        recommendation: 'Contactar soporte técnico'
                    }]
                })
            }
        });
    }
}

