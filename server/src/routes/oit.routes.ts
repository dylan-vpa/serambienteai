import { Router } from 'express';
import {
    getAllOITs,
    getOITById,
    createOIT,
    createOITAsync,
    createOITFromUrl,
    updateOIT,
    deleteOIT,
    checkCompliance,
    acceptPlanning,
    rejectPlanning,
    saveSamplingData,
    getSamplingData,
    uploadLabResults,
    uploadSamplingSheets,
    generateFinalReport,
    validateStepData,
    finalizeSampling,
    generateSamplingReport,
    reanalyzeOIT,
    assignEngineers,
    getAssignedEngineers,
    submitSampling,
    updatePlanningResources,
    requestRedoSteps,
    updateServiceDates,
    verifyConsistency
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
router.post('/from-url', createOITFromUrl);

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
router.put('/:id/service-dates', authMiddleware, updateServiceDates);

// Sampling data endpoints
router.post('/:id/sampling-data', authMiddleware, saveSamplingData);
router.get('/:id/sampling-data', authMiddleware, getSamplingData);

// Lab results and final report
router.post('/:id/lab-results', authMiddleware, upload.single('file'), uploadLabResults);
router.post('/:id/sampling-sheets', authMiddleware, upload.single('file'), uploadSamplingSheets);
router.post('/:id/generate-final-report', authMiddleware, generateFinalReport);

// Sampling validation workflow
router.post('/:id/validate-step', authMiddleware, validateStepData);
router.post('/:id/finalize-sampling', authMiddleware, finalizeSampling);
router.post('/:id/submit-sampling', authMiddleware, submitSampling);
router.get('/:id/sampling-report', authMiddleware, generateSamplingReport);
router.post('/:id/verify', authMiddleware, verifyConsistency);

// Request redo of sampling steps (Admin only)
router.post('/:id/request-redo', authMiddleware, requireAdmin, requestRedoSteps);

router.delete('/:id', deleteOIT);

// Engineer assignment endpoints
router.post('/:id/assign-engineers', authMiddleware, requireAdmin, assignEngineers);
router.get('/:id/engineers', authMiddleware, getAssignedEngineers);

// Update resources explicitly
router.put('/:id/resources', authMiddleware, updatePlanningResources);

export default router;

