"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const resource_controller_1 = require("../controllers/resource.controller");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
router.get('/', resource_controller_1.getAllResources);
router.get('/:id', resource_controller_1.getResourceById);
router.post('/', resource_controller_1.createResource);
router.post('/bulk-upload', upload.single('csvFile'), resource_controller_1.bulkUpload);
router.put('/:id', resource_controller_1.updateResource);
router.delete('/:id', resource_controller_1.deleteResource);
exports.default = router;
