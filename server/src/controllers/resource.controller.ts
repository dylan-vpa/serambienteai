import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse';

const prisma = new PrismaClient();

export const getAllResources = async (req: Request, res: Response) => {
    try {
        const resources = await prisma.resource.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.status(200).json(resources);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};

export const getResourceById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const resource = await prisma.resource.findUnique({
            where: { id },
        });
        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }
        res.status(200).json(resource);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};

export const createResource = async (req: Request, res: Response) => {
    try {
        const { name, type, quantity, status } = req.body;
        const resource = await prisma.resource.create({
            data: {
                name,
                type,
                quantity: parseInt(quantity),
                status: status || 'AVAILABLE',
            },
        });
        res.status(201).json(resource);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};

export const updateResource = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, type, quantity, status } = req.body;

        const resource = await prisma.resource.update({
            where: { id },
            data: {
                name,
                type,
                quantity: quantity ? parseInt(quantity) : undefined,
                status,
            },
        });
        res.status(200).json(resource);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};

export const deleteResource = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.resource.delete({
            where: { id },
        });
        res.status(200).json({ message: 'Resource deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};

export const bulkUpload = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No CSV file uploaded' });
        }

        const results: any[] = [];
        const fileContent = req.file.buffer.toString();

        const parser = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        parser.on('readable', function () {
            let record;
            while ((record = parser.read()) !== null) {
                results.push(record);
            }
        });

        parser.on('error', function (err: any) {
            console.error('CSV Parse Error:', err);
            res.status(400).json({ message: 'Error parsing CSV file' });
        });

        parser.on('end', async function () {
            try {
                const createdResources = [];
                const errors = [];

                for (const row of results) {
                    try {
                        // Validate required fields
                        if (!row.nombre && !row.name) {
                            errors.push(`Skipped row: Missing name for row`);
                            continue;
                        }
                        if (!row.tipo && !row.type) {
                            errors.push(`Skipped row: Missing type for ${row.nombre || row.name}`);
                            continue;
                        }

                        const resource = await prisma.resource.create({
                            data: {
                                name: row.nombre || row.name,
                                type: row.tipo || row.type,
                                quantity: parseInt(row.cantidad || row.quantity) || 0,
                                status: row.estado || row.status || 'AVAILABLE',
                            }
                        });
                        createdResources.push(resource);
                    } catch (err) {
                        console.error('Error creating resource:', err);
                        errors.push(`Failed to create resource: ${row.nombre || row.name}`);
                    }
                }

                res.status(201).json({
                    message: `Successfully created ${createdResources.length} resources`,
                    createdCount: createdResources.length,
                    errorCount: errors.length,
                    errors: errors.length > 0 ? errors : undefined
                });
            } catch (dbError) {
                console.error('Database Error:', dbError);
                res.status(500).json({ message: 'Error saving resources to database' });
            }
        });

        // Trigger parsing
        parser.write(fileContent);
        parser.end();

    } catch (error) {
        console.error('Bulk upload error:', error);
        res.status(500).json({ message: 'Internal server error during bulk upload' });
    }
};
