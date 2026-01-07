
import * as XLSX from 'xlsx';
import * as path from 'path';

const wb = XLSX.utils.book_new();

// -- Sheet 1: General Info & Air Quality --
const airData = [
    ["CLIENTE", "Industrias Solares S.A.", "", "FECHA", "04/01/2026"],
    ["UBICACION", "Planta Principal - Zona Norte", "", "OIT", "OIT-2026-001"],
    [],
    ["--- DATOS DE CAMPO: CALIDAD DE AIRE ---"],
    ["Punto", "Parametro", "Filtro ID", "Flujo Inicial (L/min)", "Flujo Final (L/min)", "Hora Inicio", "Hora Fin", "Total Horas"],
    ["Norte-01", "PM10", "FL-1023", 16.7, 16.6, "08:00", "08:00", 24],
    ["Norte-01", "PM2.5", "FL-2045", 4.0, 4.0, "08:00", "08:00", 24],
    [],
    ["Condiciones Climáticas", "Soleado", "Viento", "Calma", "Humedad", "55%"]
];

const wsAir = XLSX.utils.aoa_to_sheet(airData);
XLSX.utils.book_append_sheet(wb, wsAir, "Calidad Aire");

// -- Sheet 2: Noise --
const noiseData = [
    ["CLIENTE", "Industrias Solares S.A.", "", "FECHA", "04/01/2026"],
    ["UBICACION", "Planta Principal - Zona Norte", "", "OIT", "OIT-2026-001"],
    [],
    ["--- DATOS DE CAMPO: RUIDO AMBIENTAL ---"],
    ["Punto", "Horario", "Hora Medida", "Leq (dB)", "Lmin (dB)", "Lmax (dB)", "Observaciones"],
    ["Ruido-01", "Diurno", "10:00", 62.1, 58.0, 65.4, "Transito vehicular moderado"],
    ["Ruido-01", "Diurno", "14:00", 63.0, 59.2, 66.1, "Operacion normal planta"],
    ["Ruido-01", "Nocturno", "22:00", 53.8, 50.1, 56.2, "Sin actividad industrial"],
    ["Ruido-01", "Nocturno", "02:00", 54.4, 51.0, 57.0, "Ruido de fondo (viento)"]
];

const wsNoise = XLSX.utils.aoa_to_sheet(noiseData);
XLSX.utils.book_append_sheet(wb, wsNoise, "Ruido");

const outputPath = path.resolve(__dirname, '../../public/Planilla_Prueba_AI.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`Planilla generada exitosamente en: ${outputPath}`);
