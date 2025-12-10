import { Router } from 'express';
import multer from 'multer';
import { getAllResources, getResourceById, createResource, updateResource, deleteResource, bulkUpload } from '../controllers/resource.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', getAllResources);
router.get('/:id', getResourceById);
router.post('/', createResource);
router.post('/bulk-upload', upload.single('csvFile'), bulkUpload);
router.put('/:id', updateResource);
router.delete('/:id', deleteResource);

export default router;
