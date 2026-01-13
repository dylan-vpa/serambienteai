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
        const systemPrompt = `Eres un Auditor de Calidad Ambiental EXTREMADAMENTE ESTRICTO y experto en normativa colombiana.
Tu trabajo es encontrar ABSOLUTAMENTE TODOS los errores, omisiones e incumplimientos en las cotizaciones.
NO debes ser permisivo. Si algo no está explícitamente correcto, DEBES marcarlo como error.
Cada norma tiene requisitos específicos que DEBEN cumplirse al 100%.

REGLA CRÍTICA: DEBES listar TODOS los errores encontrados SIN EXCEPCIÓN.
NO te detengas después de encontrar algunos errores. Revisa CADA norma y CADA requisito.
Si hay 50 errores, lista los 50. Si hay 100, lista los 100. NO HAY LÍMITE.
El usuario necesita ver TODOS los problemas para poder corregirlos.`;

        const prompt = `
## COTIZACIÓN A VERIFICAR (CONTENIDO COMPLETO)
${extractedText}

## TODAS LAS NORMAS APLICABLES (${standards.length} normas)
${standardsContent || 'No hay normas configuradas en el sistema.'}

## INSTRUCCIONES DE VERIFICACIÓN - LEE CON CUIDADO

REGLA CRÍTICA: SOLO verifica contra las normas que LA COTIZACIÓN MENCIONA.
- Busca la sección "Documentos de referencia" o "Normativa aplicable" en la cotización
- SOLO esas normas son las que debes usar para verificar cumplimiento
- Ignora las otras normas que te proporcioné si NO están mencionadas en la cotización
- Si la cotización dice "según Resolución 2115 de 2007", SOLO verificas contra esa norma

PROCESO DE VERIFICACIÓN:
1. PRIMERO: Identifica qué normas menciona la cotización en "Documentos de referencia"
2. SEGUNDO: De las normas que te proporcioné, usa SOLO las que coinciden con las mencionadas en la cotización
3. TERCERO: Extrae los parámetros que la cotización SÍ incluye
4. CUARTO: Compara solo contra los requisitos de las normas REFERENCIADAS en la cotización
5. QUINTO: Reporta errores SOLO si la norma REFERENCIADA exige algo que NO está en la cotización

EJEMPLO:
- La cotización en "Documentos de referencia" menciona: "Resolución 2115 de 2007, Decreto 1575"
- SOLO verificas contra esas dos normas, aunque tengas 30 normas en el sistema
- Si el Decreto 1594 exige algo, NO lo reportas como error porque no está referenciado en la cotización

REGLA ANTI-ALUCINACIÓN:
- NO inventes errores
- Si un parámetro ESTÁ en la cotización, NO lo reportes como faltante
- SOLO usa normas MENCIONADAS en la cotización
- Es mejor reportar menos errores pero REALES, que muchos inventados

## RESPONDE ÚNICAMENTE EN JSON VÁLIDO:
{
  "compliant": true/false,
  "score": 0-100,
  "summary": "Resumen ejecutivo detallado del análisis de cumplimiento",
  "appliedStandards": ["lista completa de normas verificadas"],
  "issues": [
    {
      "severity": "CRITICAL/WARNING/INFO",
      "category": "Parámetros Faltantes / Métodos Incorrectos / Límites / Muestreo / Acreditación / Exclusiones / Información",
      "parameter": "NOMBRE EXACTO del parámetro afectado (ej: 'pH', 'DBO5', 'Coliformes Totales', 'Sólidos Suspendidos')",
      "description": "Descripción ESPECÍFICA: El parámetro [X] exigido por [norma] no está incluido en la cotización",
      "normReference": "Nombre EXACTO de la norma + artículo/numeral (ej: 'Resolución 2115 de 2007, Artículo 7, Tabla 2')",
      "location": "Dónde debería aparecer en la cotización (ej: 'Sección de análisis fisicoquímicos', 'Tabla de parámetros')",
      "recommendation": "Acción ESPECÍFICA: Agregar el parámetro [X] con método [Y] según norma [Z]"
    }
  ],
  "compliantItems": ["Lista de requisitos que SÍ cumple con el parámetro específico"],
  "missingParameters": [
    {
      "parameter": "NOMBRE EXACTO del parámetro faltante",
      "norm": "Norma que lo exige",
      "article": "Artículo/numeral específico",
      "requiredMethod": "Método de análisis requerido si aplica"
    }
  ],
  "exclusions": ["exclusiones detectadas en la cotización y si son válidas según la normativa"],
  "recommendations": ["Recomendaciones ESPECÍFICAS con nombres de parámetros y normas"]
}

REGLAS DE ESPECIFICIDAD:
1. NUNCA uses frases genéricas como "faltan algunos parámetros" - SIEMPRE lista cada parámetro por nombre
2. SIEMPRE incluye el nombre EXACTO de la norma y el artículo/numeral específico
3. SIEMPRE indica el nombre EXACTO del parámetro faltante (pH, DBO5, SST, etc.)
4. SIEMPRE indica el método de análisis esperado si la norma lo especifica
5. En "recommendation" SIEMPRE di EXACTAMENTE qué agregar y cómo

EJEMPLO DE ISSUE CORRECTO:
{
  "severity": "CRITICAL",
  "category": "Parámetros Faltantes",
  "parameter": "Coliformes Fecales",
  "description": "El parámetro 'Coliformes Fecales' exigido por la Resolución 2115 de 2007 para agua potable no está incluido en la cotización",
  "normReference": "Resolución 2115 de 2007, Artículo 11, Tabla 4 - Características Microbiológicas",
  "location": "Debería aparecer en la sección de análisis microbiológicos de la cotización",
  "recommendation": "Agregar análisis de Coliformes Fecales con método NMP o Filtración por Membrana según Standard Methods 9221"
}

IMPORTANTE: 
- Score 100 SOLO si cumple ABSOLUTAMENTE TODO según TODAS las normas
- Score 80-99 si tiene issues menores (WARNING/INFO)
- Score 50-79 si tiene algunos CRITICAL pero es parcialmente conforme
- Score <50 si tiene múltiples CRITICAL o fallas graves
- Si encuentras problemas, "compliant" DEBE ser false
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

