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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.docxService = void 0;
const docxtemplater_1 = __importDefault(require("docxtemplater"));
const pizzip_1 = __importDefault(require("pizzip"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const TEMPLATES_DIR = path_1.default.join(__dirname, '../../templates/reports');
/**
 * Service for generating documents from Word templates using docxtemplater
 */
exports.docxService = {
    /**
     * Generate a document from a template with the given data
     * @param templateFileName - Name of the template file in templates/reports/
     * @param data - Data object to fill the template placeholders
     * @returns Buffer containing the generated document
     */
    generateDocument: (templateFileName, data) => __awaiter(void 0, void 0, void 0, function* () {
        const templatePath = path_1.default.join(TEMPLATES_DIR, templateFileName);
        if (!fs_1.default.existsSync(templatePath)) {
            throw new Error(`Plantilla no encontrada: ${templateFileName}`);
        }
        // Read the template
        const content = fs_1.default.readFileSync(templatePath, 'binary');
        const zip = new pizzip_1.default(content);
        // Create docxtemplater instance
        // START DEBUG: Inspect keys inside the zip
        const InspectModule = require("docxtemplater/js/inspect-module");
        const inspectModule = new InspectModule();
        const doc = new docxtemplater_1.default(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '{', end: '}' },
            modules: [inspectModule],
            nullGetter: (part) => {
                if (!part.module) {
                    return "---";
                }
                if (part.module === "rawxml") {
                    return "";
                }
                return "";
            }
        });
        // Debug: Print found placeholders
        const tags = inspectModule.getAllTags();
        console.log('[DocxService] DEBUG - Template Tags Found:', JSON.stringify(tags));
        console.log('[DocxService] DEBUG - Data Keys Provided:', JSON.stringify(Object.keys(data)));
        // Render the document with data
        try {
            doc.render(data);
        }
        catch (error) {
            console.error('[DocxService] Render Error:', error);
            throw error;
        }
        // Generate output buffer
        const buffer = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE'
        });
        return buffer;
    }),
    /**
     * List available templates
     */
    listTemplates: () => {
        if (!fs_1.default.existsSync(TEMPLATES_DIR)) {
            return [];
        }
        return fs_1.default.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.docx'));
    },
    /**
     * Extract placeholder fields from a template
     * @param templateFileName - Name of the template file
     * @returns Array of field names found in the template
     */
    getTemplateFields: (templateFileName) => {
        const templatePath = path_1.default.join(TEMPLATES_DIR, templateFileName);
        if (!fs_1.default.existsSync(templatePath)) {
            return [];
        }
        const content = fs_1.default.readFileSync(templatePath, 'binary');
        const zip = new pizzip_1.default(content);
        const doc = new docxtemplater_1.default(zip, {
            delimiters: { start: '{', end: '}' }
        });
        // Get the text and find placeholders
        const fullText = doc.getFullText();
        const matches = fullText.match(/\{([^}]+)\}/g) || [];
        const fields = matches.map(m => m.replace(/[{}]/g, ''));
        // Return unique fields
        return [...new Set(fields)];
    }
};
exports.default = exports.docxService;
