import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
    getTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate
} from '../controllers/sampling-template.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', getTemplates);
router.get('/:id', getTemplateById);
router.post('/', createTemplate);
router.put('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);

export default router;
