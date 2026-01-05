import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AIService } from '../services/ai.service';
const aiService = new AIService();
import { createNotification } from './notification.controller';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

const prisma = new PrismaClient();

// Accept Planning Proposal
export const acceptPlanning = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { templateId } = req.body;

        // Get OIT with aiData to extract assigned resources
        const existingOit = await prisma.oIT.findUnique({ where: { id } });


        const oit = await prisma.oIT.update({
            where: { id },
            data: {
                planningAccepted: true,
                selectedTemplateIds: templateId ? JSON.stringify([templateId]) : null,
                status: 'SCHEDULED'
            }
        });

        // Update resource statuses if there are assigned resources
        if (existingOit?.aiData) {
            try {
                const aiData = JSON.parse(existingOit.aiData);
                if (aiData?.data?.assignedResources && Array.isArray(aiData.data.assignedResources)) {
                    // Update each resource status to IN_USE
                    for (const resource of aiData.data.assignedResources) {
                        if (resource.id) {
                            await prisma.resource.update({
                                where: { id: resource.id },
                                data: { status: 'IN_USE' }
                            });
                            console.log(`Resource ${resource.name} set to IN_USE for OIT ${oit.oitNumber}`);
                        }
                    }
                }
            } catch (parseError) {
                console.error('Error parsing aiData for resource updates:', parseError);
                // Continue even if resource update fails
            }
        }

        // Create notification
        if ((req as any).user?.userId) {
            await prisma.notification.create({
                data: {
                    userId: (req as any).user.userId,
                    oitId: id,
                    title: 'Planeación Aceptada',
                    message: `La propuesta de planeación para OIT ${oit.oitNumber} ha sido aceptada. Recursos asignados y programados.`,
                    type: 'SUCCESS'
                }
            });
        }

        res.json(oit);
    } catch (error) {
        console.error('Error accepting planning:', error);
        res.status(500).json({ error: 'Error al aceptar planeación' });
    }
};

// Reject Planning Proposal
export const rejectPlanning = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const oit = await prisma.oIT.update({
            where: { id },
            data: {
                planningProposal: null,
                planningAccepted: false
            }
        });

        res.json({ message: 'Propuesta rechazada, puede crear una planeación manual', oit });
    } catch (error) {
        console.error('Error rejecting planning:', error);
        res.status(500).json({ error: 'Error al rechazar planeación' });
    }
};

// Save Sampling Data
export const saveSamplingData = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const samplingData = req.body;

        const isComplete = !samplingData.partial && samplingData.completedAt;

        const oit = await prisma.oIT.update({
            where: { id },
            data: {
                samplingData: JSON.stringify(samplingData),
                status: isComplete ? 'IN_PROGRESS' : 'SCHEDULED',
                pendingSync: false
            }
        });

        // Create notification if completed
        if (isComplete && (req as any).user?.userId) {
            await prisma.notification.create({
                data: {
                    userId: (req as any).user.userId,
                    oitId: id,
                    title: 'Muestreo Completado',
                    message: `El muestreo para OIT ${oit.oitNumber} ha sido completado`,
                    type: 'SUCCESS'
                }
            });
        }

        res.json({ success: true, oit });
    } catch (error) {
        console.error('Error saving sampling data:', error);
        res.status(500).json({ error: 'Error al guardar datos de muestreo' });
    }
};

// Submit Final Sampling
export const submitSampling = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const samplingData = req.body; // Full JSON of all steps

        // 1. Update OIT with raw data
        const oit = await prisma.oIT.update({
            where: { id },
            data: {
                samplingData: JSON.stringify(samplingData),
                status: 'ANALYZING', // Temporary status while AI runs
                pendingSync: false
            }
        });

        res.json({ success: true, message: 'Muestreo recibido. Analizando...', oit });

        // 2. Trigger async AI analysis
        (async () => {
            try {
                const analysis = await aiService.analyzeSamplingResults(samplingData, oit.description || '');

                await prisma.oIT.update({
                    where: { id },
                    data: {
                        finalAnalysis: analysis,
                        status: 'COMPLETED' // Flow finished, ready for admin review
                    }
                });

                // Notify user/admin
                // await createNotification(...)
            } catch (err) {
                console.error('Error in background sampling analysis:', err);
                await prisma.oIT.update({
                    where: { id },
                    data: { status: 'REVIEW_IMPORTANT' }
                });
            }
        })();

    } catch (error) {
        console.error('Error submitting sampling:', error);
        res.status(500).json({ error: 'Error al enviar muestreo' });
    }
};

// Get Sampling Data
export const getSamplingData = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const oit = await prisma.oIT.findUnique({ where: { id } });

        if (!oit || !oit.samplingData) {
            return res.status(404).json({ error: 'No hay datos de muestreo' });
        }

        res.json(JSON.parse(oit.samplingData));
    } catch (error) {
        console.error('Error getting sampling data:', error);
        res.status(500).json({ error: 'Error al obtener datos de muestreo' });
    }
};

// Upload Lab Results
// Upload Lab Results
export const uploadLabResults = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const file = (req as any).file;

        if (!file) {
            return res.status(400).json({ error: 'No se proporcionó archivo' });
        }

        // 1. Return immediate response and set status to ANALYZING
        const oit = await prisma.oIT.update({
            where: { id },
            data: {
                labResultsUrl: `uploads/${file.filename}`,
                labResultsAnalysis: null, // Clear previous analysis
                status: 'ANALYZING'
            } as any
        });

        res.json({
            success: true,
            labResultsUrl: file.path,
            status: 'ANALYZING',
            message: 'Resultados subidos. Análisis en curso...'
        });

        // 2. Trigger asynchronous processing
        processLabResultsAsync(id, file.path).catch(err => {
            console.error('Error in background lab processing:', err);
        });

    } catch (error) {
        console.error('Error uploading lab results:', error);
        res.status(500).json({ error: 'Error al subir resultados de laboratorio' });
    }
};

// Background Processor for Lab Results
async function processLabResultsAsync(oitId: string, filePath: string) {
    try {
        console.log(`Starting background lab analysis for OIT ${oitId}`);
        const { pdfService } = require('../services/pdf.service');
        let extractedText = '';

        try {
            if (filePath.endsWith('.pdf')) {
                extractedText = await pdfService.extractText(filePath);
            } else {
                extractedText = fs.readFileSync(filePath, 'utf-8');
            }
        } catch (readErr) {
            console.error("Error extracting text from lab file:", readErr);
            extractedText = "Error al leer documento de laboratorio.";
        }

        // Get OIT Context for better analysis
        const oit = await prisma.oIT.findUnique({ where: { id: oitId } });
        const oitContext = oit?.description || '';

        // Analyze with AI - Now returns text
        const analysis = await aiService.analyzeLabResults(extractedText || "Texto no extraído", oitContext);

        // Update OIT with results - Save as plain text
        await prisma.oIT.update({
            where: { id: oitId },
            data: {
                labResultsAnalysis: analysis, // Save as text, not JSON
                status: analysis.includes('Error') ? 'REVIEW_NEEDED' : 'COMPLETED'
            } as any
        });

        console.log(`Lab analysis completed for OIT ${oitId}`);

        // Automatically generate final report if analysis was successful
        if (!analysis.includes('Error')) {
            console.log(`Triggering automatic report generation for OIT ${oitId}`);
            try {
                await internalGenerateFinalReport(oitId);
                console.log(`Automatic report generation successful for OIT ${oitId}`);
            } catch (reportErr) {
                console.error(`Automatic report generation failed for OIT ${oitId}:`, reportErr);
            }
        }

    } catch (error: any) {
        console.error('Background lab analysis failed:', error);
        await prisma.oIT.update({
            where: { id: oitId },
            data: {
                labResultsAnalysis: "Error interno al procesar resultados. Por favor, revise el documento manualmente.",
                status: 'REVIEW_NEEDED'
            } as any
        });
    }
}

// Reusable report generation logic
async function internalGenerateFinalReport(id: string) {
    const { pdfService } = require('../services/pdf.service');
    const { validationService } = require('../services/validation.service');
    const marked = require('marked');

    console.log(`[Report] Starting generation for OIT ${id}`);
    const oit = await prisma.oIT.findUnique({ where: { id } });
    if (!oit) throw new Error('OIT no encontrada');

    // 1. Extract Lab Text if available
    let labText = '';
    if (oit.labResultsUrl) {
        const uploadsRoot = path.join(__dirname, '../../');
        const potentialPath = oit.labResultsUrl.startsWith('/') ? oit.labResultsUrl : path.join(uploadsRoot, oit.labResultsUrl);
        const potentialPath2 = path.join(uploadsRoot, 'uploads', path.basename(oit.labResultsUrl));

        if (fs.existsSync(potentialPath)) {
            labText = await pdfService.extractText(potentialPath);
        } else if (fs.existsSync(potentialPath2)) {
            labText = await pdfService.extractText(potentialPath2);
        }
    }

    // 2. AI Generation
    // Ensure we have some analysis text even if standard generation fails
    let reportMarkdown = await validationService.generateFinalReportContent(oit, labText);
    if (!reportMarkdown) reportMarkdown = "No se pudo generar el análisis automático.";

    const date = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

    // 3. Try to generate Word report if template exists
    let generatedFileBuffer: Buffer | null = null;
    let generatedFileName = '';
    let isDocx = false;

    try {
        const templateIds = oit.selectedTemplateIds ? JSON.parse(oit.selectedTemplateIds) : [];
        if (templateIds.length > 0) {
            const template = await prisma.samplingTemplate.findUnique({
                where: { id: templateIds[0] }
            });

            if (template && template.reportTemplateFile) {
                console.log(`[Report] Using Word template: ${template.reportTemplateFile}`);
                const { docxService } = require('../services/docx.service');

                // Enhanced Data Mapping for Templates
                const reportContent = reportMarkdown.replace(/[#*`]/g, '');

                const docxData = {
                    // Modern keys
                    oitNumber: oit.oitNumber,
                    description: oit.description || '',
                    location: oit.location || '',
                    date: date,
                    analysis: reportContent,
                    narrative: reportMarkdown,
                    client: oit.description?.split(':')[0]?.trim() || 'Cliente General',

                    // Legacy/Template specific keys (Snake Case)
                    cliente_1: oit.description?.split(':')[0]?.trim() || 'Cliente General',
                    nit_1: '800.123.456-7', // Placeholder/Mock for now or extract from description
                    direccion_1: oit.location || 'Dirección de Proyecto',
                    contacto_1: 'Ing. Responsable',
                    ciudad_1: 'Barranquilla',
                    departamento_1: 'Atlántico',
                    fecha_1: date,
                    fecha_informe: date,

                    // Common var_N placeholders often used in legacy templates for body text
                    var_1: oit.oitNumber,
                    var_2: date,
                    var_3: oit.description || '',
                    var_4: oit.location || '',
                    var_5: reportContent.substring(0, 500) + '...', // Intro
                    var_6: reportContent, // Main body
                    var_10: reportContent, // Analysis/Conclusions often here
                    var_11: reportContent,
                    var_12: reportContent,
                    var_13: reportContent,
                    var_14: reportContent,
                    var_15: reportContent,
                    var_16: reportContent.substring(0, 1000),
                    var_17: 'Conforme', // Placeholder for compliance status
                    var_18: 'N/A',
                    var_19: 'N/A',
                    var_20: 'N/A',

                    // Generic fill for remaining potential vars up to 100 to prevent empty holes
                    ...Array.from({ length: 80 }, (_, i) => ({ [`var_${i + 21}`]: reportContent.substring(0, 50) + '...' })).reduce((a, b) => ({ ...a, ...b }), {}),

                    // Capitalized variations
                    Client: oit.description?.split(':')[0]?.trim() || 'Cliente General',
                    Date: date,
                    Location: oit.location || '',
                    Address: oit.location || '',
                    OIT: oit.oitNumber,
                    Analysis: reportContent,
                    Project: oit.description || 'Monitoreo Ambiental'
                };

                generatedFileBuffer = await docxService.generateDocument(template.reportTemplateFile, docxData);
                generatedFileName = `Informe_Final_${oit.oitNumber}_${Date.now()}.docx`;
                isDocx = true;
                console.log(`[Report] Word document generated successfully: ${generatedFileName}`);
            } else {
                console.log('[Report] No template file configured for this template.');
            }
        }
    } catch (docxErr) {
        console.error('[Report] Word generation error, falling back to PDF:', docxErr);
    }

    if (!isDocx) {
        console.log('[Report] Generating PDF fallback...');
        // Fallback: Convert to HTML & PDF 
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; line-height: 1.6; }
                    h1, h2, h3, h4, h5, h6 { color: #14532d; font-weight: 700; margin-top: 24px; margin-bottom: 12px; }
                    h1 { border-bottom: 2px solid #22c55e; padding-bottom: 12px; font-size: 28px; }
                    h2 { background: #f0fdf4; padding: 10px 15px; border-left: 5px solid #22c55e; font-size: 20px; border-radius: 4px; }
                    h3 { font-size: 18px; color: #15803d; }
                    p { margin-bottom: 15px; text-align: justify; }
                    ul, ol { margin-bottom: 15px; padding-left: 20px; }
                    li { margin-bottom: 6px; }
                    strong { color: #14532d; }
                    table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px; border: 1px solid #bbf7d0; border-radius: 8px; overflow: hidden; }
                    thead { background-color: #dcfce7; color: #14532d; }
                    th { text-align: left; padding: 12px 16px; font-weight: 600; border-bottom: 2px solid #bbf7d0; }
                    td { padding: 10px 16px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
                    tr:nth-child(even) { background-color: #f0fdf4; }
                    .meta { margin-bottom: 40px; font-size: 0.9em; color: #666; border-bottom: 1px solid #eee; padding-bottom: 20px; display: flex; justify-content: space-between; }
                    .footer { margin-top: 50px; font-size: 0.8em; text-align: center; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
                </style>
            </head>
            <body>
                <div class="meta">
                    <div>
                        <strong style="font-size: 1.2em; color: #14532d;">ALS V2 - Informe de Supervisión IA</strong><br>
                        <span style="color: #64748b;">Sistema de Gestión Ambiental</span>
                    </div>
                    <div style="text-align: right;">
                        <strong>OIT:</strong> ${oit.oitNumber}<br>
                        <strong>Fecha:</strong> ${date}
                    </div>
                </div>
                <div class="content">
                    ${marked.parse(reportMarkdown)}
                </div>
                <div class="footer">
                    Este documento ha sido generado automáticamente por el sistema ALS V2.
                </div>
            </body>
            </html>
        `;

        generatedFileName = `Informe_Final_OIT_${oit.oitNumber}_${Date.now()}.pdf`;
        const pdfPath = await pdfService.generatePDFFromHTML(htmlContent, generatedFileName);
        generatedFileBuffer = fs.readFileSync(pdfPath);
    } else {
        // Ensure uploads directory exists
        const uploadsDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        const outputPath = path.join(uploadsDir, generatedFileName);
        fs.writeFileSync(outputPath, generatedFileBuffer!);
    }

    if (!generatedFileBuffer) throw new Error('No se pudo generar el contenido del informe');

    await prisma.oIT.update({
        where: { id },
        data: { finalReportUrl: generatedFileName }
    });

    return { generatedFileBuffer, generatedFileName, isDocx };
}

// Generate Final Report


// Assign Engineers to OIT
export const assignEngineers = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { engineerIds } = req.body; // Array of user IDs

        if (!Array.isArray(engineerIds)) {
            return res.status(400).json({ error: 'engineerIds debe ser un array' });
        }

        // Verify OIT exists
        const oit = await prisma.oIT.findUnique({ where: { id } });
        if (!oit) {
            return res.status(404).json({ error: 'OIT no encontrada' });
        }

        // Remove existing assignments
        await prisma.oITAssignment.deleteMany({
            where: { oitId: id }
        });

        // Create new assignments
        if (engineerIds.length > 0) {
            await prisma.oITAssignment.createMany({
                data: engineerIds.map((userId: string) => ({
                    oitId: id,
                    userId
                }))
            });
        }

        // Get updated OIT with assignments
        const updatedOit = await prisma.oIT.findUnique({
            where: { id },
            include: {
                assignedEngineers: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            }
        });

        res.json({
            success: true,
            assignedEngineers: updatedOit?.assignedEngineers.map((a: any) => a.user) || []
        });
    } catch (error) {
        console.error('Error assigning engineers:', error);
        res.status(500).json({ error: 'Error al asignar ingenieros' });
    }
};

// Get assigned engineers for an OIT
export const getAssignedEngineers = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const assignments = await prisma.oITAssignment.findMany({
            where: { oitId: id },
            include: {
                user: {
                    select: { id: true, name: true, email: true, role: true }
                }
            }
        });

        res.json(assignments.map((a: any) => a.user));
    } catch (error) {
        console.error('Error getting assigned engineers:', error);
        res.status(500).json({ error: 'Error al obtener ingenieros asignados' });
    }
};

// Get all OIT records (filtered by role)
export const getAllOITs = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const userRole = user?.role;
        const userId = user?.userId;

        // If user is ENGINEER, only show OITs assigned to them
        let whereClause: any = {};

        if (userRole === 'ENGINEER' && userId) {
            whereClause = {
                assignedEngineers: {
                    some: {
                        userId: userId
                    }
                }
            };
        }

        const oits = await prisma.oIT.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: {
                assignedEngineers: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            }
        });

        // Map to include engineers in a cleaner format
        const result = oits.map((oit: any) => ({
            ...oit,
            engineers: oit.assignedEngineers.map((a: any) => a.user)
        }));

        res.status(200).json(result);
    } catch (error) {
        console.error('Error in getAllOITs:', error);
        res.status(500).json({ message: 'Something went wrong', error: String(error) });
    }
};

// Get a single OIT by ID
export const getOITById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        const oit = await prisma.oIT.findUnique({
            where: { id },
            include: {
                assignedEngineers: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            }
        });

        if (!oit) {
            return res.status(404).json({ message: 'OIT not found' });
        }

        // If user is ENGINEER, check if they are assigned
        if (user?.role === 'ENGINEER') {
            const isAssigned = oit.assignedEngineers.some((a: any) => a.userId === user.userId);
            if (!isAssigned) {
                return res.status(403).json({ message: 'No tienes acceso a esta OIT' });
            }
        }

        res.status(200).json({
            ...oit,
            engineers: oit.assignedEngineers.map((a: any) => a.user)
        });
    } catch (error) {
        console.error('Error in getOITById:', error);
        res.status(500).json({ message: 'Something went wrong', error: String(error) });
    }
};

/* Existing createOIT (JSON) kept for backward compatibility */
export const createOIT = async (req: Request, res: Response) => {
    try {
        const { oitNumber, description, status } = req.body;
        const oit = await prisma.oIT.create({
            data: {
                oitNumber: oitNumber || '',
                description: description || '',
                status: status || 'PENDING',
            },
        });
        res.status(201).json(oit);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};

// Async creation endpoint that accepts file uploads and triggers background AI processing
export const createOITAsync = async (req: Request, res: Response) => {
    try {
        const { oitNumber, description } = req.body;
        const userId = (req as any).user?.userId; // Cast req to any to access user property

        if (!userId) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        // Generate oitNumber if not provided
        const finalOitNumber = oitNumber || `OIT-${Date.now()}`;

        // Create OIT with UPLOADING status
        const oit = await prisma.oIT.create({
            data: {
                oitNumber: finalOitNumber,
                description: description || 'Análisis en curso...',
                status: 'UPLOADING'
            }
        });

        // Send immediate response
        res.json({
            id: oit.id,
            oitNumber: oit.oitNumber,
            status: 'UPLOADING',
            message: 'OIT creada. Procesando archivos en segundo plano...'
        });

        // Process files asynchronously
        processOITFilesAsync(oit.id, req.files as any, userId).catch(err => {
            console.error('Error processing OIT files:', err);
        });

    } catch (error) {
        console.error('Error creating OIT:', error);
        res.status(500).json({ error: 'Error al crear OIT' });
    }
};

// Separated Analysis Logic
async function runOITAnalysis(oitId: string, oitFilePath: string | null, quotationFilePath: string | null, userId: string) {
    try {
        const { complianceService } = await import('../services/compliance.service');
        const { default: planningService } = await import('../services/planning.service');


        await prisma.oIT.update({
            where: { id: oitId },
            data: { status: 'ANALYZING' }
        });

        const aiDataContent: any = {};
        let extractedDescription: string | null = null;
        let extractedLocation: string | null = null;

        // Analyze OIT File
        if (oitFilePath && fs.existsSync(oitFilePath)) {
            const pdfParse = (await import('pdf-parse')).default;
            const dataBuffer = await fs.promises.readFile(oitFilePath);
            const pdfData = await pdfParse(dataBuffer);
            const oitText = pdfData.text;

            const oitAnalysis = await aiService.analyzeDocument(oitText);
            aiDataContent.oit = oitAnalysis;

            // Extract description
            if ((oitAnalysis as any).description) {
                extractedDescription = (oitAnalysis as any).description;
            } else if (oitText.length > 50) {
                extractedDescription = oitText.substring(0, 200).trim() + '...';
            }

            // Extract location from analysis
            if ((oitAnalysis as any).location) {
                extractedLocation = (oitAnalysis as any).location;
            } else {
                // Fallback: search for common location keywords
                const locationMatch = oitText.match(/(?:Dirección|Ubicación|Lugar|Sitio|Dirección del sitio)[:\s]+([^\n.]{10,150})/i);
                if (locationMatch) {
                    extractedLocation = locationMatch[1].trim();
                }
            }
        }

        // Analyze Quotation File
        if (quotationFilePath && fs.existsSync(quotationFilePath)) {
            const pdfParse = (await import('pdf-parse')).default;
            const dataBuffer = await fs.promises.readFile(quotationFilePath);
            const pdfData = await pdfParse(dataBuffer);
            const quotationText = pdfData.text;
            const quotationAnalysis = await aiService.analyzeDocument(quotationText);
            aiDataContent.quotation = quotationAnalysis;

            // Extract resources
            if ((quotationAnalysis as any).resources) {
                aiDataContent.resources = (quotationAnalysis as any).resources;
            }
        }

        // Update with AI data
        await prisma.oIT.update({
            where: { id: oitId },
            data: {
                description: extractedDescription || undefined, // Only update if found
                location: extractedLocation || undefined,
                aiData: JSON.stringify({
                    valid: true,
                    message: 'Análisis de documentos completado',
                    data: aiDataContent
                }),
                resources: aiDataContent.resources ? JSON.stringify(aiDataContent.resources) : undefined
            }
        });

        // Compliance
        await createNotification(userId, 'Verificando Cumplimiento', 'Analizando normas...', 'INFO', oitId);
        try {
            const complianceResult = await complianceService.checkCompliance(oitId, userId);
            await prisma.oIT.update({
                where: { id: oitId },
                data: { status: 'REVIEW_REQUIRED' }
            });
        } catch (e) {
            console.error('Compliance check error:', e);
            // Fallback: update status anyway so it doesn't get stuck
            await prisma.oIT.update({
                where: { id: oitId },
                data: { status: 'REVIEW_REQUIRED' }
            });
        }

        // Planning
        try {
            await createNotification(userId, 'Generando Propuesta', 'Creando propuesta de planeación...', 'INFO', oitId);
            const proposal = await planningService.generateProposal(oitId);
            await createNotification(userId, 'Propuesta Lista', `Propuesta generada con plantilla "${proposal.templateName}"`, 'SUCCESS', oitId);
        } catch (e) { console.error(e); }

        await createNotification(userId, 'OIT Procesada', 'Análisis completado exitosamente.', 'SUCCESS', oitId);

    } catch (error) {
        console.error('Error in runOITAnalysis:', error);
        await prisma.oIT.update({ where: { id: oitId }, data: { status: 'PENDING' } });
        await createNotification(userId, 'Error al Procesar', 'Falló el análisis de la OIT.', 'ERROR', oitId);
    }
}

async function processOITFilesAsync(
    oitId: string,
    files: { oitFile?: Express.Multer.File[], quotationFile?: Express.Multer.File[] },
    userId: string
) {
    const oitFile = files?.oitFile?.[0];
    const quotationFile = files?.quotationFile?.[0];

    let updateData: any = { status: 'ANALYZING' };
    if (oitFile) updateData.oitFileUrl = `/uploads/${oitFile.filename}`;
    if (quotationFile) updateData.quotationFileUrl = `/uploads/${quotationFile.filename}`;

    await prisma.oIT.update({
        where: { id: oitId },
        data: updateData
    });

    // Run analysis using physical paths
    await runOITAnalysis(
        oitId,
        oitFile ? oitFile.path : null,
        quotationFile ? quotationFile.path : null,
        userId
    );
}

// Re-analyze Endpoint
export const reanalyzeOIT = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.userId;

        const oit = await prisma.oIT.findUnique({ where: { id } });
        if (!oit) return res.status(404).json({ error: 'OIT not found' });

        // Resolve absolute paths
        const uploadsRoot = path.join(__dirname, '../../');
        let oitPath = null;
        let quotationPath = null;

        if (oit.oitFileUrl) {
            // Handle both relative URL (/uploads/file) and stored filenames
            const cleanPath = oit.oitFileUrl.replace(/^\//, '').replace(/\\/g, '/'); // Remove leading slash
            oitPath = path.join(uploadsRoot, cleanPath);
            // Fallback if not found (sometimes stored simply as uploads/file)
            if (!fs.existsSync(oitPath)) {
                oitPath = path.join(uploadsRoot, 'uploads', path.basename(oit.oitFileUrl));
            }
        }

        if (oit.quotationFileUrl) {
            const cleanPath = oit.quotationFileUrl.replace(/^\//, '').replace(/\\/g, '/');
            quotationPath = path.join(uploadsRoot, cleanPath);
            if (!fs.existsSync(quotationPath)) {
                quotationPath = path.join(uploadsRoot, 'uploads', path.basename(oit.quotationFileUrl));
            }
        }

        // Trigger Async Analysis
        runOITAnalysis(id, oitPath, quotationPath, userId).catch(err => console.error("Re-analysis error:", err));

        res.json({ message: 'Re-análisis iniciado correctamente.' });

    } catch (error) {
        console.error('Error re-analyzing:', error);
        res.status(500).json({ error: 'Error al iniciar re-análisis' });
    }
};

// Update OIT (supports new fields and engineer assignment)
export const updateOIT = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { oitNumber, description, status, oitFileUrl, quotationFileUrl, aiData, resources, engineerIds } = req.body;
        const data: any = {};
        if (oitNumber !== undefined) data.oitNumber = oitNumber;
        if (description !== undefined) data.description = description;
        if (status !== undefined) data.status = status;
        if (oitFileUrl !== undefined) data.oitFileUrl = oitFileUrl;
        if (quotationFileUrl !== undefined) data.quotationFileUrl = quotationFileUrl;
        if (aiData !== undefined) data.aiData = aiData;
        if (resources !== undefined) data.resources = resources;
        if (resources !== undefined) data.resources = resources;
        if (req.body.scheduledDate !== undefined) data.scheduledDate = req.body.scheduledDate;

        // Handle selectedTemplateIds (expecting array from client)
        if (req.body.selectedTemplateIds !== undefined) {
            data.selectedTemplateIds = Array.isArray(req.body.selectedTemplateIds)
                ? JSON.stringify(req.body.selectedTemplateIds)
                : req.body.selectedTemplateIds; // If already string or null
        }

        // Get the existing OIT to check for status change and current assignments
        const existing = await prisma.oIT.findUnique({
            where: { id },
            include: { assignedEngineers: true }
        });

        if (!existing) {
            return res.status(404).json({ error: 'OIT no encontrada' });
        }

        // Validate mandatory engineer assignment when scheduling
        if (status === 'SCHEDULED') {
            const hasNewEngineers = engineerIds && Array.isArray(engineerIds) && engineerIds.length > 0;
            const hasExistingEngineers = existing.assignedEngineers.length > 0;

            // If neither new engineers are provided nor existing ones are present (and we aren't clearing them with empty array)
            const willHaveEngineers = hasNewEngineers || (hasExistingEngineers && engineerIds === undefined);

            if (!willHaveEngineers) {
                return res.status(400).json({
                    error: 'Debe asignar al menos un ingeniero de campo para programar la visita.'
                });
            }
        }

        // Transaction to update OIT and assignments
        const result = await prisma.$transaction(async (prisma: any) => {
            // 1. Update OIT fields
            const updated = await prisma.oIT.update({
                where: { id },
                data,
            });

            // 2. Update assignments if provided
            if (engineerIds && Array.isArray(engineerIds)) {
                // Remove existing
                await prisma.oITAssignment.deleteMany({
                    where: { oitId: id }
                });

                // Add new
                if (engineerIds.length > 0) {
                    await prisma.oITAssignment.createMany({
                        data: engineerIds.map((userId: string) => ({
                            oitId: id,
                            userId
                        }))
                    });
                }
            }

            return updated;
        });

        // Create notification on status change (reuse existing logic)
        if (status && existing.status !== status) {
            const userId = (req as any).user?.userId;
            if (userId) {
                const statusMessages: Record<string, { title: string; message: string; type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' }> = {
                    'REVIEW_REQUIRED': {
                        title: 'Revisión Requerida',
                        message: `OIT ${result.oitNumber} requiere revisión. Se encontraron observaciones en el análisis.`,
                        type: 'WARNING'
                    },
                    'SCHEDULED': {
                        title: 'Muestreo Agendado',
                        message: `OIT ${result.oitNumber} ha sido agendado para muestreo.`,
                        type: 'SUCCESS'
                    },
                    'IN_PROGRESS': {
                        title: 'Muestreo en Progreso',
                        message: `OIT ${result.oitNumber} está en proceso de muestreo.`,
                        type: 'INFO'
                    },
                    'COMPLETED': {
                        title: 'OIT Completado',
                        message: `OIT ${result.oitNumber} ha sido completado exitosamente.`,
                        type: 'SUCCESS'
                    }
                };

                const notificationData = statusMessages[status];
                if (notificationData) {
                    await createNotification(
                        userId,
                        notificationData.title,
                        notificationData.message,
                        notificationData.type,
                        id
                    );
                }
            }
        }

        // Return updated object with engineers
        const finalOit = await prisma.oIT.findUnique({
            where: { id },
            include: {
                assignedEngineers: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            }
        });

        res.status(200).json({
            ...finalOit,
            engineers: finalOit?.assignedEngineers.map((a: any) => a.user)
        });

    } catch (error) {
        console.error('Error updating OIT:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

export const deleteOIT = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.oIT.delete({ where: { id } });
        res.status(200).json({ message: 'OIT deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};

export const checkCompliance = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        // Import dynamically to avoid potential circular dependency issues if any
        const { complianceService } = require('../services/compliance.service');

        const result = await complianceService.checkCompliance(id, userId);
        res.json(result);
    } catch (error) {
        console.error('Error checking compliance:', error);
        res.status(500).json({ error: 'Error al verificar cumplimiento' });
    }
};

// Validate Sampling Step Data
export const validateStepData = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { stepIndex, stepDescription, stepRequirements, data } = req.body;

        console.log('--- VALIDATE STEP START ---');
        console.log('OIT ID:', id);
        console.log('Step Index:', stepIndex);
        console.log('Step Description:', stepDescription);
        console.log('Data recieved payload:', JSON.stringify(data, null, 2));
        console.log('Req Body keys:', Object.keys(req.body));

        if (!data) {
            console.error('MISSING DATA IN REQUEST BODY');
            return res.status(400).json({ error: 'Faltan datos para validar' });
        }

        const { validationService } = require('../services/validation.service');

        // Validate the step data using AI
        const validationResult = await validationService.validateStepData(
            stepDescription,
            stepRequirements,
            data
        );

        // Update OIT with validation result
        const oit = await prisma.oIT.findUnique({ where: { id } });
        if (!oit) {
            return res.status(404).json({ error: 'OIT no encontrada' });
        }

        // Parse existing validations
        const stepValidations = oit.stepValidations ? JSON.parse(oit.stepValidations) : {};
        stepValidations[stepIndex] = {
            validated: validationResult.validated,
            feedback: validationResult.feedback,
            confidence: validationResult.confidence,
            data: data,
            timestamp: new Date().toISOString()
        };

        // Update progress if validated
        let samplingProgress = oit.samplingProgress ? JSON.parse(oit.samplingProgress) : { currentStep: 0, completedSteps: [] };
        if (validationResult.validated) {
            if (!samplingProgress.completedSteps.includes(stepIndex)) {
                samplingProgress.completedSteps.push(stepIndex);
            }
            samplingProgress.currentStep = stepIndex + 1;
        }

        await prisma.oIT.update({
            where: { id },
            data: {
                stepValidations: JSON.stringify(stepValidations),
                samplingProgress: JSON.stringify(samplingProgress)
            }
        });

        res.json(validationResult);
    } catch (error) {
        console.error('Error validating step:', error);
        res.status(500).json({ error: 'Error al validar el paso' });
    }
};

// Finalize Sampling and Generate Analysis
export const finalizeSampling = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const oit = await prisma.oIT.findUnique({ where: { id } });
        if (!oit) {
            return res.status(404).json({ error: 'OIT no encontrada' });
        }

        // Verify all steps are completed
        const samplingProgress = oit.samplingProgress ? JSON.parse(oit.samplingProgress) : null;
        const stepValidations = oit.stepValidations ? JSON.parse(oit.stepValidations) : {};
        const aiData = oit.aiData ? JSON.parse(oit.aiData) : {};
        const steps = aiData?.data?.steps || [];

        if (!samplingProgress || samplingProgress.completedSteps.length !== steps.length) {
            return res.status(400).json({ error: 'No todos los pasos están completados' });
        }

        // Prepare data for analysis
        const allStepsData = steps.map((step: any, index: number) => ({
            step: step.description || `Paso ${index + 1}`,
            data: stepValidations[index]?.data || {},
            validation: stepValidations[index] || {}
        }));

        const { validationService } = require('../services/validation.service');

        // Generate final analysis
        const finalAnalysis = await validationService.generateFinalAnalysis(
            oit.oitNumber,
            aiData?.data?.selectedTemplate || 'Plantilla',
            allStepsData
        );

        // Update OIT with final analysis and status
        await prisma.oIT.update({
            where: { id },
            data: {
                finalAnalysis,
                status: 'COMPLETED'
            }
        });

        // Release Resources (Set to AVAILABLE)
        // Check both oit.resources and aiData.data.assignedResources for consistency
        const resourceIdsToRelease: string[] = [];

        if (oit.resources) {
            try {
                const resources = JSON.parse(oit.resources);
                const ids = Array.isArray(resources)
                    ? resources.map((r: any) => typeof r === 'string' ? r : r.id).filter(Boolean)
                    : [];
                resourceIdsToRelease.push(...ids);
            } catch (e) { }
        }

        // Also check aiData.data.assignedResources
        if (aiData?.data?.assignedResources && Array.isArray(aiData.data.assignedResources)) {
            for (const resource of aiData.data.assignedResources) {
                if (resource.id && !resourceIdsToRelease.includes(resource.id)) {
                    resourceIdsToRelease.push(resource.id);
                }
            }
        }

        if (resourceIdsToRelease.length > 0) {
            await prisma.resource.updateMany({
                where: { id: { in: resourceIdsToRelease } },
                data: { status: 'AVAILABLE' }
            });
            console.log(`Released ${resourceIdsToRelease.length} resources for OIT ${oit.oitNumber}`);
        }

        res.json({
            success: true,
            analysis: finalAnalysis
        });
    } catch (error) {
        console.error('Error finalizing sampling:', error);
        res.status(500).json({ error: 'Error al finalizar el muestreo' });
    }
};

// Generate Sampling Report PDF
export const generateSamplingReport = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const oit = await prisma.oIT.findUnique({ where: { id } });
        if (!oit) {
            return res.status(404).json({ error: 'OIT no encontrada' });
        }

        if (!oit.finalAnalysis) {
            return res.status(400).json({ error: 'El muestreo no ha sido finalizado' });
        }

        // Import PDF service
        const { pdfService } = require('../services/pdf.service');

        // Generate PDF
        const pdfPath = await pdfService.generateSamplingReport(oit);

        // Update OIT with report URL
        await prisma.oIT.update({
            where: { id },
            data: {
                samplingReportUrl: pdfPath
            }
        });

        // Send PDF file
        res.download(pdfPath, `Informe_Muestreo_${oit.oitNumber}.pdf`);
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Error al generar el informe PDF' });
    }
};

export const generateFinalReport = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { generatedFileBuffer, generatedFileName, isDocx } = await internalGenerateFinalReport(id);

        res.setHeader('Content-Disposition', `attachment; filename=${generatedFileName}`);
        res.setHeader('Content-Type', isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf');
        res.send(generatedFileBuffer);

    } catch (error) {
        console.error('Final Report Error:', error);
        res.status(500).json({ error: 'Error generando informe final' });
    }
};


// Update Resources in Planning Proposal
export const updatePlanningResources = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { resourceIds } = req.body;

        if (!Array.isArray(resourceIds)) {
            return res.status(400).json({ error: 'resourceIds debe ser un array' });
        }

        const oit = await prisma.oIT.findUnique({ where: { id } });
        if (!oit) return res.status(404).json({ error: 'OIT no encontrada' });

        // Fetch details of selected resources
        const selectedResources = await prisma.resource.findMany({
            where: { id: { in: resourceIds } }
        });

        const mappedResources = selectedResources.map(r => {
            const res = r as any;
            return {
                id: res.id,
                name: res.name,
                code: res.code,
                type: res.type,
                brand: res.brand,
                model: res.model
            };
        });

        // Update planningProposal
        let planningProposal: any = {};
        if (oit.planningProposal) {
            try {
                planningProposal = JSON.parse(oit.planningProposal);
            } catch (e) { }
        }
        planningProposal.assignedResources = mappedResources;

        // Update aiData too for consistency in UI
        let aiData: any = {};
        if (oit.aiData) {
            try {
                aiData = JSON.parse(oit.aiData);
                if (aiData.data) {
                    aiData.data.assignedResources = mappedResources;
                }
            } catch (e) { }
        }

        await prisma.oIT.update({
            where: { id },
            data: {
                planningProposal: JSON.stringify(planningProposal),
                aiData: JSON.stringify(aiData)
            }
        });

        res.json({ success: true, resources: mappedResources });
    } catch (error) {
        console.error('Error updating planning resources:', error);
        res.status(500).json({ error: 'Error al actualizar recursos' });
    }
};
