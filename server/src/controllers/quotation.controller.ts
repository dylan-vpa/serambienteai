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

        const quotation = await prisma.quotation.create({
            data: {
                quotationNumber: finalQuotationNumber,
                description,
                clientName,
                fileUrl: file ? file.path : undefined,
                status: 'PENDING'
            }
        });

        res.status(201).json(quotation);
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
        if (file) data.fileUrl = file.path;

        const quotation = await prisma.quotation.update({
            where: { id },
            data
        });

        res.json(quotation);
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

        // Update status to analyzing
        await prisma.quotation.update({
            where: { id },
            data: { status: 'ANALYZING' }
        });

        // TODO: Implement AI analysis using aiService
        // For now, return a placeholder response
        res.json({
            message: 'Análisis iniciado',
            quotationId: id,
            status: 'ANALYZING'
        });

    } catch (error) {
        console.error('Error analyzing quotation:', error);
        res.status(500).json({ error: 'Error al analizar cotización' });
    }
};
