/**
 * Template Field Extractor
 * Extracts all placeholders from all Word templates and outputs structured mapping
 */

import { docxService } from '../services/docx.service';
import fs from 'fs';
import path from 'path';

const TEMPLATES_DIR = path.join(__dirname, '../../templates/reports');
const OUTPUT_FILE = path.join(__dirname, '../config/allTemplateFields.json');

interface TemplateFields {
    fileName: string;
    shortName: string;
    templateType: string;
    fields: string[];
    fieldCount: number;
}

function getTemplateType(fileName: string): string {
    if (fileName.includes('RESPEL')) return 'RESPEL';
    if (fileName.includes('PUNTO SECO')) return 'PUNTO_SECO';
    if (fileName.includes('EMISIÓN DE RUIDO Y RUIDO AMBIENTAL')) return 'EMISION_RUIDO_AMBIENTAL';
    if (fileName.includes('EMISIÓN DE RUIDO')) return 'EMISION_RUIDO';
    if (fileName.includes('RUIDO INTRADOMICILIARIO')) return 'RUIDO_INTRADOMICILIARIO';
    if (fileName.includes('RUIDO AMBIENTAL')) return 'RUIDO_AMBIENTAL';
    if (fileName.includes('CALIDAD DE AIRE')) return 'CALIDAD_AIRE';
    if (fileName.includes('OLORES OFENSIVOS')) return 'OLORES';
    if (fileName.includes('PARTÍCULAS VIABLES')) return 'PARTICULAS_VIABLES';
    if (fileName.includes('PREVIOS EN FUENTES FIJAS')) return 'FUENTES_FIJAS_PREVIO';
    if (fileName.includes('FUENTES FIJAS')) return 'FUENTES_FIJAS';
    return 'UNKNOWN';
}

async function extractAllTemplates() {
    console.log('=== EXTRACTING ALL TEMPLATE FIELDS ===\n');

    const templates = docxService.listTemplates();
    const results: TemplateFields[] = [];
    const allFields = new Set<string>();

    for (const template of templates) {
        console.log(`Processing: ${template}`);

        try {
            const fields = docxService.getTemplateFields(template);
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
        } catch (error) {
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
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
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
}

extractAllTemplates().catch(console.error);
