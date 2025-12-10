"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkUpload = exports.deleteResource = exports.updateResource = exports.createResource = exports.getResourceById = exports.getAllResources = void 0;
const client_1 = require("@prisma/client");
const csv_parse_1 = require("csv-parse");
const prisma = new client_1.PrismaClient();
const getAllResources = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const resources = yield prisma.resource.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.status(200).json(resources);
    }
    catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.getAllResources = getAllResources;
const getResourceById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const resource = yield prisma.resource.findUnique({
            where: { id },
        });
        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }
        res.status(200).json(resource);
    }
    catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.getResourceById = getResourceById;
const createResource = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, type, quantity, status } = req.body;
        const resource = yield prisma.resource.create({
            data: {
                name,
                type,
                quantity: parseInt(quantity),
                status: status || 'AVAILABLE',
            },
        });
        res.status(201).json(resource);
    }
    catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.createResource = createResource;
const updateResource = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, type, quantity, status } = req.body;
        const resource = yield prisma.resource.update({
            where: { id },
            data: {
                name,
                type,
                quantity: quantity ? parseInt(quantity) : undefined,
                status,
            },
        });
        res.status(200).json(resource);
    }
    catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.updateResource = updateResource;
const deleteResource = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.resource.delete({
            where: { id },
        });
        res.status(200).json({ message: 'Resource deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.deleteResource = deleteResource;
const bulkUpload = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No CSV file uploaded' });
        }
        const results = [];
        const fileContent = req.file.buffer.toString();
        const parser = (0, csv_parse_1.parse)(fileContent, {
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
        parser.on('error', function (err) {
            console.error('CSV Parse Error:', err);
            res.status(400).json({ message: 'Error parsing CSV file' });
        });
        parser.on('end', function () {
            return __awaiter(this, void 0, void 0, function* () {
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
                            const resource = yield prisma.resource.create({
                                data: {
                                    name: row.nombre || row.name,
                                    type: row.tipo || row.type,
                                    quantity: parseInt(row.cantidad || row.quantity) || 0,
                                    status: row.estado || row.status || 'AVAILABLE',
                                }
                            });
                            createdResources.push(resource);
                        }
                        catch (err) {
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
                }
                catch (dbError) {
                    console.error('Database Error:', dbError);
                    res.status(500).json({ message: 'Error saving resources to database' });
                }
            });
        });
        // Trigger parsing
        parser.write(fileContent);
        parser.end();
    }
    catch (error) {
        console.error('Bulk upload error:', error);
        res.status(500).json({ message: 'Internal server error during bulk upload' });
    }
});
exports.bulkUpload = bulkUpload;
