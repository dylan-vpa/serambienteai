
import docx from '../services/docx.service';
import fs from 'fs';
import path from 'path';

const templatesDir = path.join(__dirname, '../../templates/reports');
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.docx'));

files.forEach(file => {
    try {
        const fields = docx.getTemplateFields(file);
        console.log(`--- ${file} ---`);
        console.log(fields);
    } catch (e) {
        console.log(`--- ${file} (ERROR) ---`);
    }
});
