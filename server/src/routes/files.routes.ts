import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import path from 'path';
import fs from 'fs';

const router = Router();

router.get('/download/:filename', authMiddleware, (req: Request, res: Response) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads', filename);

    if (fs.existsSync(filePath)) {
        res.download(filePath, (err) => {
            if (err) {
                console.error('Download error:', err);
                res.status(500).json({ error: 'Error downloading file' });
            }
        });
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

export default router;
