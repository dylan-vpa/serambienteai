import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import InspectModule from 'docxtemplater/js/inspect-module';

const templatesDir = path.join(__dirname, 'server/templates/reports');

function getTemplateTags(filePath: string) {
    try {
        const content = fs.readFileSync(filePath, 'binary');
        const zip = new PizZip(content);
        const inspectModule = new InspectModule();
        const doc = new Docxtemplater(zip, { modules: [inspectModule] });
        const tags = inspectModule.getAllTags();
        return Object.keys(tags);
    } catch (error: any) {
        return [`ERROR: ${error.message}`];
    }
}

const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.docx'));
const report: Record<string, string[]> = {};

files.forEach(file => {
    report[file] = getTemplateTags(path.join(templatesDir, file));
});

console.log(JSON.stringify(report, null, 2));
