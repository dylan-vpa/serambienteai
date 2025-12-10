"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const oit_controller_1 = require("../controllers/oit.controller");
const multer_1 = require("../config/multer");
const router = (0, express_1.Router)();
router.get('/', oit_controller_1.getAllOITs);
router.get('/:id', oit_controller_1.getOITById);
router.post('/', oit_controller_1.createOIT);
router.post('/upload', multer_1.upload.single('file'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        res.status(200).json({
            message: 'File uploaded successfully',
            file: {
                filename: req.file.filename,
                originalname: req.file.originalname,
                path: req.file.path,
                size: req.file.size,
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Upload failed' });
    }
}));
router.put('/:id', oit_controller_1.updateOIT);
router.delete('/:id', oit_controller_1.deleteOIT);
exports.default = router;
