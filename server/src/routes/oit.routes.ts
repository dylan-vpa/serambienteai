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
    generateFinalReport,
    validateStepData,
    finalizeSampling,
    generateSamplingReport,
    reanalyzeOIT,
    assignEngineers,
    getAssignedEngineers,
    submitSampling,
    updatePlanningResources
} from '../controllers/oit.controller';
import { upload } from '../config/multer';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getAllOITs);
router.get('/:id', authMiddleware, getOITById);
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
router.patch('/:id', authMiddleware, upload.fields([
    { name: 'oitFile', maxCount: 1 },
    { name: 'quotationFile', maxCount: 1 },
]), updateOIT);
router.post('/:id/compliance', authMiddleware, checkCompliance);

router.post('/:id/reanalyze', authMiddleware, reanalyzeOIT);

// Planning endpoints
router.post('/:id/accept-planning', authMiddleware, acceptPlanning);
router.post('/:id/reject-planning', authMiddleware, rejectPlanning);

// Sampling data endpoints
router.post('/:id/sampling-data', authMiddleware, saveSamplingData);
router.get('/:id/sampling-data', authMiddleware, getSamplingData);

// Lab results and final report
router.post('/:id/lab-results', authMiddleware, upload.single('file'), uploadLabResults);
router.post('/:id/generate-final-report', authMiddleware, generateFinalReport);

// Sampling validation workflow
router.post('/:id/validate-step', authMiddleware, validateStepData);
router.post('/:id/finalize-sampling', authMiddleware, finalizeSampling);
router.post('/:id/submit-sampling', authMiddleware, submitSampling);
router.get('/:id/sampling-report', authMiddleware, generateSamplingReport);

router.delete('/:id', deleteOIT);

// Engineer assignment endpoints
router.post('/:id/assign-engineers', authMiddleware, requireAdmin, assignEngineers);
router.get('/:id/engineers', authMiddleware, getAssignedEngineers);

// Update resources explicitly
router.put('/:id/resources', authMiddleware, updatePlanningResources);

export default router;
