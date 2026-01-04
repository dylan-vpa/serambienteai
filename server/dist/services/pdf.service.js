"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdfService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const marked_1 = require("marked");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class PDFService {
    /**
     * Extract text from PDF file
     */
    extractText(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`[PDF] Extracting text from: ${filePath}`);
                // 1. Try pdftotext (fast, accurate for digital PDFs)
                try {
                    const { stdout } = yield execAsync(`pdftotext -layout "${filePath}" -`);
                    const text = stdout.trim();
                    if (text.length > 100) {
                        console.log(`[PDF] Digital text extracted (${text.length} chars)`);
                        return text;
                    }
                    console.log('[PDF] Low text content (<100 chars), suspecting scanned document. Trying OCR...');
                }
                catch (e) {
                    console.warn('[PDF] pdftotext failed, falling back to OCR:', e);
                }
                // 2. Fallback to OCR (pdftoppm + tesseract)
                try {
                    const tempDir = path.dirname(filePath);
                    const baseName = path.basename(filePath, path.extname(filePath));
                    const imgPrefix = path.join(tempDir, `${baseName}_ocr`);
                    // Convert PDF to PNGs (150 DPI is usually enough for text)
                    console.log('[OCR] Converting PDF to images...');
                    yield execAsync(`pdftoppm -png -r 150 "${filePath}" "${imgPrefix}"`);
                    // Find generated images
                    const files = fs.readdirSync(tempDir).filter(f => f.startsWith(`${baseName}_ocr`) && f.endsWith('.png'));
                    files.sort(); // Ensure page order
                    let fullText = '';
                    for (const file of files) {
                        const imgPath = path.join(tempDir, file);
                        console.log(`[OCR] Processing page: ${file}`);
                        // Run tesseract on each page (stdout)
                        // Try Spanish (-l spa), fallback to eng if needed, but assuming spa installed or using default
                        // Just using default/eng if spa missing, but typically 'tesseract' works auto
                        try {
                            const { stdout } = yield execAsync(`tesseract "${imgPath}" stdout`);
                            fullText += stdout + '\n\n';
                        }
                        catch (err) {
                            console.error(`[OCR] Failed on page ${file}:`, err);
                        }
                        // Cleanup image
                        try {
                            fs.unlinkSync(imgPath);
                        }
                        catch (e) { }
                    }
                    console.log(`[OCR] Completed. Extracted ${fullText.length} chars.`);
                    return fullText;
                }
                catch (ocrError) {
                    console.error('[OCR] Critical failure:', ocrError);
                }
                // 3. Last resort: pdf-parse (likely fails if scanned)
                const pdfParse = require('pdf-parse');
                const dataBuffer = fs.readFileSync(filePath);
                const data = yield pdfParse(dataBuffer);
                return data.text;
            }
            catch (error) {
                console.error('Error parsing PDF:', error);
                return '';
            }
        });
    }
    /**
     * Generate sampling report PDF
     */
    generateSamplingReport(oit) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Parse data
                const aiData = oit.aiData ? JSON.parse(oit.aiData) : {};
                const stepValidations = oit.stepValidations ? JSON.parse(oit.stepValidations) : {};
                // Prefer template steps if available, logic might need adjustment but sticking to available data
                const steps = ((_a = aiData === null || aiData === void 0 ? void 0 : aiData.data) === null || _a === void 0 ? void 0 : _a.steps) || [];
                // Create HTML content
                const htmlContent = this.generateHTML(oit, steps, stepValidations);
                // Create upload directory if it doesn't exist
                const uploadsDir = path.join(__dirname, '../../uploads/reports');
                if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true });
                }
                // Generate filename
                const filename = `Informe_Muestreo_${oit.oitNumber}_${Date.now()}.pdf`;
                const filepath = path.join(uploadsDir, filename);
                // Generate PDF using Puppeteer
                // Note: Puppeteer must be installed in package.json
                let browser;
                try {
                    const puppeteer = require('puppeteer');
                    browser = yield puppeteer.launch({
                        headless: 'new',
                        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
                    });
                    const page = yield browser.newPage();
                    yield page.setContent(htmlContent, { waitUntil: 'networkidle0' });
                    yield page.pdf({
                        path: filepath,
                        format: 'A4',
                        printBackground: true,
                        margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
                    });
                }
                catch (puppeteerError) {
                    console.error('Puppeteer error:', puppeteerError);
                    // Fallback to HTML if puppeteer fails (e.g. missing libs)
                    const htmlFile = filepath.replace('.pdf', '.html');
                    fs.writeFileSync(htmlFile, htmlContent, 'utf-8');
                    return htmlFile;
                }
                finally {
                    if (browser)
                        yield browser.close();
                }
                return filepath;
            }
            catch (error) {
                console.error('Error generating PDF report:', error);
                throw new Error('Error al generar el informe PDF');
            }
        });
    }
    generateHTML(oit, steps, stepValidations) {
        const date = new Date().toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        let stepsHTML = '';
        steps.forEach((step, index) => {
            var _a, _b, _c;
            const validation = stepValidations[index] || {};
            const validatedIcon = validation.validated ? '✓' : '✗';
            const validatedColor = validation.validated ? '#15803d' : '#ef4444';
            const bgColor = validation.validated ? '#f0fdf4' : '#fef2f2';
            stepsHTML += `
                <div class="step" style="border-left: 4px solid ${validatedColor}; background: ${bgColor};">
                    <div class="step-header">
                        <span class="step-number">Paso ${index + 1}</span>
                        <span class="validation-status" style="color: ${validatedColor}; border-color: ${validatedColor};">
                            ${validatedIcon} ${validation.validated ? 'Validado' : 'No validado'}
                        </span>
                    </div>
                    <h3>${step.description || `Paso ${index + 1}`}</h3>
                    <div class="step-data">
                        <h4 style="color: ${validatedColor};">Respuesta:</h4>
                        <p class="data-value">${typeof ((_a = validation.data) === null || _a === void 0 ? void 0 : _a.value) === 'boolean'
                ? (validation.data.value ? 'Sí' : 'No')
                : (((_b = validation.data) === null || _b === void 0 ? void 0 : _b.value) || 'Sin dato principal')}</p>
                        ${((_c = validation.data) === null || _c === void 0 ? void 0 : _c.comment) ? `<p class="data-comment"><strong>Comentario:</strong> ${validation.data.comment}</p>` : ''}
                    </div>
                    ${validation.feedback ? `
                    <div class="step-feedback">
                        <h4 style="color: ${validatedColor};">Análisis de Paso:</h4>
                        <div class="markdown-content">${marked_1.marked.parse(validation.feedback)}</div>
                    </div>` : ''}
                </div>
            `;
        });
        return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Informe de Muestreo - ${oit.oitNumber}</title>
    <style>
        body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; line-height: 1.6; background-color: #fff; }
        .container { max-width: 1000px; margin: 0 auto; }
        
        .header { text-align: center; border-bottom: 2px solid #22c55e; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #14532d; font-size: 28px; margin-bottom: 5px; }
        .header .oit-number { font-size: 18px; color: #64748b; font-weight: 600; }
        
        .meta-info { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .meta-item label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; display: block; }
        .meta-item value { font-size: 15px; color: #1e293b; font-weight: 500; }
        
        .section-title { color: #14532d; border-bottom: 2px solid #bbf7d0; padding-bottom: 8px; margin: 40px 0 20px 0; font-size: 22px; }
        
        .step { margin-bottom: 25px; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; page-break-inside: avoid; }
        .step-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .step-number { font-weight: 700; color: #64748b; font-size: 13px; text-transform: uppercase; }
        .validation-status { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; border: 1px solid; background: #fff; }
        .step h3 { color: #14532d; margin-bottom: 15px; font-size: 18px; }
        
        .step-data h4 { font-size: 13px; margin-bottom: 5px; text-transform: uppercase; }
        .data-value { font-size: 16px; color: #1e293b; margin-bottom: 10px; font-weight: 500; background: #fff; padding: 10px; border-radius: 4px; border: 1px solid #e2e8f0; }
        .data-comment { font-size: 14px; color: #475569; }
        
        .step-feedback { margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(0,0,0,0.05); }
        .step-feedback h4 { font-size: 13px; margin-bottom: 10px; text-transform: uppercase; }
        
        .analysis-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 6px solid #22c55e; padding: 30px; border-radius: 8px; margin-top: 40px; }
        .analysis-card h2 { color: #14532d; margin-top: 0; margin-bottom: 20px; font-size: 24px; border-bottom: 1px solid #bbf7d0; padding-bottom: 10px; }
        
        /* Markdown Styling */
        .markdown-content { font-size: 14px; color: #1e293b; }
        .markdown-content p { margin-bottom: 12px; }
        .markdown-content ul, .markdown-content ol { margin-bottom: 16px; padding-left: 20px; }
        .markdown-content li { margin-bottom: 6px; }
        .markdown-content strong { color: #14532d; }
        
        /* Table Styles (Premium) */
        .markdown-content table { width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #bbf7d0; border-radius: 8px; overflow: hidden; }
        .markdown-content thead { background-color: #dcfce7; color: #14532d; }
        .markdown-content th { text-align: left; padding: 12px 16px; font-weight: 600; border-bottom: 2px solid #bbf7d0; }
        .markdown-content td { padding: 10px 16px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        .markdown-content tr:nth-child(even) { background-color: #f7fee7; }
        
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Informe de Muestreo Ambiental</h1>
            <div class="oit-number">OIT: ${oit.oitNumber}</div>
        </div>

        <div class="meta-info">
            <div class="meta-item">
                <label>Descripción del Servicio</label>
                <value>${oit.description || 'Sin descripción'}</value>
            </div>
            <div class="meta-item">
                <label>Ubicación / Coordenadas</label>
                <value>${oit.location || 'No especificada'}</value>
            </div>
            <div class="meta-item">
                <label>Fecha de Operación</label>
                <value>${new Date(oit.createdAt).toLocaleDateString('es-CO')}</value>
            </div>
            <div class="meta-item">
                <label>Fecha de Emisión del Informe</label>
                <value>${date}</value>
            </div>
        </div>

        <h2 class="section-title">Registro de Pasos de Muestreo</h2>
        <div class="steps-container">
            ${stepsHTML}
        </div>

        ${oit.finalAnalysis ? `
        <div class="analysis-card">
            <h2>Análisis de Supervisión IA</h2>
            <div class="markdown-content">
                ${marked_1.marked.parse(oit.finalAnalysis)}
            </div>
        </div>
        ` : ''}

        <div class="footer">
            <p>Este documento es un registro oficial de actividades de muestreo generado por el sistema ALS V2.</p>
            <p>Certificado de autenticidad electrónica - ${date}</p>
        </div>
    </div>
</body>
</html>
        `;
    }
    generatePDFFromHTML(htmlContent, filename) {
        return __awaiter(this, void 0, void 0, function* () {
            const uploadsDir = path.join(__dirname, '../../uploads/reports');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            const filepath = path.join(uploadsDir, filename);
            let browser;
            try {
                const puppeteer = require('puppeteer');
                browser = yield puppeteer.launch({
                    headless: 'new',
                    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
                });
                const page = yield browser.newPage();
                yield page.setContent(htmlContent, { waitUntil: 'networkidle0' });
                yield page.pdf({
                    path: filepath,
                    format: 'A4',
                    printBackground: true,
                    margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
                });
                return filepath;
            }
            catch (puppeteerError) {
                console.error('Puppeteer error:', puppeteerError);
                const htmlFile = filepath.replace('.pdf', '.html');
                fs.writeFileSync(htmlFile, htmlContent, 'utf-8');
                return htmlFile;
            }
            finally {
                if (browser)
                    yield browser.close();
            }
        });
    }
}
exports.pdfService = new PDFService();
