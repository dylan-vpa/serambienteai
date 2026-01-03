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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireEngineer = exports.requireAdmin = exports.requireSuperAdmin = exports.requireRole = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const authMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No autorizado' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        // Get user role from database
        const user = yield prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, role: true }
        });
        if (!user) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }
        req.user = {
            userId: user.id,
            role: user.role
        };
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
});
exports.authMiddleware = authMiddleware;
// Middleware to require specific roles
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'No autorizado' });
        }
        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({
                error: 'No tienes permisos para esta acción',
                requiredRoles: allowedRoles,
                currentRole: user.role
            });
        }
        next();
    };
};
exports.requireRole = requireRole;
// Shortcut middlewares for common role checks
exports.requireSuperAdmin = (0, exports.requireRole)(['SUPER_ADMIN']);
exports.requireAdmin = (0, exports.requireRole)(['SUPER_ADMIN', 'ADMIN']);
exports.requireEngineer = (0, exports.requireRole)(['SUPER_ADMIN', 'ADMIN', 'ENGINEER']);
