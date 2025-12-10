import { Router } from 'express';
import {
    getAllOITs,
    getOITById,
    createOIT,
    createOITAsync,
    updateOIT,
    deleteOIT,
    checkCompliance,
    acceptPlanning,
    rejectPlanning,
    saveSamplingData,
    getSamplingData,
    uploadLabResults,
    generateFinalReport
} from '../controllers/oit.controller';
import { upload } from '../config/multer';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getAllOITs);
router.get('/:id', getOITById);
router.post('/', createOIT);

// Async creation endpoint with file uploads (oitFile and quotationFile)
router.post(
    '/async',
    authMiddleware,
    upload.fields([
        { name: 'oitFile', maxCount: 1 },
        { name: 'quotationFile', maxCount: 1 },
    ]),
    createOITAsync
);

router.put('/:id', updateOIT);
router.post('/:id/compliance', authMiddleware, checkCompliance);

// Planning endpoints
router.post('/:id/accept-planning', authMiddleware, acceptPlanning);
router.post('/:id/reject-planning', authMiddleware, rejectPlanning);

// Sampling data endpoints
router.post('/:id/sampling-data', authMiddleware, saveSamplingData);
router.get('/:id/sampling-data', authMiddleware, getSamplingData);

// Lab results and final report
router.post('/:id/lab-results', authMiddleware, upload.single('file'), uploadLabResults);
router.post('/:id/generate-final-report', authMiddleware, generateFinalReport);

router.delete('/:id', deleteOIT);

export default router;
