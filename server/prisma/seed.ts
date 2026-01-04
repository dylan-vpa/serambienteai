
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database with Sampling Templates...');

    // Limpiar templates existentes
    try {
        await prisma.samplingTemplate.deleteMany({});
        console.log('   - Cleared existing templates.');
    } catch (e) {
        console.log('   - No existing templates to clear or table missing.');
    }

    const headerSteps = [
        { order: -6, title: 'Cliente', description: 'Nombre del cliente', icon: 'User', type: 'INPUT', required: true },
        { order: -5, title: 'Número OT', description: 'Número de Orden de Trabajo', icon: 'Hash', type: 'INPUT', required: true },
        { order: -4, title: 'Responsable en Campo', description: 'Nombre del técnico responsable', icon: 'UserCheck', type: 'INPUT', required: true },
        { order: -3, title: 'Fecha de Inicio', description: 'Fecha y hora de inicio', icon: 'Calendar', type: 'INPUT', inputType: 'datetime-local', required: true },
        { order: -2, title: 'Fecha de Fin', description: 'Fecha y hora de finalización', icon: 'CalendarClock', type: 'INPUT', inputType: 'datetime-local', required: true },
        { order: -1, title: 'Coordenadas de la Estación', description: 'Latitud y Longitud', icon: 'MapPin', type: 'INPUT', required: true }
    ];

    const wasteSteps = [
        ...headerSteps,
        { order: 1, title: 'Segregación', description: 'Identificar y separar tipos de residuos', icon: 'List' },
        { order: 2, title: 'Pesaje', description: 'Pesar cada corriente de residuos', icon: 'Scale' },
        { order: 3, title: 'Homogeneización', description: 'Mezclar residuos para muestra compuesta (Cuarteo)', icon: 'RefreshCw' },
        { order: 4, title: 'Envasado', description: 'Envasar muestra en recipiente adecuado', icon: 'Package' },
        { order: 5, title: 'Etiquetado', description: 'Rotular muestra con ID único', icon: 'Tag' }
    ];

    const noiseSteps = [
        ...headerSteps,
        { order: 1, title: 'Verificación Meteorológica', description: 'Registrar condiciones de clima (Lluvia, Viento, Humedad)', icon: 'CloudSun' },
        { order: 2, title: 'Calibración Inicial', description: 'Realizar y registrar calibración del sonómetro antes de la medición', icon: 'Settings' },
        { order: 3, title: 'Medición Ruido de Fondo', description: 'Medir nivel de presión sonora sin la fuente activa', icon: 'Volume1' },
        { order: 4, title: 'Medición de Fuente', description: 'Realizar medición de la fuente de ruido (1.5m altura)', icon: 'Volume2' },
        { order: 5, title: 'Calibración Final', description: 'Verificar calibración post-medición (Desviación < 0.5 dB)', icon: 'CheckCircle' },
        { order: 6, title: 'Croquis y Evidencia', description: 'Dibujar croquis de ubicación y tomar fotos', icon: 'Map' }
    ];

    const airSteps = [
        ...headerSteps,
        { order: 1, title: 'Inspección de Sitio', description: 'Verificar condiciones de seguridad y acceso a plataforma', icon: 'Eye' },
        { order: 2, title: 'Armado de Tren', description: 'Ensamblar tren de muestreo y verificar componentes', icon: 'Tool' },
        { order: 3, title: 'Prueba de Fugas', description: 'Realizar prueba de hermeticidad del sistema', icon: 'Activity' },
        { order: 4, title: 'Toma de Muestra', description: 'Ejecutar muestreo isocinético o de gases según norma', icon: 'Wind' },
        { order: 5, title: 'Recuperación', description: 'Recuperar muestras y lavar sondas', icon: 'Beaker' },
        { order: 6, title: 'Cadena de Custodia', description: 'Embalar y etiquetar muestras para laboratorio', icon: 'FileText' }
    ];

    const templates = [
        // RESPEL
        {
            name: 'Caracterización de RESPEL',
            oitType: 'Residuos',
            description: 'Estudio y caracterización de residuos peligrosos',
            reportTemplateFile: 'FO-PO-PSM-64-09 FORMATO PARA LA ELABORACIÓN DE INFORMES TÉCNICOS DE ESTUDIO DE CARACTERIZACIÓN DE RESPEL-plantilla.docx',
            steps: wasteSteps
        },
        {
            name: 'Punto Seco',
            oitType: 'Residuos',
            description: 'Informe de punto seco',
            reportTemplateFile: 'FO-PO-PSM-64-10 FORMATO PARA LA ELABORACIÓN DE INFORME PUNTO SECO-plantilla.docx',
            steps: wasteSteps
        },
        // RUIDO
        {
            name: 'Ruido - Emisión',
            oitType: 'Ruido',
            description: 'Estudio de emisión de ruido de fuentes específicas',
            reportTemplateFile: 'FO-PO-PSM-65-06 FORMATO PARA LA ELABORACIÓN DE INFORMES TÉCNICOS DE ESTUDIO DE EMISIÓN DE RUIDO-plantilla.docx',
            steps: noiseSteps
        },
        {
            name: 'Ruido - Ambiental',
            oitType: 'Ruido',
            description: 'Estudio de ruido ambiental en área de influencia',
            reportTemplateFile: 'FO-PO-PSM-65-07 FORMATO PARA LA ELABORACIÓN DE INFORMES TÉCNICOS DE ESTUDIO DE RUIDO AMBIENTAL-plantilla.docx',
            steps: noiseSteps
        },
        {
            name: 'Ruido - Intradomiciliario',
            oitType: 'Ruido',
            description: 'Estudio de inmisión de ruido intradomiciliario',
            reportTemplateFile: 'FO-PO-PSM-65-08 FORMATO PARA LA ELABORACIÓN DE INFORMES TÉCNICOS DE ESTUDIO DE RUIDO INTRADOMICILIARIO-plantilla.docx',
            steps: noiseSteps
        },
        {
            name: 'Ruido - Emisión y Ambiental',
            oitType: 'Ruido',
            description: 'Estudio combinado de emisión y ruido ambiental',
            reportTemplateFile: 'FO-PO-PSM-65-09 FORMATO PARA LA ELABORACIÓN DE INFORMES TÉCNICOS DE ESTUDIO DE EMISIÓN DE RUIDO Y RUIDO AMBIENTAL-plantilla.docx',
            steps: noiseSteps
        },
        // AIRE
        {
            name: 'Calidad de Aire',
            oitType: 'Aire',
            description: 'Monitoreo de calidad de aire (PM10, PM2.5, Gases)',
            reportTemplateFile: 'FO-PO-PSM-66-18 FORMATO PARA LA ELABORACIÓN DE INFORMES DE CALIDAD DE AIRE-plantilla.docx',
            steps: airSteps
        },
        {
            name: 'Olores Ofensivos',
            oitType: 'Aire',
            description: 'Evaluación de olores ofensivos',
            reportTemplateFile: 'FO-PO-PSM-66-19 FORMATO PARA LA ELABORACIÓN DE INFORMES DE OLORES OFENSIVOS-plantilla.docx',
            steps: airSteps
        },
        {
            name: 'Partículas Viables',
            oitType: 'Aire',
            description: 'Muestreo de partículas viables (Microbiología aire)',
            reportTemplateFile: 'FO-PO-PSM-66-20 FORMATO PARA LA ELABORACIÓN DE INFORMES DE PARTÍCULAS VIABLES-plantilla.docx',
            steps: airSteps
        },
        // FUENTES FIJAS
        {
            name: 'Fuentes Fijas - Previo',
            oitType: 'Fuentes Fijas',
            description: 'Estudio previo isocinético',
            reportTemplateFile: 'FO-PO-PSM-67-10 FORMATO PARA LA ELABORACIÓN DE INFORMES PREVIOS EN FUENTES FIJAS-plantilla.docx',
            steps: airSteps
        },
        {
            name: 'Fuentes Fijas - Informe',
            oitType: 'Fuentes Fijas',
            description: 'Informe final de fuentes fijas',
            reportTemplateFile: 'FO-PO-PSM-67-11 FORMATO PARA LA ELABORACIÓN DE INFORMES DE FUENTES FIJAS-plantilla.docx',
            steps: airSteps
        }
    ];

    for (const t of templates) {
        await prisma.samplingTemplate.create({
            data: {
                name: t.name,
                oitType: t.oitType,
                description: t.description,
                steps: JSON.stringify(t.steps),
                reportTemplateFile: t.reportTemplateFile
            }
        });
    }

    // Create Users if not exist
    const users = await prisma.user.count();
    if (users === 0) {
        console.log('   - Creating default users...');
        const hashedPassword = await bcrypt.hash('admin123', 10);

        await prisma.user.create({
            data: {
                email: 'admin@als.com',
                name: 'Admin ALS',
                password: hashedPassword,
                role: 'SUPER_ADMIN'
            }
        });

        await prisma.user.create({
            data: {
                email: 'ingeniero@als.com',
                name: 'Ingeniero Test',
                password: hashedPassword,
                role: 'ENGINEER'
            }
        });
        console.log('   - Created admin@als.com / admin123 and ingeniero@als.com');
    }

    console.log(`✅ Seed completion: ${templates.length} templates created.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
