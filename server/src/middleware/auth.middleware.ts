import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends Request {
    user?: {
        userId: string;
        role: string;
    };
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No autorizado' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string };

        // Get user role from database
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, role: true }
        });

        if (!user) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        (req as AuthenticatedRequest).user = {
            userId: user.id,
            role: user.role
        };

        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

// Middleware to require specific roles
export const requireRole = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as AuthenticatedRequest).user;

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

// Shortcut middlewares for common role checks
export const requireSuperAdmin = requireRole(['SUPER_ADMIN']);
export const requireAdmin = requireRole(['SUPER_ADMIN', 'ADMIN']);
export const requireEngineer = requireRole(['SUPER_ADMIN', 'ADMIN', 'ENGINEER']);

