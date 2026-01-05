/**
 * Context-Aware Variable Extractor
 * Extracts variables with their surrounding text context
 * to understand what each variable actually means
 */

const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const templatesDir = './server/templates/reports';

function extractVarsWithContext(filePath) {
    const content = fs.readFileSync(filePath, 'binary');
    const zip = new PizZip(content);

    const docXml = zip.file('word/document.xml')?.asText();
    if (!docXml) return [];

    // Remove all XML tags except text content
    // Replace <w:t>text</w:t> with just text
    let textContent = docXml
        .replace(/<w:t[^>]*>/g, '<<<TEXT>>>')
        .replace(/<\/w:t>/g, '<<<\/TEXT>>>')
        .replace(/<[^>]+>/g, ' ')
        .replace(/<<<TEXT>>>/g, '')
        .replace(/<<<\/TEXT>>>/g, '')
        .replace(/\s+/g, ' ');

    // Find all variables and their surrounding context
    const varRegex = /\{([a-zA-Z0-9_]+)\}/g;
    const results = [];
    let match;

    while ((match = varRegex.exec(textContent)) !== null) {
        const varName = match[1];
        const position = match.index;

        // Get 100 chars before and 50 after
        const contextBefore = textContent.substring(Math.max(0, position - 100), position).trim();
        const contextAfter = textContent.substring(position + match[0].length, position + match[0].length + 50).trim();

        results.push({
            variable: varName,
            before: contextBefore,
            after: contextAfter
        });
    }

    return results;
}

function analyzeContext(contexts) {
    const varMeanings = {};

    contexts.forEach(ctx => {
        if (!varMeanings[ctx.variable]) {
            varMeanings[ctx.variable] = {
                occurrences: 0,
                contexts: []
            };
        }
        varMeanings[ctx.variable].occurrences++;
        if (varMeanings[ctx.variable].contexts.length < 3) { // Keep max 3 examples
            varMeanings[ctx.variable].contexts.push({
                before: ctx.before.slice(-80),
                after: ctx.after.slice(0, 30)
            });
        }
    });

    return varMeanings;
}

// Process ONE template first - Calidad de Aire
const testFile = path.join(templatesDir, 'FO-PO-PSM-66-18 FORMATO PARA LA ELABORACIÓN DE INFORMES DE CALIDAD DE AIRE-plantilla.docx');
const contexts = extractVarsWithContext(testFile);
const meanings = analyzeContext(contexts);

console.log('=== CALIDAD DE AIRE - Variable Context Analysis ===\n');
Object.entries(meanings).slice(0, 30).forEach(([varName, data]) => {
    console.log(`\n### ${varName} (${data.occurrences} occurrences)`);
    data.contexts.forEach((ctx, i) => {
        console.log(`  [${i + 1}] BEFORE: "...${ctx.before}"`);
        console.log(`      AFTER: "${ctx.after}..."`);
    });
});

// Save full analysis
fs.writeFileSync('./server/src/config/variableContexts.json', JSON.stringify(meanings, null, 2));
console.log('\n\nFull analysis saved to variableContexts.json');
