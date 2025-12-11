import * as fs from 'fs';
import * as path from 'path';

interface OIT {
    id: string;
    oitNumber: string;
    description: string | null;
    location: string | null;
    aiData: string | null;
    stepValidations: string | null;
    finalAnalysis: string | null;
    createdAt: Date;
}

class PDFService {
    /**
     * Generate sampling report PDF
     */
    async generateSamplingReport(oit: OIT): Promise<string> {
        try {
            // Parse data
            const aiData = oit.aiData ? JSON.parse(oit.aiData) : {};
            const stepValidations = oit.stepValidations ? JSON.parse(oit.stepValidations) : {};
            // Prefer template steps if available, logic might need adjustment but sticking to available data
            const steps = aiData?.data?.steps || [];

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
                browser = await puppeteer.launch({
                    headless: 'new',
                    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
                });
                const page = await browser.newPage();
                await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
                await page.pdf({
                    path: filepath,
                    format: 'A4',
                    printBackground: true,
                    margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
                });
            } catch (puppeteerError) {
                console.error('Puppeteer error:', puppeteerError);
                // Fallback to HTML if puppeteer fails (e.g. missing libs)
                const htmlFile = filepath.replace('.pdf', '.html');
                fs.writeFileSync(htmlFile, htmlContent, 'utf-8');
                return htmlFile;
            } finally {
                if (browser) await browser.close();
            }

            return filepath;
        } catch (error) {
            console.error('Error generating PDF report:', error);
            throw new Error('Error al generar el informe PDF');
        }
    }

    private generateHTML(oit: OIT, steps: any[], stepValidations: any): string {
        const date = new Date().toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        let stepsHTML = '';
        steps.forEach((step: any, index: number) => {
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
                        <p class="data-value">${typeof validation.data?.value === 'boolean'
                    ? (validation.data.value ? 'Sí' : 'No')
                    : (validation.data?.value || 'Sin dato principal')
                }</p>
                        ${validation.data?.comment ? `<p class="data-comment"><strong>Comentario:</strong> ${validation.data.comment}</p>` : ''}
                        ${validation.data?.files?.length ? `<p class="data-files"><strong>Archivos:</strong> ${validation.data.files.join(', ')}</p>` : ''}
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
}

export const pdfService = new PDFService();
