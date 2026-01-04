/**
 * Script para importar normas desde la carpeta de uploads
 * Lee PDFs y XLSX, extrae el contenido, y lo guarda en la BD
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

// Directorio con los archivos de normas
const NORMAS_DIR = path.join(__dirname, '../../uploads/NORMAS INFORMES-20260104T155222Z-3-001/NORMAS INFORMES');

// Mapeo de palabras clave a categorías
const CATEGORY_KEYWORDS: Record<string, string[]> = {
    'agua_potable': ['agua potable', '2115', 'potable'],
    'vertimientos': ['vertimientos', '631', 'alcantarillado', 'aguas superficiales'],
    'aguas_marinas': ['marinas', '883', '0501'],
    'aguas_residuales': ['residuales', '0699', 'tratadas al suelo'],
    'piscina': ['piscina', '1618'],
    'ruido': ['ruido', '0627', 'ruido ambiental'],
    'aire': ['calidad de aire', '2254', 'calidad del aire'],
    'olores': ['olores', '1541', 'olores ofensivos'],
    'fuentes_fijas': ['fuentes fijas', '909', '1309', 'emisión'],
    'reuso': ['reuso', '1256'],
    'decreto': ['decreto', '1076', '703', '050'],
    'lousiana': ['lousiana', 'louisiana']
};

function detectCategory(filename: string): string {
    const lowerName = filename.toLowerCase();
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(kw => lowerName.includes(kw.toLowerCase()))) {
            return category;
        }
    }
    return 'general';
}

function generateTitle(filename: string): string {
    // Remove extension and clean up the filename
    return filename
        .replace(/\.(pdf|xlsx|xls|doc|docx)$/i, '')
        .replace(/[-_]/g, ' ')
        .replace(/\+/g, ' ')
        .trim();
}

async function extractPdfContent(filePath: string): Promise<string> {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        // Limit content to avoid DB issues (SQLite TEXT has no practical limit but we should be reasonable)
        return data.text.substring(0, 100000); // First 100k characters
    } catch (error) {
        console.error(`Error extracting PDF ${filePath}:`, error);
        return '';
    }
}

function extractXlsxContent(filePath: string): string {
    try {
        const workbook = XLSX.readFile(filePath);
        let content = '';

        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            // Convert sheet to text format
            const text = XLSX.utils.sheet_to_txt(sheet);
            content += `\n=== Hoja: ${sheetName} ===\n${text}\n`;
        }

        return content.substring(0, 100000); // First 100k characters
    } catch (error) {
        console.error(`Error extracting XLSX ${filePath}:`, error);
        return '';
    }
}

async function importStandards() {
    console.log('🚀 Iniciando importación de normas...');
    console.log(`📁 Directorio: ${NORMAS_DIR}`);

    if (!fs.existsSync(NORMAS_DIR)) {
        console.error('❌ El directorio de normas no existe:', NORMAS_DIR);
        process.exit(1);
    }

    const files = fs.readdirSync(NORMAS_DIR);
    console.log(`📄 Archivos encontrados: ${files.length}`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const filename of files) {
        const filePath = path.join(NORMAS_DIR, filename);
        const ext = path.extname(filename).toLowerCase();

        // Skip non-supported files
        if (!['.pdf', '.xlsx', '.xls'].includes(ext)) {
            console.log(`⏭️  Saltando (formato no soportado): ${filename}`);
            skipped++;
            continue;
        }

        console.log(`\n📖 Procesando: ${filename}`);

        const title = generateTitle(filename);
        const category = detectCategory(filename);

        // Check if already exists
        const existing = await prisma.standard.findFirst({
            where: { title }
        });

        if (existing) {
            console.log(`   ⏭️  Ya existe en BD, actualizando contenido...`);
            // Update existing with content
            let content = '';
            if (ext === '.pdf') {
                content = await extractPdfContent(filePath);
            } else if (['.xlsx', '.xls'].includes(ext)) {
                content = extractXlsxContent(filePath);
            }

            await prisma.standard.update({
                where: { id: existing.id },
                data: {
                    content,
                    category,
                    fileUrl: filePath,
                    updatedAt: new Date()
                }
            });
            imported++;
            continue;
        }

        // Extract content
        let content = '';
        try {
            if (ext === '.pdf') {
                content = await extractPdfContent(filePath);
            } else if (['.xlsx', '.xls'].includes(ext)) {
                content = extractXlsxContent(filePath);
            }

            console.log(`   📝 Contenido extraído: ${content.length} caracteres`);
            console.log(`   🏷️  Categoría: ${category}`);

            // Create in database
            await prisma.standard.create({
                data: {
                    title,
                    description: `Norma importada automáticamente desde ${filename}`,
                    type: 'OIT',
                    fileUrl: filePath,
                    content,
                    category
                }
            });

            console.log(`   ✅ Importado exitosamente`);
            imported++;

        } catch (error) {
            console.error(`   ❌ Error:`, error);
            errors++;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN DE IMPORTACIÓN');
    console.log('='.repeat(50));
    console.log(`✅ Importados/Actualizados: ${imported}`);
    console.log(`⏭️  Saltados: ${skipped}`);
    console.log(`❌ Errores: ${errors}`);
    console.log('='.repeat(50));

    // Show categories summary
    const categorySummary = await prisma.standard.groupBy({
        by: ['category'],
        _count: { id: true }
    });

    console.log('\n📁 NORMAS POR CATEGORÍA:');
    for (const cat of categorySummary) {
        console.log(`   ${cat.category || 'sin categoría'}: ${cat._count.id} normas`);
    }
}

// Run the import
importStandards()
    .then(() => {
        console.log('\n🎉 Importación completada');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error fatal:', error);
        process.exit(1);
    })
    .finally(() => {
        prisma.$disconnect();
    });
