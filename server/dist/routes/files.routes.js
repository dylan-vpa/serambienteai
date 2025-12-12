"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
router.get('/download/:filename', auth_middleware_1.authMiddleware, (req, res) => {
    try {
        const { filename } = req.params;
        // Security: prevent path traversal attacks
        const sanitizedFilename = path_1.default.basename(filename);
        const filePath = path_1.default.join(__dirname, '../../uploads', sanitizedFilename);
        console.log('Download request for:', sanitizedFilename);
        console.log('Full path:', filePath);
        // Check if file exists
        if (!fs_1.default.existsSync(filePath)) {
            console.error('File not found:', filePath);
            return res.status(404).json({ error: 'File not found' });
        }
        // Get file stats
        const stat = fs_1.default.statSync(filePath);
        // Set headers for download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
        // Stream file
        const fileStream = fs_1.default.createReadStream(filePath);
        fileStream.pipe(res);
        fileStream.on('error', (err) => {
            console.error('File stream error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error streaming file' });
            }
        });
        console.log('File download started:', sanitizedFilename);
    }
    catch (error) {
        console.error('Download error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
exports.default = router;
