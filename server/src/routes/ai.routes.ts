import { Router } from 'express';
import { chat, getModels, analyzeDocument, recommendResources, validateOITDocuments } from '../controllers/ai.controller';
import { upload } from '../config/multer';

const router = Router();

// Using shared upload config (disk storage). Controller will still validate mimetypes

router.post('/chat', chat);
router.get('/models', getModels);
router.post('/analyze', analyzeDocument);
router.post('/recommend', recommendResources);
router.post('/validate-oit-documents', upload.fields([
    { name: 'oitFile', maxCount: 1 },
    { name: 'quotationFile', maxCount: 1 }
]), validateOITDocuments);

export default router;
