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

        // Fetch all quotation-related standards from database
        console.log(`[Quotation] Fetching standards from database...`);
        const standards = await prisma.standard.findMany({
            where: {
                OR: [
                    { type: 'QUOTATION' },
                    { type: 'OIT' }, // Also include OIT standards as they may apply
                    { category: { in: ['agua_potable', 'vertimientos', 'ruido', 'aire', 'general', 'decreto'] } }
                ]
            },
            take: 10 // Limit to avoid token overflow
        });

        console.log(`[Quotation] Found ${standards.length} applicable standards`);

        // Build standards content for AI prompt
        const standardsContent = standards.map(s => {
            const content = s.content ? s.content.substring(0, 8000) : '';
            return `
### ${s.title}
**Categoría:** ${s.category || 'general'}
**Tipo:** ${s.type}
${content || s.description}
`;
        }).join('\n---\n');

        // Build compliance check prompt
        const systemPrompt = `Eres un Auditor de Calidad Ambiental experto en normativa colombiana. 
Tu tarea es verificar que las cotizaciones de servicios ambientales cumplan con la normativa vigente.
Debes ser ESTRICTO y reportar TODOS los errores o incumplimientos encontrados.`;

        const prompt = `
## COTIZACIÓN A VERIFICAR
${extractedText.substring(0, 15000)}

## NORMAS APLICABLES
${standardsContent || 'No hay normas configuradas en el sistema.'}

## INSTRUCCIONES DE VERIFICACIÓN
Analiza la cotización contra las normas y verifica:

1. **PARÁMETROS OBLIGATORIOS**: ¿Incluye todos los parámetros/análisis que exige la normativa?
2. **MÉTODOS DE ANÁLISIS**: ¿Los métodos mencionados son los correctos según las normas?
3. **REQUISITOS LEGALES**: ¿Cumple con los requisitos legales colombianos?
4. **EXCLUSIONES**: Si hay exclusiones, ¿son válidas o violan la normativa?
5. **INFORMACIÓN COMPLETA**: ¿Tiene toda la información requerida (cliente, alcance, etc.)?

## RESPONDE ÚNICAMENTE EN JSON VÁLIDO:
{
  "compliant": true/false,
  "score": 0-100,
  "summary": "Resumen ejecutivo del análisis de cumplimiento",
  "appliedStandards": ["lista de normas verificadas"],
  "issues": [
    {
      "severity": "CRITICAL/WARNING/INFO",
      "category": "categoria del problema",
      "description": "descripción detallada del incumplimiento",
      "normReference": "referencia a la norma incumplida",
      "recommendation": "cómo corregirlo"
    }
  ],
  "compliantItems": ["lista de requisitos que SÍ cumple"],
  "missingParameters": ["parámetros/análisis que faltan según la norma"],
  "exclusions": ["exclusiones detectadas en la cotización"],
  "recommendations": ["recomendaciones generales"]
}

IMPORTANTE: Si encuentras errores o incumplimientos, debes listarlos TODOS en "issues" con detalle.
Si la cotización NO cumple, "compliant" debe ser false y "score" bajo.
`.trim();

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

        console.log(`[Quotation] Compliance check complete for ${quotationId}. Status: ${finalStatus}, Score: ${complianceResult.score}/100`);

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

