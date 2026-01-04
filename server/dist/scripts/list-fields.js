"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const docx_service_1 = __importDefault(require("../services/docx.service"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const templatesDir = path_1.default.join(__dirname, '../../templates/reports');
const files = fs_1.default.readdirSync(templatesDir).filter(f => f.endsWith('.docx'));
files.forEach(file => {
    try {
        const fields = docx_service_1.default.getTemplateFields(file);
        console.log(`--- ${file} ---`);
        console.log(fields);
    }
    catch (e) {
        console.log(`--- ${file} (ERROR) ---`);
    }
});
