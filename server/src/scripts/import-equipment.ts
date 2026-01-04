/**
 * Script para importar equipos desde el archivo XLSX de Ficha Técnica
 */

import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();

// Path al archivo de equipos
const EQUIPOS_FILE = path.join(__dirname, '../../uploads/FO-PR-MEI-01-01 FICHA TÉCNICA DE EQUIPOS 02.07.25 IA.xlsx');

// Mapeo de estados
function normalizeStatus(status: string | undefined): string {
    if (!status) return 'AVAILABLE';
    const s = status.toUpperCase().trim();
    if (s.includes('OPERATIVO')) return 'AVAILABLE';
    if (s.includes('MANTENIMIENTO')) return 'MAINTENANCE';
    if (s.includes('FUERA') || s.includes('BAJA')) return 'OUT_OF_SERVICE';
    if (s.includes('CALIBRA')) return 'IN_CALIBRATION';
    return 'AVAILABLE';
}

// Limpiar valor N.A.
function cleanNA(value: any): string | null {
    if (!value) return null;
    const str = String(value).trim();
    if (str === 'N.A.' || str === 'NA' || str === 'N/A' || str === '-') return null;
    return str;
}

async function importEquipment() {
    console.log('🔧 Iniciando importación de equipos...');
    console.log(`📁 Archivo: ${EQUIPOS_FILE}`);

    const workbook = XLSX.readFile(EQUIPOS_FILE);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

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
            const existing = await prisma.resource.findFirst({
                where: { code: codigo }
            });

            if (existing) {
                // Actualizar existente
                await prisma.resource.update({
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
            await prisma.resource.create({
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

        } catch (error: any) {
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
    const typeSummary = await prisma.resource.groupBy({
        by: ['type'],
        _count: { id: true }
    });

    console.log('\n📁 EQUIPOS POR TIPO:');
    for (const t of typeSummary) {
        console.log(`   ${t.type}: ${t._count.id} equipos`);
    }

    // Resumen por estado
    const statusSummary = await prisma.resource.groupBy({
        by: ['status'],
        _count: { id: true }
    });

    console.log('\n📊 EQUIPOS POR ESTADO:');
    for (const s of statusSummary) {
        console.log(`   ${s.status}: ${s._count.id} equipos`);
    }
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
