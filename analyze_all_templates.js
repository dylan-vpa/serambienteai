/**
 * Deep Template Analyzer
 * Extracts variables and comments from all DOCX templates
 * to create a comprehensive mapping configuration
 */

const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const { DOMParser } = require('xmldom');

const templatesDir = './server/templates/reports';
const outputFile = './server/src/config/templateMappings.json';

function parseXML(xmlString) {
    return new DOMParser().parseFromString(xmlString, 'text/xml');
}

function extractComments(zip) {
    try {
        const commentsXml = zip.file('word/comments.xml')?.asText();
        if (!commentsXml) return {};

        const doc = parseXML(commentsXml);
        const comments = doc.getElementsByTagName('w:comment');
        const commentMap = {};

        for (let i = 0; i < comments.length; i++) {
            const comment = comments[i];
            const id = comment.getAttribute('w:id');
            const textNodes = comment.getElementsByTagName('w:t');
            let text = '';
            for (let j = 0; j < textNodes.length; j++) {
                text += textNodes[j].textContent + ' ';
            }
            commentMap[id] = text.trim();
        }
        return commentMap;
    } catch (e) {
        return {};
    }
}

function extractVariablesWithContext(zip) {
    try {
        const docXml = zip.file('word/document.xml')?.asText();
        if (!docXml) return [];

        // Find all {var_N} patterns and nearby comment references
        const varRegex = /\{([a-zA-Z0-9_]+)\}/g;
        const commentRefRegex = /w:commentRangeStart w:id="(\d+)"/g;

        const variables = [];
        let match;
        while ((match = varRegex.exec(docXml)) !== null) {
            variables.push({
                name: match[1],
                position: match.index
            });
        }

        // Find comment positions
        const commentPositions = [];
        while ((match = commentRefRegex.exec(docXml)) !== null) {
            commentPositions.push({
                id: match[1],
                position: match.index
            });
        }

        return { variables, commentPositions };
    } catch (e) {
        return { variables: [], commentPositions: [] };
    }
}

function analyzeTemplate(filePath) {
    const content = fs.readFileSync(filePath, 'binary');
    const zip = new PizZip(content);

    const comments = extractComments(zip);
    const { variables, commentPositions } = extractVariablesWithContext(zip);

    // Try to associate variables with nearby comments
    const variableDescriptions = {};

    variables.forEach(v => {
        // Find the closest preceding comment
        let closestComment = null;
        let closestDistance = Infinity;

        commentPositions.forEach(cp => {
            const distance = v.position - cp.position;
            if (distance > 0 && distance < closestDistance) {
                closestDistance = distance;
                closestComment = cp.id;
            }
        });

        if (closestComment && comments[closestComment]) {
            variableDescriptions[v.name] = {
                description: comments[closestComment],
                commentId: closestComment
            };
        } else {
            variableDescriptions[v.name] = {
                description: 'No comment found',
                commentId: null
            };
        }
    });

    return {
        totalVariables: variables.length,
        totalComments: Object.keys(comments).length,
        variables: [...new Set(variables.map(v => v.name))],
        variableDescriptions,
        allComments: comments
    };
}

// Main execution
const templates = fs.readdirSync(templatesDir).filter(f => f.endsWith('.docx'));
const fullAnalysis = {};

templates.forEach(filename => {
    console.log(`Analyzing: ${filename}`);
    const filePath = path.join(templatesDir, filename);
    const analysis = analyzeTemplate(filePath);

    // Extract template type from filename
    const typeMatch = filename.match(/INFORMES? (?:TÉCNICOS? )?(?:DE |PREVIOS EN )?(.+?)-plantilla\.docx$/i);
    const templateType = typeMatch ? typeMatch[1].trim() : filename;

    fullAnalysis[templateType] = {
        filename,
        ...analysis
    };
});

// Write output
fs.writeFileSync(outputFile, JSON.stringify(fullAnalysis, null, 2));
console.log(`\nAnalysis complete! Saved to ${outputFile}`);
console.log(`\nSummary:`);
Object.entries(fullAnalysis).forEach(([type, data]) => {
    console.log(`  ${type}: ${data.variables.length} unique variables, ${data.totalComments} comments`);
});
