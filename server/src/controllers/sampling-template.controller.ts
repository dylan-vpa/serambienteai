import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getTemplates = async (req: Request, res: Response) => {
    try {
        const templates = await prisma.samplingTemplate.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(templates);
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Error al obtener plantillas' });
    }
};

export const getTemplateById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const template = await prisma.samplingTemplate.findUnique({
            where: { id }
        });

        if (!template) {
            return res.status(404).json({ error: 'Plantilla no encontrada' });
        }

        res.json(template);
    } catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({ error: 'Error al obtener plantilla' });
    }
};

export const createTemplate = async (req: Request, res: Response) => {
    try {
        const { name, description, oitType, steps } = req.body;

        const template = await prisma.samplingTemplate.create({
            data: {
                name,
                description,
                oitType,
                steps: JSON.stringify(steps)
            }
        });

        res.status(201).json(template);
    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({ error: 'Error al crear plantilla' });
    }
};

export const updateTemplate = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, oitType, steps } = req.body;

        const template = await prisma.samplingTemplate.update({
            where: { id },
            data: {
                name,
                description,
                oitType,
                steps: JSON.stringify(steps)
            }
        });

        res.json(template);
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({ error: 'Error al actualizar plantilla' });
    }
};

export const deleteTemplate = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.samplingTemplate.delete({
            where: { id }
        });

        res.json({ message: 'Plantilla eliminada' });
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ error: 'Error al eliminar plantilla' });
    }
};
