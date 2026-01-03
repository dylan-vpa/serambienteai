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
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '{', end: '}' }
        });

        // Render the document with data
        doc.render(data);

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
