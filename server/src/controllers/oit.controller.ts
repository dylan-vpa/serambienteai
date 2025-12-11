import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { aiService } from '../services/ai.service';
import { createNotification } from './notification.controller';
import fs from 'fs';

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
                selectedTemplateId: templateId,
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
export const uploadLabResults = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const file = (req as any).file;

        if (!file) {
            return res.status(400).json({ error: 'No se proporcionó archivo' });
        }

        const oit = await prisma.oIT.update({
            where: { id },
            data: {
                labResultsUrl: file.path
            }
        });

        res.json({ success: true, labResultsUrl: file.path, oit });
    } catch (error) {
        console.error('Error uploading lab results:', error);
        res.status(500).json({ error: 'Error al subir resultados de laboratorio' });
    }
};

// Generate Final Report
export const generateFinalReport = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const oit = await prisma.oIT.findUnique({ where: { id } });

        if (!oit) {
            return res.status(404).json({ error: 'OIT no encontrado' });
        }

        if (!oit.labResultsUrl) {
            return res.status(400).json({ error: 'Se requieren resultados de laboratorio' });
        }

        if (!oit.samplingData) {
            return res.status(400).json({ error: 'Se requieren datos de muestreo' });
        }

        // Extract all data
        const pdfParse = (await import('pdf-parse')).default;
        const aiData = oit.aiData ? JSON.parse(oit.aiData as string) : null;
        const samplingData = JSON.parse(oit.samplingData as string);

        // Extract lab results text
        const labBuffer = await fs.promises.readFile(oit.labResultsUrl);
        const labPdfData = await pdfParse(labBuffer);
        const labResultsText = labPdfData.text;

        // Build comprehensive prompt
        const prompt = `
Genera un informe final profesional para una Orden de Inspección y Toma de muestras (OIT).

INFORMACIÓN DEL OIT:
- Número: ${oit.oitNumber}
- Descripción: ${oit.description}

ANÁLISIS INICIAL:
${JSON.stringify(aiData, null, 2)}

DATOS DE MUESTREO:
${JSON.stringify(samplingData, null, 2)}

RESULTADOS DE LABORATORIO:
${labResultsText}

Genera un informe completo que incluya:
1. Resumen ejecutivo
2. Metodología de muestreo
3. Resultados encontrados
4. Análisis y conclusiones
5. Recomendaciones

Formato: Markdown profesional
        `.trim();

        const report = await aiService.chat(prompt);

        // Save report (in production, you'd generate a PDF)
        const reportPath = `uploads/reports/${oit.id}_final_report.md`;
        await fs.promises.mkdir('uploads/reports', { recursive: true });
        await fs.promises.writeFile(reportPath, report);

        const updatedOit = await prisma.oIT.update({
            where: { id },
            data: {
                finalReportUrl: reportPath,
                status: 'COMPLETED'
            }
        });

        // Create notification
        if ((req as any).user?.userId) {
            await prisma.notification.create({
                data: {
                    userId: (req as any).user.userId,
                    oitId: id,
                    title: 'Informe Final Generado',
                    message: `El informe final para OIT ${oit.oitNumber} ha sido generado exitosamente`,
                    type: 'SUCCESS'
                }
            });
        }

        res.json({ success: true, reportUrl: reportPath, oit: updatedOit });
    } catch (error) {
        console.error('Error generating final report:', error);
        res.status(500).json({ error: 'Error al generar informe final' });
    }
};

// Get all OIT records
export const getAllOITs = async (req: Request, res: Response) => {
    try {
        const oits = await prisma.oIT.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.status(200).json(oits);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};

// Get a single OIT by ID
export const getOITById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const oit = await prisma.oIT.findUnique({ where: { id } });
        if (!oit) {
            return res.status(404).json({ message: 'OIT not found' });
        }
        res.status(200).json(oit);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
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

async function processOITFilesAsync(
    oitId: string,
    files: { oitFile?: Express.Multer.File[], quotationFile?: Express.Multer.File[] },
    userId: string
) {
    try {
        const oitFile = files?.oitFile?.[0];
        const quotationFile = files?.quotationFile?.[0];

        let updateData: any = {
            status: 'ANALYZING'
        };

        // Save file URLs
        if (oitFile) {
            updateData.oitFileUrl = `/uploads/${oitFile.filename}`;
        }
        if (quotationFile) {
            updateData.quotationFileUrl = `/uploads/${quotationFile.filename}`;
        }

        await prisma.oIT.update({
            where: { id: oitId },
            data: updateData
        });

        // Process files with AI
        const aiData: any = {};
        let extractedDescription: string | null = null;

        if (oitFile) {
            const pdfParse = (await import('pdf-parse')).default;
            const dataBuffer = await fs.promises.readFile(oitFile.path);
            const pdfData = await pdfParse(dataBuffer);
            const oitText = pdfData.text;
            const oitAnalysis = await aiService.analyzeDocument(oitText);
            aiData.oit = oitAnalysis;

            // Extract description from analysis if available
            if ((oitAnalysis as any).description) {
                extractedDescription = (oitAnalysis as any).description;
            } else if (oitText.length > 50) {
                // Fallback: use first 200 characters of the document
                extractedDescription = oitText.substring(0, 200).trim() + '...';
            }
        }

        if (quotationFile) {
            const pdfParse = (await import('pdf-parse')).default;
            const dataBuffer = await fs.promises.readFile(quotationFile.path);
            const pdfData = await pdfParse(dataBuffer);
            const quotationText = pdfData.text;
            const quotationAnalysis = await aiService.analyzeDocument(quotationText);
            aiData.quotation = quotationAnalysis;

            // Extract resources
            if ((quotationAnalysis as any).resources) {
                aiData.resources = (quotationAnalysis as any).resources;
            }
        }

        // Update with AI data and extracted description
        await prisma.oIT.update({
            where: { id: oitId },
            data: {
                description: extractedDescription || 'Sin descripción disponible',
                aiData: JSON.stringify(aiData),
                resources: aiData.resources ? JSON.stringify(aiData.resources) : null
            }
        });

        // **AUTOMATIC STANDARDS VERIFICATION**
        // Verify against standards from database
        const { complianceService } = await import('../services/compliance.service');

        await createNotification(
            userId,
            'Verificando Cumplimiento de Normas',
            'Analizando OIT contra normas configuradas...',
            'INFO',
            oitId
        );

        try {
            const complianceResult = await complianceService.checkCompliance(oitId, userId);

            // Update status based on compliance
            await prisma.oIT.update({
                where: { id: oitId },
                data: {
                    status: complianceResult.compliant ? 'REVIEW_REQUIRED' : 'REVIEW_REQUIRED' // Assuming REVIEW_REQUIRED for both cases after initial analysis
                }
            });

        } catch (complianceError) {
            console.error('Error in compliance check:', complianceError);
            // Continue even if compliance check fails
            await prisma.oIT.update({
                where: { id: oitId },
                data: { status: 'REVIEW_REQUIRED' }
            });
        }

        // **AUTOMATIC PLANNING PROPOSAL GENERATION**
        // Generate planning proposal with AI template selection
        try {
            await createNotification(
                userId,
                'Generando Propuesta de Planeación',
                'La IA está seleccionando la mejor plantilla y creando una propuesta...',
                'INFO',
                oitId
            );

            const planningService = await import('../services/planning.service');
            const proposal = await planningService.default.generateProposal(oitId);

            await createNotification(
                userId,
                'Propuesta de Planeación Lista',
                `Se ha generado una propuesta usando la plantilla "${proposal.templateName}". Revísala en la pestaña Agendamiento.`,
                'SUCCESS',
                oitId
            );

        } catch (planningError) {
            console.error('Error generating planning proposal:', planningError);
            // Continue even if planning fails - user can create manually
        }

        // Final notification
        await createNotification(
            userId,
            'OIT Procesada',
            `OIT ${(await prisma.oIT.findUnique({ where: { id: oitId } }))?.oitNumber} ha sido analizada completamente.`,
            'SUCCESS',
            oitId
        );

    } catch (error) {
        console.error('Error in processOITFilesAsync:', error);

        await prisma.oIT.update({
            where: { id: oitId },
            data: { status: 'PENDING' }
        });

        await createNotification(
            userId,
            'Error al Procesar OIT',
            'Ocurrió un error durante el procesamiento. Por favor, intenta de nuevo.',
            'ERROR',
            oitId
        );
    }
}

// Update OIT (supports new fields)
export const updateOIT = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { oitNumber, description, status, oitFileUrl, quotationFileUrl, aiData, resources } = req.body;
        const data: any = {};
        if (oitNumber !== undefined) data.oitNumber = oitNumber;
        if (description !== undefined) data.description = description;
        if (status !== undefined) data.status = status;
        if (oitFileUrl !== undefined) data.oitFileUrl = oitFileUrl;
        if (quotationFileUrl !== undefined) data.quotationFileUrl = quotationFileUrl;
        if (aiData !== undefined) data.aiData = aiData;
        if (resources !== undefined) data.resources = resources;
        if (req.body.scheduledDate !== undefined) data.scheduledDate = req.body.scheduledDate;

        // Get the existing OIT to check for status change
        const existing = await prisma.oIT.findUnique({ where: { id } });

        const updated = await prisma.oIT.update({
            where: { id },
            data,
        });

        // Create notification on status change
        if (status && existing && existing.status !== status) {
            const userId = (req as any).user?.userId;
            if (userId) {
                const statusMessages: Record<string, { title: string; message: string; type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' }> = {
                    'REVIEW_REQUIRED': {
                        title: 'Revisión Requerida',
                        message: `OIT ${updated.oitNumber} requiere revisión. Se encontraron observaciones en el análisis.`,
                        type: 'WARNING'
                    },
                    'SCHEDULED': {
                        title: 'Muestreo Agendado',
                        message: `OIT ${updated.oitNumber} ha sido agendado para muestreo.`,
                        type: 'SUCCESS'
                    },
                    'IN_PROGRESS': {
                        title: 'Muestreo en Progreso',
                        message: `OIT ${updated.oitNumber} está en proceso de muestreo.`,
                        type: 'INFO'
                    },
                    'COMPLETED': {
                        title: 'OIT Completado',
                        message: `OIT ${updated.oitNumber} ha sido completado exitosamente.`,
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

        res.status(200).json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
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
