/**
 * Script para crear Sampling Templates basado en las planillas existentes
 * Cada subcarpeta de PLANILLAS se convierte en una plantilla web con pasos dinámicos
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

const PLANILLAS_DIR = path.join(__dirname, '../../uploads/PLANILLAS');

// Definición de tipos de pasos
type StepType = 'TEXT' | 'INPUT' | 'IMAGE' | 'DOCUMENT' | 'CHECKBOX' | 'SIGNATURE' | 'TABLE' | 'GPS';

interface Step {
    type: StepType;
    title: string;
    description?: string;
    required?: boolean;
    // Para INPUT
    inputType?: 'text' | 'number' | 'date' | 'time' | 'datetime';
    unit?: string;
    placeholder?: string;
    // Para IMAGE
    allowMultiple?: boolean;
    requireGPS?: boolean;
    maxImages?: number;
    // Para TABLE
    columns?: string[];
    rows?: number;
    // Para CHECKBOX
    options?: string[];
    requireComment?: boolean;
}

// Configuración de plantillas por categoría
const TEMPLATE_CONFIGS: Record<string, {
    name: string;
    description: string;
    oitType: string;
    baseSteps: Step[];
}> = {
    'AGUA': {
        name: 'Muestreo de Aguas',
        description: 'Plantilla completa para muestreo de agua potable, residual, superficial y subterránea',
        oitType: 'AGUA',
        baseSteps: [
            { type: 'TEXT', title: 'Instrucciones Generales', description: 'Verificar equipos de protección personal, revisar plan de monitoreo y confirmar puntos de muestreo con el cliente.' },
            { type: 'INPUT', title: 'Cliente', inputType: 'text', required: true, placeholder: 'Nombre del cliente' },
            { type: 'INPUT', title: 'Número OT', inputType: 'text', required: true, placeholder: 'Orden de trabajo' },
            { type: 'INPUT', title: 'Responsable en Campo', inputType: 'text', required: true },
            { type: 'INPUT', title: 'Fecha de Muestreo', inputType: 'date', required: true },
            { type: 'INPUT', title: 'Procedencia de la Muestra', inputType: 'text', placeholder: 'Ej: Agua residual industrial' },
            { type: 'INPUT', title: 'Lugar de Muestreo', inputType: 'text', required: true },
            { type: 'CHECKBOX', title: 'Tipo de Vertimiento', options: ['Red Alcantarillado', 'Cuerpo de Agua Superficial', 'Recirculación', 'Suelo (infiltración)'] },
            { type: 'GPS', title: 'Coordenadas del Punto', description: 'Capturar coordenadas GPS del punto de muestreo', required: true },
            { type: 'IMAGE', title: 'Foto del Punto de Muestreo', allowMultiple: true, requireGPS: true, maxImages: 5 },
            // Parámetros In Situ
            { type: 'TEXT', title: '--- PARÁMETROS IN SITU ---', description: 'Registre las mediciones de campo' },
            { type: 'INPUT', title: 'pH', inputType: 'number', unit: 'unidades de pH', placeholder: '0-14' },
            { type: 'INPUT', title: 'Oxígeno Disuelto', inputType: 'number', unit: 'mg/L' },
            { type: 'INPUT', title: 'Conductividad', inputType: 'number', unit: 'µS/cm' },
            { type: 'INPUT', title: 'Temperatura de la Muestra', inputType: 'number', unit: '°C' },
            { type: 'INPUT', title: 'Temperatura de la Nevera', inputType: 'number', unit: '°C' },
            { type: 'INPUT', title: 'Temperatura Ambiente', inputType: 'number', unit: '°C' },
            { type: 'INPUT', title: 'Apariencia', inputType: 'text', placeholder: 'Color, turbidez, olor' },
            { type: 'INPUT', title: 'Caudal', inputType: 'number', unit: 'L/s' },
            { type: 'CHECKBOX', title: 'Método de Aforo', options: ['Volumétrico', 'Área x Velocidad', 'Flotador', 'Vertederos'] },
            // Verificación de equipos
            { type: 'TEXT', title: '--- VERIFICACIÓN DE EQUIPOS ---', description: 'Complete los datos de verificación' },
            { type: 'INPUT', title: 'ID Multiparámetro', inputType: 'text' },
            { type: 'CHECKBOX', title: 'Verificación Multiparámetro OK', options: ['Sí', 'No'], requireComment: true },
            { type: 'INPUT', title: 'ID Turbidímetro', inputType: 'text' },
            // Observaciones
            { type: 'TEXT', title: '--- OBSERVACIONES ---' },
            { type: 'INPUT', title: 'Observaciones Generales', inputType: 'text', placeholder: 'Condiciones especiales, incidentes, etc.' },
            // Cadena de Custodia
            { type: 'TEXT', title: '--- CADENA DE CUSTODIA ---', description: 'Fotografiar las cadenas de custodia de las muestras' },
            { type: 'IMAGE', title: 'Fotos Cadena de Custodia', allowMultiple: true, maxImages: 10, description: 'Capture todas las cadenas de custodia' },
            // Firmas
            { type: 'SIGNATURE', title: 'Firma del Técnico de Campo', required: true },
            { type: 'SIGNATURE', title: 'Firma del Responsable del Cliente', required: false }
        ]
    },
    'CALIDAD DEL AIRE': {
        name: 'Calidad del Aire',
        description: 'Plantilla para monitoreo de calidad del aire: TSP, PM10, PM2.5, gases y olores',
        oitType: 'AIRE',
        baseSteps: [
            { type: 'TEXT', title: 'Instrucciones de Seguridad', description: 'Verificar condiciones meteorológicas, ubicar equipos en zona segura y señalizada.' },
            { type: 'INPUT', title: 'Cliente', inputType: 'text', required: true },
            { type: 'INPUT', title: 'Número OT', inputType: 'text', required: true },
            { type: 'INPUT', title: 'Responsable en Campo', inputType: 'text', required: true },
            { type: 'INPUT', title: 'Fecha de Inicio', inputType: 'datetime', required: true },
            { type: 'INPUT', title: 'Fecha de Fin', inputType: 'datetime', required: true },
            { type: 'GPS', title: 'Coordenadas de la Estación', required: true },
            { type: 'IMAGE', title: 'Foto de la Estación', allowMultiple: true, requireGPS: true, maxImages: 5 },
            // Condiciones Meteorológicas
            { type: 'TEXT', title: '--- CONDICIONES METEOROLÓGICAS ---' },
            { type: 'INPUT', title: 'Temperatura Ambiente', inputType: 'number', unit: '°C' },
            { type: 'INPUT', title: 'Humedad Relativa', inputType: 'number', unit: '%' },
            { type: 'INPUT', title: 'Velocidad del Viento', inputType: 'number', unit: 'm/s' },
            { type: 'INPUT', title: 'Dirección del Viento', inputType: 'text' },
            { type: 'INPUT', title: 'Presión Atmosférica', inputType: 'number', unit: 'hPa' },
            // Equipos PM10/TSP
            { type: 'TEXT', title: '--- MONITOREO PARTÍCULAS ---' },
            { type: 'INPUT', title: 'ID Equipo PM10/TSP', inputType: 'text' },
            { type: 'INPUT', title: 'Flujo Inicial', inputType: 'number', unit: 'L/min' },
            { type: 'INPUT', title: 'Flujo Final', inputType: 'number', unit: 'L/min' },
            { type: 'INPUT', title: 'Peso Filtro Inicial', inputType: 'number', unit: 'g' },
            { type: 'INPUT', title: 'Peso Filtro Final', inputType: 'number', unit: 'g' },
            // Equipos Gases
            { type: 'TEXT', title: '--- MONITOREO GASES ---' },
            { type: 'CHECKBOX', title: 'Gases Monitoreados', options: ['SO2', 'NO2', 'CO', 'O3', 'H2S', 'NH3', 'VOC', 'HCT'] },
            { type: 'INPUT', title: 'ID Analizador', inputType: 'text' },
            { type: 'CHECKBOX', title: 'Calibración Verificada', options: ['Sí', 'No'], requireComment: true },
            // Verificación
            { type: 'TEXT', title: '--- VERIFICACIÓN ---' },
            { type: 'IMAGE', title: 'Foto Pantalla de Equipos', allowMultiple: true, maxImages: 10 },
            { type: 'INPUT', title: 'Observaciones', inputType: 'text' },
            // Cadena de Custodia
            { type: 'TEXT', title: '--- CADENA DE CUSTODIA ---' },
            { type: 'IMAGE', title: 'Fotos Cadena de Custodia', allowMultiple: true, maxImages: 10 },
            // Firmas
            { type: 'SIGNATURE', title: 'Firma del Técnico', required: true },
            { type: 'SIGNATURE', title: 'Firma del Cliente', required: false }
        ]
    },
    'RUIDO': {
        name: 'Ruido Ambiental y Emisión',
        description: 'Plantilla para monitoreo de ruido ambiental y emisión de ruido según Res. 0627/2006',
        oitType: 'RUIDO',
        baseSteps: [
            { type: 'TEXT', title: 'Instrucciones', description: 'Verificar calibración del sonómetro con pistófono antes y después de cada medición.' },
            { type: 'INPUT', title: 'Cliente', inputType: 'text', required: true },
            { type: 'INPUT', title: 'Número OT', inputType: 'text', required: true },
            { type: 'INPUT', title: 'Responsable', inputType: 'text', required: true },
            { type: 'INPUT', title: 'Fecha', inputType: 'date', required: true },
            { type: 'CHECKBOX', title: 'Tipo de Estudio', options: ['Emisión', 'Ambiental'] },
            { type: 'CHECKBOX', title: 'Jornada', options: ['Diurna', 'Nocturna'] },
            { type: 'CHECKBOX', title: 'Día', options: ['Hábil', 'No Hábil'] },
            // Calibración
            { type: 'TEXT', title: '--- DATOS DE CALIBRACIÓN ---' },
            { type: 'INPUT', title: 'ID Sonómetro', inputType: 'text', required: true },
            { type: 'INPUT', title: 'Serial Sonómetro', inputType: 'text' },
            { type: 'INPUT', title: 'Serial Pistófono', inputType: 'text' },
            { type: 'INPUT', title: 'LAeq Pistófono', inputType: 'number', unit: 'dB' },
            { type: 'INPUT', title: 'Hora Calibración Inicial', inputType: 'time' },
            { type: 'INPUT', title: 'LAeq Inicial', inputType: 'number', unit: 'dB' },
            { type: 'CHECKBOX', title: 'Cumple Calibración Inicial', options: ['Sí', 'No'] },
            { type: 'INPUT', title: 'Hora Calibración Final', inputType: 'time' },
            { type: 'INPUT', title: 'LAeq Final', inputType: 'number', unit: 'dB' },
            { type: 'CHECKBOX', title: 'Cumple Calibración Final', options: ['Sí', 'No'] },
            // Mediciones
            { type: 'TEXT', title: '--- PUNTOS DE MEDICIÓN ---' },
            { type: 'GPS', title: 'Coordenadas Punto 1', required: true },
            { type: 'INPUT', title: 'Descripción Punto 1', inputType: 'text' },
            { type: 'INPUT', title: 'LAeq Punto 1', inputType: 'number', unit: 'dB(A)' },
            { type: 'INPUT', title: 'Vmax Punto 1', inputType: 'number', unit: 'm/s' },
            { type: 'IMAGE', title: 'Foto Punto 1', allowMultiple: true, requireGPS: true, maxImages: 3 },
            // Condiciones
            { type: 'TEXT', title: '--- CONDICIONES AMBIENTALES ---' },
            { type: 'INPUT', title: 'Temperatura', inputType: 'number', unit: '°C' },
            { type: 'INPUT', title: 'Humedad', inputType: 'number', unit: '%' },
            { type: 'INPUT', title: 'Velocidad Viento', inputType: 'number', unit: 'm/s' },
            // Observaciones
            { type: 'INPUT', title: 'Fuentes de Ruido Identificadas', inputType: 'text' },
            { type: 'INPUT', title: 'Observaciones', inputType: 'text' },
            // Cadena de Custodia
            { type: 'TEXT', title: '--- CADENA DE CUSTODIA ---' },
            { type: 'IMAGE', title: 'Fotos Cadena de Custodia', allowMultiple: true, maxImages: 10 },
            // Firmas
            { type: 'SIGNATURE', title: 'Firma del Técnico', required: true },
            { type: 'SIGNATURE', title: 'Firma del Cliente', required: false }
        ]
    },
    'BIOTA': {
        name: 'Muestreo de Biota',
        description: 'Plantilla para monitoreo de flora, fauna terrestre y biota acuática',
        oitType: 'BIOTA',
        baseSteps: [
            { type: 'TEXT', title: 'Instrucciones', description: 'Registrar condiciones del hábitat, identificar especies y georefenciar puntos de muestreo.' },
            { type: 'INPUT', title: 'Cliente', inputType: 'text', required: true },
            { type: 'INPUT', title: 'Número OT', inputType: 'text', required: true },
            { type: 'INPUT', title: 'Responsable', inputType: 'text', required: true },
            { type: 'INPUT', title: 'Fecha', inputType: 'date', required: true },
            { type: 'CHECKBOX', title: 'Tipo de Muestreo', options: ['Flora', 'Fauna Terrestre', 'Biota Acuática', 'Hidrobiología'] },
            { type: 'GPS', title: 'Coordenadas del Área', required: true },
            { type: 'IMAGE', title: 'Foto General del Área', allowMultiple: true, requireGPS: true, maxImages: 5 },
            // Condiciones
            { type: 'TEXT', title: '--- CONDICIONES DEL HÁBITAT ---' },
            { type: 'INPUT', title: 'Tipo de Ecosistema', inputType: 'text' },
            { type: 'INPUT', title: 'Cobertura Vegetal (%)', inputType: 'number', unit: '%' },
            { type: 'INPUT', title: 'Temperatura Ambiente', inputType: 'number', unit: '°C' },
            { type: 'INPUT', title: 'Humedad Relativa', inputType: 'number', unit: '%' },
            { type: 'INPUT', title: 'Observaciones del Hábitat', inputType: 'text' },
            // Registro de Especies
            { type: 'TEXT', title: '--- REGISTRO DE ESPECIES ---' },
            { type: 'INPUT', title: 'Especie Observada 1', inputType: 'text' },
            { type: 'INPUT', title: 'Cantidad/Abundancia', inputType: 'number' },
            { type: 'IMAGE', title: 'Foto de Evidencia', allowMultiple: true, maxImages: 10 },
            // Muestras
            { type: 'TEXT', title: '--- MUESTRAS COLECTADAS ---' },
            { type: 'INPUT', title: 'ID Muestra', inputType: 'text' },
            { type: 'INPUT', title: 'Tipo de Muestra', inputType: 'text' },
            { type: 'INPUT', title: 'Método de Colecta', inputType: 'text' },
            { type: 'INPUT', title: 'Preservación', inputType: 'text' },
            // Cadena de Custodia
            { type: 'TEXT', title: '--- CADENA DE CUSTODIA ---' },
            { type: 'IMAGE', title: 'Fotos Cadena de Custodia', allowMultiple: true, maxImages: 10 },
            // Firmas
            { type: 'SIGNATURE', title: 'Firma del Biólogo', required: true },
            { type: 'SIGNATURE', title: 'Firma del Cliente', required: false }
        ]
    },
    'SUELO': {
        name: 'Muestreo de Suelos',
        description: 'Plantilla para muestreo de suelos contaminados y caracterización',
        oitType: 'SUELO',
        baseSteps: [
            { type: 'TEXT', title: 'Instrucciones', description: 'Usar EPP adecuado, identificar puntos según grilla de muestreo, registrar profundidad y horizontes.' },
            { type: 'INPUT', title: 'Cliente', inputType: 'text', required: true },
            { type: 'INPUT', title: 'Número OT', inputType: 'text', required: true },
            { type: 'INPUT', title: 'Responsable', inputType: 'text', required: true },
            { type: 'INPUT', title: 'Fecha', inputType: 'date', required: true },
            { type: 'INPUT', title: 'Ubicación del Predio', inputType: 'text', required: true },
            { type: 'GPS', title: 'Coordenadas del Punto', required: true },
            { type: 'IMAGE', title: 'Foto del Área', allowMultiple: true, requireGPS: true, maxImages: 5 },
            // Características del Punto
            { type: 'TEXT', title: '--- CARACTERÍSTICAS DEL PUNTO ---' },
            { type: 'INPUT', title: 'ID del Punto', inputType: 'text', required: true },
            { type: 'INPUT', title: 'Profundidad de Muestreo', inputType: 'number', unit: 'cm' },
            { type: 'INPUT', title: 'Tipo de Suelo', inputType: 'text' },
            { type: 'INPUT', title: 'Color del Suelo', inputType: 'text' },
            { type: 'INPUT', title: 'Textura', inputType: 'text', placeholder: 'Arenoso, arcilloso, limoso' },
            { type: 'CHECKBOX', title: 'Evidencia de Contaminación', options: ['Manchas', 'Olor', 'Residuos visibles', 'Ninguna'] },
            { type: 'IMAGE', title: 'Foto del Perfil del Suelo', allowMultiple: true, maxImages: 5 },
            // Muestras
            { type: 'TEXT', title: '--- DATOS DE MUESTRAS ---' },
            { type: 'INPUT', title: 'ID Muestra', inputType: 'text', required: true },
            { type: 'INPUT', title: 'Peso Aproximado', inputType: 'number', unit: 'g' },
            { type: 'INPUT', title: 'Tipo de Envase', inputType: 'text' },
            { type: 'INPUT', title: 'Preservación', inputType: 'text' },
            // Observaciones
            { type: 'INPUT', title: 'Uso Actual del Suelo', inputType: 'text' },
            { type: 'INPUT', title: 'Uso Histórico', inputType: 'text' },
            { type: 'INPUT', title: 'Observaciones', inputType: 'text' },
            // Cadena de Custodia
            { type: 'TEXT', title: '--- CADENA DE CUSTODIA ---' },
            { type: 'IMAGE', title: 'Fotos Cadena de Custodia', allowMultiple: true, maxImages: 10 },
            // Firmas
            { type: 'SIGNATURE', title: 'Firma del Técnico', required: true },
            { type: 'SIGNATURE', title: 'Firma del Cliente', required: false }
        ]
    },
    'SEDIMENTOS': {
        name: 'Muestreo de Sedimentos',
        description: 'Plantilla para muestreo de sedimentos en cuerpos de agua',
        oitType: 'SEDIMENTOS',
        baseSteps: [
            { type: 'TEXT', title: 'Instrucciones', description: 'Usar equipo de muestreo apropiado (draga, nucleador), registrar profundidad del cuerpo de agua.' },
            { type: 'INPUT', title: 'Cliente', inputType: 'text', required: true },
            { type: 'INPUT', title: 'Número OT', inputType: 'text', required: true },
            { type: 'INPUT', title: 'Responsable', inputType: 'text', required: true },
            { type: 'INPUT', title: 'Fecha', inputType: 'date', required: true },
            { type: 'INPUT', title: 'Cuerpo de Agua', inputType: 'text', required: true },
            { type: 'GPS', title: 'Coordenadas del Punto', required: true },
            { type: 'IMAGE', title: 'Foto del Punto', allowMultiple: true, requireGPS: true },
            // Características
            { type: 'TEXT', title: '--- CARACTERÍSTICAS ---' },
            { type: 'INPUT', title: 'Profundidad del Agua', inputType: 'number', unit: 'm' },
            { type: 'INPUT', title: 'Profundidad del Sedimento', inputType: 'number', unit: 'cm' },
            { type: 'INPUT', title: 'Tipo de Sedimento', inputType: 'text' },
            { type: 'INPUT', title: 'Color', inputType: 'text' },
            { type: 'INPUT', title: 'Olor', inputType: 'text' },
            { type: 'CHECKBOX', title: 'Método de Muestreo', options: ['Draga', 'Nucleador', 'Manual'] },
            { type: 'IMAGE', title: 'Foto del Sedimento', allowMultiple: true, maxImages: 5 },
            // Muestras
            { type: 'TEXT', title: '--- MUESTRAS ---' },
            { type: 'INPUT', title: 'ID Muestra', inputType: 'text', required: true },
            { type: 'INPUT', title: 'Observaciones', inputType: 'text' },
            // Cadena de Custodia
            { type: 'TEXT', title: '--- CADENA DE CUSTODIA ---' },
            { type: 'IMAGE', title: 'Fotos Cadena de Custodia', allowMultiple: true, maxImages: 10 },
            // Firmas
            { type: 'SIGNATURE', title: 'Firma del Técnico', required: true },
            { type: 'SIGNATURE', title: 'Firma del Cliente', required: false }
        ]
    },
    'LODOS': {
        name: 'Muestreo de Lodos',
        description: 'Plantilla para muestreo de lodos de PTAR, industriales y otros',
        oitType: 'LODOS',
        baseSteps: [
            { type: 'TEXT', title: 'Instrucciones', description: 'Usar EPP completo incluyendo protección respiratoria. Verificar condiciones de seguridad.' },
            { type: 'INPUT', title: 'Cliente', inputType: 'text', required: true },
            { type: 'INPUT', title: 'Número OT', inputType: 'text', required: true },
            { type: 'INPUT', title: 'Responsable', inputType: 'text', required: true },
            { type: 'INPUT', title: 'Fecha', inputType: 'date', required: true },
            { type: 'INPUT', title: 'Origen del Lodo', inputType: 'text', required: true, placeholder: 'PTAR, Industrial, etc.' },
            { type: 'GPS', title: 'Coordenadas', required: true },
            { type: 'IMAGE', title: 'Foto del Área', allowMultiple: true, requireGPS: true },
            // Características
            { type: 'TEXT', title: '--- CARACTERÍSTICAS DEL LODO ---' },
            { type: 'INPUT', title: 'Color', inputType: 'text' },
            { type: 'INPUT', title: 'Consistencia', inputType: 'text', placeholder: 'Líquido, semisólido, sólido' },
            { type: 'INPUT', title: 'Olor', inputType: 'text' },
            { type: 'INPUT', title: 'Temperatura', inputType: 'number', unit: '°C' },
            { type: 'INPUT', title: 'pH', inputType: 'number' },
            { type: 'CHECKBOX', title: 'Presencia de Residuos', options: ['Plásticos', 'Aceites', 'Metales', 'Material orgánico', 'Ninguno'] },
            { type: 'IMAGE', title: 'Foto del Lodo', allowMultiple: true, maxImages: 5 },
            // Muestras
            { type: 'TEXT', title: '--- MUESTRAS ---' },
            { type: 'INPUT', title: 'ID Muestra', inputType: 'text', required: true },
            { type: 'INPUT', title: 'Cantidad Colectada', inputType: 'number', unit: 'kg' },
            { type: 'INPUT', title: 'Tipo de Envase', inputType: 'text' },
            { type: 'INPUT', title: 'Observaciones', inputType: 'text' },
            // Cadena de Custodia
            { type: 'TEXT', title: '--- CADENA DE CUSTODIA ---' },
            { type: 'IMAGE', title: 'Fotos Cadena de Custodia', allowMultiple: true, maxImages: 10 },
            // Firmas
            { type: 'SIGNATURE', title: 'Firma del Técnico', required: true },
            { type: 'SIGNATURE', title: 'Firma del Cliente', required: false }
        ]
    }
};

async function createTemplates() {
    console.log('📋 Creando Sampling Templates...\n');

    let created = 0;
    let updated = 0;

    for (const [folderName, config] of Object.entries(TEMPLATE_CONFIGS)) {
        console.log(`📁 Procesando: ${folderName}`);

        // Verificar si ya existe
        const existing = await prisma.samplingTemplate.findFirst({
            where: { name: config.name }
        });

        const stepsJson = JSON.stringify(config.baseSteps);

        if (existing) {
            // Actualizar
            await prisma.samplingTemplate.update({
                where: { id: existing.id },
                data: {
                    description: config.description,
                    oitType: config.oitType,
                    steps: stepsJson,
                    updatedAt: new Date()
                }
            });
            console.log(`   ✅ Actualizado: ${config.name}`);
            updated++;
        } else {
            // Crear nuevo
            await prisma.samplingTemplate.create({
                data: {
                    name: config.name,
                    description: config.description,
                    oitType: config.oitType,
                    steps: stepsJson
                }
            });
            console.log(`   ✅ Creado: ${config.name}`);
            created++;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN');
    console.log('='.repeat(50));
    console.log(`✅ Creados: ${created}`);
    console.log(`🔄 Actualizados: ${updated}`);
    console.log('='.repeat(50));

    // Listar todas las plantillas
    const templates = await prisma.samplingTemplate.findMany({
        select: { name: true, oitType: true, steps: true }
    });

    console.log('\n📋 PLANTILLAS DISPONIBLES:');
    templates.forEach(t => {
        const steps = JSON.parse(t.steps);
        console.log(`   ${t.oitType}: ${t.name} (${steps.length} pasos)`);
    });
}

createTemplates()
    .then(() => {
        console.log('\n🎉 Templates creados exitosamente');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    })
    .finally(() => {
        prisma.$disconnect();
    });
