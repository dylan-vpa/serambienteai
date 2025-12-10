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
exports.deleteOIT = exports.updateOIT = exports.createOIT = exports.getOITById = exports.getAllOITs = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getAllOITs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const oits = yield prisma.oIT.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.status(200).json(oits);
    }
    catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.getAllOITs = getAllOITs;
const getOITById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const oit = yield prisma.oIT.findUnique({
            where: { id },
        });
        if (!oit) {
            return res.status(404).json({ message: 'OIT not found' });
        }
        res.status(200).json(oit);
    }
    catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.getOITById = getOITById;
const createOIT = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code, description, status } = req.body;
        const oit = yield prisma.oIT.create({
            data: {
                code,
                description,
                status: status || 'PENDING',
            },
        });
        res.status(201).json(oit);
    }
    catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.createOIT = createOIT;
const updateOIT = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { code, description, status } = req.body;
        const oit = yield prisma.oIT.update({
            where: { id },
            data: {
                code,
                description,
                status,
            },
        });
        res.status(200).json(oit);
    }
    catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.updateOIT = updateOIT;
const deleteOIT = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.oIT.delete({
            where: { id },
        });
        res.status(200).json({ message: 'OIT deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.deleteOIT = deleteOIT;
