import { Router } from 'express';
import authRoutes from './auth.routes';
import oitRoutes from './oit.routes';
import resourceRoutes from './resource.routes';
import aiRoutes from './ai.routes';
import notificationRoutes from './notification.routes';
import standardRoutes from './standard.routes';
import samplingTemplateRoutes from './sampling-template.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/oits', oitRoutes);
router.use('/resources', resourceRoutes);
router.use('/ai', aiRoutes);
router.use('/notifications', notificationRoutes);
router.use('/standards', standardRoutes);
router.use('/sampling-templates', samplingTemplateRoutes);

export default router;
