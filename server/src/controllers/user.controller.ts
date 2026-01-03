import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Valid roles in the system
export const ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    ENGINEER: 'ENGINEER',
    USER: 'USER'
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

// Get all users (SUPER_ADMIN only)
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
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
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
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
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
};

// Update user role (SUPER_ADMIN only)
export const updateUserRole = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        // Validate role
        if (!Object.values(ROLES).includes(role)) {
            return res.status(400).json({
                error: 'Rol inválido',
                validRoles: Object.values(ROLES)
            });
        }

        // Prevent changing own role
        const currentUserId = (req as any).user?.userId;
        if (id === currentUserId) {
            return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
        }

        const user = await prisma.user.update({
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
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ error: 'Error al actualizar rol' });
    }
};

// Get all engineers (for OIT assignment)
export const getEngineers = async (req: Request, res: Response) => {
    try {
        const engineers = await prisma.user.findMany({
            where: { role: ROLES.ENGINEER },
            select: {
                id: true,
                email: true,
                name: true,
                role: true
            },
            orderBy: { name: 'asc' }
        });
        res.json(engineers);
    } catch (error) {
        console.error('Error fetching engineers:', error);
        res.status(500).json({ error: 'Error al obtener ingenieros' });
    }
};

// Get current user profile
export const getProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;

        const user = await prisma.user.findUnique({
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
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
};
