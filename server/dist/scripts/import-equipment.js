"use strict";
/**
 * Script para importar equipos desde el archivo XLSX de Ficha Técnica
 */
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
const client_1 = require("@prisma/client");
const XLSX = __importStar(require("xlsx"));
const path = __importStar(require("path"));
const prisma = new client_1.PrismaClient();
// Path al archivo de equipos
const EQUIPOS_FILE = path.join(__dirname, '../../uploads/FO-PR-MEI-01-01 FICHA TÉCNICA DE EQUIPOS 02.07.25 IA.xlsx');
// Mapeo de estados
function normalizeStatus(status) {
    if (!status)
        return 'AVAILABLE';
    const s = status.toUpperCase().trim();
    if (s.includes('OPERATIVO'))
        return 'AVAILABLE';
    if (s.includes('MANTENIMIENTO'))
        return 'MAINTENANCE';
    if (s.includes('FUERA') || s.includes('BAJA'))
        return 'OUT_OF_SERVICE';
    if (s.includes('CALIBRA'))
        return 'IN_CALIBRATION';
    return 'AVAILABLE';
}
// Limpiar valor N.A.
function cleanNA(value) {
    if (!value)
        return null;
    const str = String(value).trim();
    if (str === 'N.A.' || str === 'NA' || str === 'N/A' || str === '-')
        return null;
    return str;
}
function importEquipment() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔧 Iniciando importación de equipos...');
        console.log(`📁 Archivo: ${EQUIPOS_FILE}`);
        const workbook = XLSX.readFile(EQUIPOS_FILE);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        console.log(`📊 Total filas encontradas: ${data.length}`);
        // Encontrar la fila de encabezados (fila 3 = índice 3)
        const headerRow = 3;
        let imported = 0;
        let skipped = 0;
        let errors = 0;
        // Empezar desde la fila 4 (índice 4)
        for (let i = 4; i < data.length; i++) {
            const row = data[i];
            // Saltar filas vacías o sin código
            if (!row || !row[2]) {
                skipped++;
                continue;
            }
            const codigo = cleanNA(row[2]);
            if (!codigo) {
                skipped++;
                continue;
            }
            try {
                // Verificar si ya existe
                const existing = yield prisma.resource.findFirst({
                    where: { code: codigo }
                });
                if (existing) {
                    // Actualizar existente
                    yield prisma.resource.update({
                        where: { id: existing.id },
                        data: {
                            name: String(row[1] || 'Sin nombre').trim(),
                            type: String(row[0] || 'General').trim(),
                            brand: cleanNA(row[3]),
                            model: cleanNA(row[4]),
                            serial: cleanNA(row[5]),
                            location: cleanNA(row[6]),
                            maintenanceType: cleanNA(row[7]),
                            maintenanceFrequency: cleanNA(row[8]),
                            requiresCalibration: String(row[9]).toUpperCase().includes('SI'),
                            calibrationFrequency: cleanNA(row[10]),
                            variable: cleanNA(row[12]),
                            workRange: cleanNA(row[13]),
                            resolution: cleanNA(row[14]),
                            calibrationPoints: cleanNA(row[15]),
                            status: normalizeStatus(String(row[16])),
                            observations: cleanNA(row[17]),
                            updatedAt: new Date()
                        }
                    });
                    imported++;
                    continue;
                }
                // Crear nuevo
                yield prisma.resource.create({
                    data: {
                        name: String(row[1] || 'Sin nombre').trim(),
                        type: String(row[0] || 'General').trim(),
                        code: codigo,
                        brand: cleanNA(row[3]),
                        model: cleanNA(row[4]),
                        serial: cleanNA(row[5]),
                        location: cleanNA(row[6]),
                        maintenanceType: cleanNA(row[7]),
                        maintenanceFrequency: cleanNA(row[8]),
                        requiresCalibration: String(row[9]).toUpperCase().includes('SI'),
                        calibrationFrequency: cleanNA(row[10]),
                        variable: cleanNA(row[12]),
                        workRange: cleanNA(row[13]),
                        resolution: cleanNA(row[14]),
                        calibrationPoints: cleanNA(row[15]),
                        status: normalizeStatus(String(row[16])),
                        observations: cleanNA(row[17]),
                        quantity: 1
                    }
                });
                imported++;
                if (imported % 50 === 0) {
                    console.log(`   ✅ ${imported} equipos importados...`);
                }
            }
            catch (error) {
                console.error(`   ❌ Error en fila ${i} (${codigo}):`, error.message);
                errors++;
            }
        }
        console.log('\n' + '='.repeat(50));
        console.log('📊 RESUMEN DE IMPORTACIÓN DE EQUIPOS');
        console.log('='.repeat(50));
        console.log(`✅ Importados/Actualizados: ${imported}`);
        console.log(`⏭️  Saltados: ${skipped}`);
        console.log(`❌ Errores: ${errors}`);
        console.log('='.repeat(50));
        // Resumen por tipo
        const typeSummary = yield prisma.resource.groupBy({
            by: ['type'],
            _count: { id: true }
        });
        console.log('\n📁 EQUIPOS POR TIPO:');
        for (const t of typeSummary) {
            console.log(`   ${t.type}: ${t._count.id} equipos`);
        }
        // Resumen por estado
        const statusSummary = yield prisma.resource.groupBy({
            by: ['status'],
            _count: { id: true }
        });
        console.log('\n📊 EQUIPOS POR ESTADO:');
        for (const s of statusSummary) {
            console.log(`   ${s.status}: ${s._count.id} equipos`);
        }
    });
}
// Ejecutar
importEquipment()
    .then(() => {
    console.log('\n🎉 Importación de equipos completada');
    process.exit(0);
})
    .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
})
    .finally(() => {
    prisma.$disconnect();
});
