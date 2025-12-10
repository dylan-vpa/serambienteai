import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getStandards = async (req: Request, res: Response) => {
    try {
        const standards = await prisma.standard.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(standards);
    } catch (error) {
        console.error('Error fetching standards:', error);
        res.status(500).json({ error: 'Error al obtener normas' });
    }
};

export const createStandard = async (req: Request, res: Response) => {
    try {
        const { title, description, type } = req.body;
        const file = req.file;

        const standard = await prisma.standard.create({
            data: {
                title,
                description,
                type,
                fileUrl: file ? file.path : undefined
            }
        });
        res.status(201).json(standard);
    } catch (error) {
        console.error('Error creating standard:', error);
        res.status(500).json({ error: 'Error al crear norma' });
    }
};

export const updateStandard = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, description, type } = req.body;
        const file = req.file;

        const data: any = {
            title,
            description,
            type
        };

        if (file) {
            data.fileUrl = file.path;
        }

        const standard = await prisma.standard.update({
            where: { id },
            data
        });
        res.json(standard);
    } catch (error) {
        console.error('Error updating standard:', error);
        res.status(500).json({ error: 'Error al actualizar norma' });
    }
};

export const deleteStandard = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.standard.delete({
            where: { id }
        });
        res.json({ message: 'Norma eliminada' });
    } catch (error) {
        console.error('Error deleting standard:', error);
        res.status(500).json({ error: 'Error al eliminar norma' });
    }
};
