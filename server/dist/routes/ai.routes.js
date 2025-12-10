"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ai_controller_1 = require("../controllers/ai.controller");
const multer_1 = require("../config/multer");
const router = (0, express_1.Router)();
// Using shared upload config (disk storage). Controller will still validate mimetypes
router.post('/chat', ai_controller_1.chat);
router.get('/models', ai_controller_1.getModels);
router.post('/analyze', ai_controller_1.analyzeDocument);
router.post('/recommend', ai_controller_1.recommendResources);
router.post('/validate-oit-documents', multer_1.upload.fields([
    { name: 'oitFile', maxCount: 1 },
    { name: 'quotationFile', maxCount: 1 }
]), ai_controller_1.validateOITDocuments);
exports.default = router;
