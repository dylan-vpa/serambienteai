const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const InspectModule = require('docxtemplater/js/inspect-module');

const templatesDir = path.join(__dirname, 'server/templates/reports');

function getTemplateTags(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'binary');
        const zip = new PizZip(content);
        const inspectModule = new InspectModule();
        const doc = new Docxtemplater(zip, { modules: [inspectModule] });
        const tags = inspectModule.getAllTags();
        return Object.keys(tags);
    } catch (error) {
        return [`ERROR: ${error.message}`];
    }
}

const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.docx'));
const report = {};

files.forEach(file => {
    report[file] = getTemplateTags(path.join(templatesDir, file));
});

console.log(JSON.stringify(report, null, 2));
