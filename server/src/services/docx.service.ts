import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import fs from 'fs';
import path from 'path';

const TEMPLATES_DIR = path.join(__dirname, '../../templates/reports');

export interface DocxTemplateData {
    [key: string]: string | number | boolean | undefined;
}

/**
 * Service for generating documents from Word templates using docxtemplater
 */
export const docxService = {
    /**
     * Generate a document from a template with the given data
     * @param templateFileName - Name of the template file in templates/reports/
     * @param data - Data object to fill the template placeholders
     * @returns Buffer containing the generated document
     */
    generateDocument: async (templateFileName: string, data: DocxTemplateData): Promise<Buffer> => {
        const templatePath = path.join(TEMPLATES_DIR, templateFileName);

        if (!fs.existsSync(templatePath)) {
            throw new Error(`Plantilla no encontrada: ${templateFileName}`);
        }

        // Read the template
        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);

        // Create docxtemplater instance
        // START DEBUG: Inspect keys inside the zip
        const InspectModule = require("docxtemplater/js/inspect-module");
        const inspectModule = new InspectModule();

        const doc = new Docxtemplater(zip, {
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
        } catch (error: any) {
            console.error('[DocxService] Render Error:', error);
            throw error;
        }

        // Generate output buffer
        const buffer = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE'
        });

        return buffer;
    },

    /**
     * List available templates
     */
    listTemplates: (): string[] => {
        if (!fs.existsSync(TEMPLATES_DIR)) {
            return [];
        }
        return fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.docx'));
    },

    /**
     * Extract placeholder fields from a template
     * @param templateFileName - Name of the template file
     * @returns Array of field names found in the template
     */
    getTemplateFields: (templateFileName: string): string[] => {
        const templatePath = path.join(TEMPLATES_DIR, templateFileName);

        if (!fs.existsSync(templatePath)) {
            return [];
        }

        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
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

export default docxService;
