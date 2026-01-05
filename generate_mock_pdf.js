const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    const htmlContent = `
  <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        h1 { color: #2c3e50; }
        .header { margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>REPORTE DE LABORATORIO AMBIENTAL</h1>
        <p><strong>No. Informe:</strong> LAB-2026-001 | <strong>Fecha:</strong> 04/01/2026</p>
        <p><strong>Cliente:</strong> Industrias Solares S.A.</p>
      </div>

      <h2>1. RESULTADOS DE CALIDAD DE AIRE</h2>
      <p>Estación: Norte-01 | Periodo: 24 Horas</p>
      <table>
        <tr><th>Parámetro</th><th>Resultado</th><th>Unidad</th><th>Límite</th><th>Cumplimiento</th></tr>
        <tr><td>PM10</td><td>45.2</td><td>ug/m3</td><td>75.0</td><td>CUMPLE</td></tr>
        <tr><td>PM2.5</td><td>12.8</td><td>ug/m3</td><td>37.0</td><td>CUMPLE</td></tr>
      </table>

      <h2>2. RESULTADOS DE RUIDO</h2>
      <table>
        <tr><th>Punto</th><th>Horario</th><th>Leq (dB)</th><th>Límite</th><th>Cumplimiento</th></tr>
        <tr><td>Ruido-01</td><td>Diurno</td><td>62.5</td><td>65.0</td><td>CUMPLE</td></tr>
        <tr><td>Ruido-01</td><td>Nocturno</td><td>54.1</td><td>55.0</td><td>CUMPLE</td></tr>
      </table>
      
      <h3>3. CONCLUSIONES</h3>
      <p>Todo se encuentra dentro de la normativa vigente.</p>
    </body>
  </html>
  `;

    await page.setContent(htmlContent);
    // Ensure directory exists
    if (!fs.existsSync('public')) {
        fs.mkdirSync('public');
    }

    await page.pdf({ path: 'public/Reporte_Prueba_AI.pdf', format: 'A4' });
    await browser.close();
    console.log('PDF Generated: public/Reporte_Prueba_AI.pdf');
})();
