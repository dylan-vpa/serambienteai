import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import path from 'path';
import fs from 'fs';

const router = Router();


router.get('/download/:filename', authMiddleware, (req: Request, res: Response) => {
    try {
        const { filename } = req.params;

        // Security: prevent path traversal attacks
        const sanitizedFilename = path.basename(filename);
        const filePath = path.join(__dirname, '../../uploads', sanitizedFilename);

        console.log('Download request for:', sanitizedFilename);
        console.log('Full path:', filePath);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.error('File not found:', filePath);
            return res.status(404).json({ error: 'File not found' });
        }

        // Get file stats
        const stat = fs.statSync(filePath);

        // Set headers for download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);

        // Stream file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

        fileStream.on('error', (err) => {
            console.error('File stream error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error streaming file' });
            }
        });

        console.log('File download started:', sanitizedFilename);
    } catch (error) {
        console.error('Download error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

export default router;
