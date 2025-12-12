"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const oit_controller_1 = require("../controllers/oit.controller");
const multer_1 = require("../config/multer");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/', oit_controller_1.getAllOITs);
router.get('/:id', oit_controller_1.getOITById);
router.post('/', oit_controller_1.createOIT);
// Async creation endpoint with file uploads (oitFile and quotationFile)
router.post('/async', auth_middleware_1.authMiddleware, multer_1.upload.fields([
    { name: 'oitFile', maxCount: 1 },
    { name: 'quotationFile', maxCount: 1 },
]), oit_controller_1.createOITAsync);
router.put('/:id', oit_controller_1.updateOIT);
router.patch('/:id', auth_middleware_1.authMiddleware, multer_1.upload.fields([
    { name: 'oitFile', maxCount: 1 },
    { name: 'quotationFile', maxCount: 1 },
]), oit_controller_1.updateOIT);
router.post('/:id/compliance', auth_middleware_1.authMiddleware, oit_controller_1.checkCompliance);
router.post('/:id/reanalyze', auth_middleware_1.authMiddleware, oit_controller_1.reanalyzeOIT);
// Planning endpoints
router.post('/:id/accept-planning', auth_middleware_1.authMiddleware, oit_controller_1.acceptPlanning);
router.post('/:id/reject-planning', auth_middleware_1.authMiddleware, oit_controller_1.rejectPlanning);
// Sampling data endpoints
router.post('/:id/sampling-data', auth_middleware_1.authMiddleware, oit_controller_1.saveSamplingData);
router.get('/:id/sampling-data', auth_middleware_1.authMiddleware, oit_controller_1.getSamplingData);
// Lab results and final report
router.post('/:id/lab-results', auth_middleware_1.authMiddleware, multer_1.upload.single('file'), oit_controller_1.uploadLabResults);
router.post('/:id/generate-final-report', auth_middleware_1.authMiddleware, oit_controller_1.generateFinalReport);
// Sampling validation workflow
router.post('/:id/validate-step', auth_middleware_1.authMiddleware, oit_controller_1.validateStepData);
router.post('/:id/finalize-sampling', auth_middleware_1.authMiddleware, oit_controller_1.finalizeSampling);
router.get('/:id/sampling-report', auth_middleware_1.authMiddleware, oit_controller_1.generateSamplingReport);
router.delete('/:id', oit_controller_1.deleteOIT);
exports.default = router;
