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
class PDFService {
    /**
     * Extract text from PDF file
     */
    extractText(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
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
            var _a, _b, _c, _d, _e;
            const validation = stepValidations[index] || {};
            const validatedIcon = validation.validated ? '✓' : '✗';
            const validatedColor = validation.validated ? '#10b981' : '#ef4444';
            stepsHTML += `
                <div class="step">
                    <div class="step-header">
                        <span class="step-number">Paso ${index + 1}</span>
                        <span class="validation-status" style="color: ${validatedColor}; border-color: ${validatedColor};">
                            ${validatedIcon} ${validation.validated ? 'Validado' : 'No validado'}
                        </span>
                    </div>
                    <h3>${step.description || `Paso ${index + 1}`}</h3>
                    <div class="step-data">
                        <h4>Respuesta:</h4>
                        <p class="data-value">${typeof ((_a = validation.data) === null || _a === void 0 ? void 0 : _a.value) === 'boolean'
                ? (validation.data.value ? 'Sí' : 'No')
                : (((_b = validation.data) === null || _b === void 0 ? void 0 : _b.value) || 'Sin dato principal')}</p>
                        ${((_c = validation.data) === null || _c === void 0 ? void 0 : _c.comment) ? `<p class="data-comment"><strong>Comentario:</strong> ${validation.data.comment}</p>` : ''}
                        ${((_e = (_d = validation.data) === null || _d === void 0 ? void 0 : _d.files) === null || _e === void 0 ? void 0 : _e.length) ? `<p class="data-files"><strong>Archivos:</strong> ${validation.data.files.join(', ')}</p>` : ''}
                    </div>
                    <div class="step-feedback">
                        <h4>Retroalimentación de IA:</h4>
                        <p>${validation.feedback || 'N/A'}</p>
                    </div>
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
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
            padding: 40px 20px;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #4f46e5;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #4f46e5;
            font-size: 28px;
            margin-bottom: 10px;
        }
        .header .oit-number {
            font-size: 18px;
            color: #64748b;
            font-weight: 500;
        }
        .meta-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
        }
        .meta-item {
            display: flex;
            flex-direction: column;
        }
        .meta-item label {
            font-size: 12px;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 4px;
            font-weight: 600;
        }
        .meta-item value {
            font-size: 16px;
            color: #1e293b;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h2 {
            color: #1e293b;
            font-size: 20px;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
        }
        .step {
            margin-bottom: 25px;
            padding: 20px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: #fafafa;
        }
        .step-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .step-number {
            font-weight: 600;
            color: #4f46e5;
            font-size: 14px;
        }
        .validation-status {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            border: 2px solid;
        }
        .step h3 {
            color: #1e293b;
            font-size: 16px;
            margin-bottom: 15px;
        }
        .step-data, .step-feedback {
            margin-top: 15px;
        }
        .step-data h4, .step-feedback h4 {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 8px;
        }
        .step-data pre {
            background: #f1f5f9;
            padding: 12px;
            border-radius: 4px;
            font-size: 12px;
            overflow-x: auto;
        }
        .step-feedback p {
            color: #475569;
            font-size: 14px;
        }
        .analysis {
            background: #f0f9ff;
            border-left: 4px solid #0ea5e9;
            padding: 20px;
            margin-top: 30px;
            border-radius: 4px;
        }
        .analysis h2 {
            color: #0369a1;
            border-bottom: none;
            margin-bottom: 15px;
        }
        .analysis-content {
            color: #1e293b;
            white-space: pre-wrap;
            line-height: 1.8;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 12px;
        }
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
                <label>Descripción</label>
                <value>${oit.description || 'N/A'}</value>
            </div>
            <div class="meta-item">
                <label>Ubicación</label>
                <value>${oit.location || 'N/A'}</value>
            </div>
            <div class="meta-item">
                <label>Fecha de Creación</label>
                <value>${new Date(oit.createdAt).toLocaleDateString('es-CO')}</value>
            </div>
            <div class="meta-item">
                <label>Fecha de Informe</label>
                <value>${date}</value>
            </div>
        </div>

        <div class="section">
            <h2>Pasos de Muestreo Realizados</h2>
            ${stepsHTML}
        </div>

        ${oit.finalAnalysis ? `
        <div class="analysis">
            <h2>Análisis Final</h2>
            <div class="analysis-content">${oit.finalAnalysis}</div>
        </div>
        ` : ''}

        <div class="footer">
            <p>Documento generado automáticamente por el Sistema de Gestión de Laboratorio</p>
            <p>${date}</p>
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
