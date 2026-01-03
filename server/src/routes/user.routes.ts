import { Router } from 'express';
import {
    getAllUsers,
    getUserById,
    updateUserRole,
    getEngineers,
    getProfile,
    createUser
} from '../controllers/user.controller';
import { authMiddleware, requireSuperAdmin, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get current user profile
router.get('/profile', getProfile);

// Get all engineers (for assignment dropdown) - requires ADMIN+
router.get('/engineers', requireAdmin, getEngineers);

// Get all users - requires SUPER_ADMIN
router.get('/', requireSuperAdmin, getAllUsers);

// Create new user - requires SUPER_ADMIN
router.post('/', requireSuperAdmin, createUser);

// Get user by ID - requires SUPER_ADMIN
router.get('/:id', requireSuperAdmin, getUserById);

// Update user role - requires SUPER_ADMIN
router.put('/:id/role', requireSuperAdmin, updateUserRole);

export default router;
