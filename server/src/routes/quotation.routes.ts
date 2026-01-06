import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
    getQuotations,
    getQuotation,
    createQuotation,
    updateQuotation,
    deleteQuotation,
    analyzeQuotation
} from '../controllers/quotation.controller';

import { upload } from '../config/multer';

const router = Router();

router.use(authMiddleware);

// CRUD routes
router.get('/', getQuotations);
router.get('/:id', getQuotation);
router.post('/', upload.single('file'), createQuotation);
router.put('/:id', upload.single('file'), updateQuotation);
router.delete('/:id', deleteQuotation);

// Analysis route
router.post('/:id/analyze', analyzeQuotation);

export default router;
