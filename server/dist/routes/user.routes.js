"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authMiddleware);
// Get current user profile
router.get('/profile', user_controller_1.getProfile);
// Get all engineers (for assignment dropdown) - requires ADMIN+
router.get('/engineers', auth_middleware_1.requireAdmin, user_controller_1.getEngineers);
// Get all users - requires SUPER_ADMIN
router.get('/', auth_middleware_1.requireSuperAdmin, user_controller_1.getAllUsers);
// Create new user - requires SUPER_ADMIN
router.post('/', auth_middleware_1.requireSuperAdmin, user_controller_1.createUser);
// Get user by ID - requires SUPER_ADMIN
router.get('/:id', auth_middleware_1.requireSuperAdmin, user_controller_1.getUserById);
// Update user role - requires SUPER_ADMIN
router.put('/:id/role', auth_middleware_1.requireSuperAdmin, user_controller_1.updateUserRole);
// Update user password - requires ADMIN+
router.put('/:id/password', auth_middleware_1.requireAdmin, user_controller_1.updatePassword);
exports.default = router;
