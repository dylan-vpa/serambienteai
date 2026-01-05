"use strict";
/**
 * Template Field Extractor
 * Extracts all placeholders from all Word templates and outputs structured mapping
 */
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
const docx_service_1 = require("../services/docx.service");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const TEMPLATES_DIR = path_1.default.join(__dirname, '../../templates/reports');
const OUTPUT_FILE = path_1.default.join(__dirname, '../config/allTemplateFields.json');
function getTemplateType(fileName) {
    if (fileName.includes('RESPEL'))
        return 'RESPEL';
    if (fileName.includes('PUNTO SECO'))
        return 'PUNTO_SECO';
    if (fileName.includes('EMISIÓN DE RUIDO Y RUIDO AMBIENTAL'))
        return 'EMISION_RUIDO_AMBIENTAL';
    if (fileName.includes('EMISIÓN DE RUIDO'))
        return 'EMISION_RUIDO';
    if (fileName.includes('RUIDO INTRADOMICILIARIO'))
        return 'RUIDO_INTRADOMICILIARIO';
    if (fileName.includes('RUIDO AMBIENTAL'))
        return 'RUIDO_AMBIENTAL';
    if (fileName.includes('CALIDAD DE AIRE'))
        return 'CALIDAD_AIRE';
    if (fileName.includes('OLORES OFENSIVOS'))
        return 'OLORES';
    if (fileName.includes('PARTÍCULAS VIABLES'))
        return 'PARTICULAS_VIABLES';
    if (fileName.includes('PREVIOS EN FUENTES FIJAS'))
        return 'FUENTES_FIJAS_PREVIO';
    if (fileName.includes('FUENTES FIJAS'))
        return 'FUENTES_FIJAS';
    return 'UNKNOWN';
}
function extractAllTemplates() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('=== EXTRACTING ALL TEMPLATE FIELDS ===\n');
        const templates = docx_service_1.docxService.listTemplates();
        const results = [];
        const allFields = new Set();
        for (const template of templates) {
            console.log(`Processing: ${template}`);
            try {
                const fields = docx_service_1.docxService.getTemplateFields(template);
                const templateType = getTemplateType(template);
                results.push({
                    fileName: template,
                    shortName: template.split(' ')[0],
                    templateType,
                    fields,
                    fieldCount: fields.length
                });
                fields.forEach(f => allFields.add(f));
                console.log(`  Type: ${templateType}`);
                console.log(`  Fields: ${fields.length}`);
                console.log(`  Sample: ${fields.slice(0, 5).join(', ')}...`);
                console.log('');
            }
            catch (error) {
                console.error(`  Error: ${error}`);
            }
        }
        // Create output structure
        const output = {
            extractedAt: new Date().toISOString(),
            totalTemplates: results.length,
            totalUniqueFields: allFields.size,
            allUniqueFields: Array.from(allFields).sort(),
            templates: results
        };
        // Save to JSON
        fs_1.default.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
        console.log(`\n=== SAVED TO ${OUTPUT_FILE} ===`);
        console.log(`Total templates: ${results.length}`);
        console.log(`Total unique fields: ${allFields.size}`);
        // Print summary table
        console.log('\n=== SUMMARY ===');
        console.log('Template Type              | Fields | Sample Fields');
        console.log('---------------------------|--------|------------------');
        for (const t of results) {
            const name = t.templateType.padEnd(25);
            const count = t.fieldCount.toString().padStart(6);
            const sample = t.fields.slice(0, 3).join(', ').substring(0, 30);
            console.log(`${name} | ${count} | ${sample}`);
        }
    });
}
extractAllTemplates().catch(console.error);
