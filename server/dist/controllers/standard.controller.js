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
exports.deleteStandard = exports.updateStandard = exports.createStandard = exports.getStandard = exports.getStandards = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getStandards = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const standards = yield prisma.standard.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(standards);
    }
    catch (error) {
        console.error('Error fetching standards:', error);
        res.status(500).json({ error: 'Error al obtener normas' });
    }
});
exports.getStandards = getStandards;
const getStandard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const standard = yield prisma.standard.findUnique({
            where: { id }
        });
        if (!standard) {
            return res.status(404).json({ error: 'Norma no encontrada' });
        }
        res.json(standard);
    }
    catch (error) {
        console.error('Error fetching standard:', error);
        res.status(500).json({ error: 'Error al obtener norma' });
    }
});
exports.getStandard = getStandard;
const createStandard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, description, type } = req.body;
        const file = req.file;
        const standard = yield prisma.standard.create({
            data: {
                title,
                description,
                type,
                fileUrl: file ? file.path : undefined
            }
        });
        res.status(201).json(standard);
    }
    catch (error) {
        console.error('Error creating standard:', error);
        res.status(500).json({ error: 'Error al crear norma' });
    }
});
exports.createStandard = createStandard;
const updateStandard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { title, description, type } = req.body;
        const file = req.file;
        const data = {
            title,
            description,
            type
        };
        if (file) {
            data.fileUrl = file.path;
        }
        const standard = yield prisma.standard.update({
            where: { id },
            data
        });
        res.json(standard);
    }
    catch (error) {
        console.error('Error updating standard:', error);
        res.status(500).json({ error: 'Error al actualizar norma' });
    }
});
exports.updateStandard = updateStandard;
const deleteStandard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.standard.delete({
            where: { id }
        });
        res.json({ message: 'Norma eliminada' });
    }
    catch (error) {
        console.error('Error deleting standard:', error);
        res.status(500).json({ error: 'Error al eliminar norma' });
    }
});
exports.deleteStandard = deleteStandard;
