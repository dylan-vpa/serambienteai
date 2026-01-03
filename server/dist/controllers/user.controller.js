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
exports.getProfile = exports.getEngineers = exports.updateUserRole = exports.getUserById = exports.getAllUsers = exports.ROLES = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Valid roles in the system
exports.ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    ENGINEER: 'ENGINEER',
    USER: 'USER'
};
// Get all users (SUPER_ADMIN only)
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});
exports.getAllUsers = getAllUsers;
// Get user by ID
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = yield prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json(user);
    }
    catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
});
exports.getUserById = getUserById;
// Update user role (SUPER_ADMIN only)
const updateUserRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { role } = req.body;
        // Validate role
        if (!Object.values(exports.ROLES).includes(role)) {
            return res.status(400).json({
                error: 'Rol inválido',
                validRoles: Object.values(exports.ROLES)
            });
        }
        // Prevent changing own role
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (id === currentUserId) {
            return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
        }
        const user = yield prisma.user.update({
            where: { id },
            data: { role },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });
        res.json({ message: 'Rol actualizado exitosamente', user });
    }
    catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ error: 'Error al actualizar rol' });
    }
});
exports.updateUserRole = updateUserRole;
// Get all engineers (for OIT assignment)
const getEngineers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const engineers = yield prisma.user.findMany({
            where: { role: exports.ROLES.ENGINEER },
            select: {
                id: true,
                email: true,
                name: true,
                role: true
            },
            orderBy: { name: 'asc' }
        });
        res.json(engineers);
    }
    catch (error) {
        console.error('Error fetching engineers:', error);
        res.status(500).json({ error: 'Error al obtener ingenieros' });
    }
});
exports.getEngineers = getEngineers;
// Get current user profile
const getProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const user = yield prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json(user);
    }
    catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
});
exports.getProfile = getProfile;
