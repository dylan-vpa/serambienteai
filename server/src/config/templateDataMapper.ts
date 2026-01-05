/**
 * Enhanced Template Data Mapper V3
 * Uses template-specific configurations to dynamically fill all placeholders
 * 
 * Key features:
 * 1. Template-aware: Routes to correct config based on filename
 * 2. Dynamic data extraction from OIT, AI, and sampling data
 * 3. Intelligent formatting for dates, numbers, locations
 * 4. Fills ALL placeholders with proper values or safe defaults
 */

import * as fs from 'fs';
import * as path from 'path';
import TEMPLATE_CONFIGS, { getTemplateType, FieldMapping, TemplateConfig } from './templateConfigs';

// Load all template fields for reference
const allFieldsPath = path.join(__dirname, 'allTemplateFields.json');
let ALL_TEMPLATE_FIELDS: any = {};
try {
    ALL_TEMPLATE_FIELDS = JSON.parse(fs.readFileSync(allFieldsPath, 'utf-8'));
} catch (e) {
    console.warn('[TemplateMapper] Could not load allTemplateFields.json');
}

interface OITData {
    oitNumber: string;
    description?: string | null;
    location?: string | null;
    scheduledDate?: Date | null;
    aiData?: string | null;
    samplingData?: string | null;
    stepValidations?: string | null;
    planningProposal?: string | null;
}

interface ParsedAIData {
    cliente?: string;
    nit?: string;
    contacto?: string;
    tipoMuestreo?: string;
    alcance?: string;
    objetivos?: string[];
    equipos?: any[];
    parametros?: string[];
    normativas?: string[];
    ubicacion?: {
        ciudad?: string;
        departamento?: string;
        direccion?: string;
    };
    estaciones?: any[];
    puntos?: any[];
    clima?: {
        temperatura?: string;
        humedad?: string;
        presion?: string;
    };
    metodologia?: string;
    cumplimiento?: string;
    recomendaciones?: string;
    resumenResultados?: string;
    [key: string]: any;
}

interface SamplingResults {
    dateRange?: string;
    ruido?: Record<string, any>;
    condiciones?: Record<string, any>;
    resultados?: Record<string, any>;
    [key: string]: any;
}

export class TemplateDataMapper {
    private oit: OITData;
    private templateType: string;
    private templateConfig: TemplateConfig | null;
    private aiAnalysis: string;
    private parsedAI: ParsedAIData;
    private samplingResults: SamplingResults;
    private templateFields: string[];

    // Date components
    private today: Date;
    private day: string;
    private month: string;
    private year: string;
    private fullDate: string;
    private monthYear: string;
    private dateRange: string;

    constructor(templateFileName: string, oit: OITData, aiAnalysis: string) {
        this.oit = oit;
        this.aiAnalysis = aiAnalysis.replace(/[#*`]/g, '');
        this.templateType = getTemplateType(templateFileName);
        this.templateConfig = TEMPLATE_CONFIGS[this.templateType] || null;

        this.parsedAI = this.parseAIData();
        this.samplingResults = this.parseSamplingData();
        this.templateFields = this.getTemplateFieldsList(templateFileName);

        // Initialize date components
        this.today = new Date();
        this.day = this.today.getDate().toString().padStart(2, '0');
        this.month = this.today.toLocaleDateString('es-CO', { month: 'long' });
        this.year = this.today.getFullYear().toString();
        this.fullDate = this.today.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
        this.monthYear = `${this.month} de ${this.year}`;
        this.dateRange = this.calculateDateRange();

        console.log(`[TemplateMapper] Initialized for ${this.templateType} with ${this.templateFields.length} fields`);
    }

    private parseAIData(): ParsedAIData {
        if (!this.oit.aiData) return {};
        try {
            return JSON.parse(this.oit.aiData);
        } catch {
            return {};
        }
    }

    private parseSamplingData(): SamplingResults {
        const results: SamplingResults = { dateRange: this.dateRange };

        // Parse step validations for actual sampling results
        if (this.oit.stepValidations) {
            try {
                const validations = JSON.parse(this.oit.stepValidations);
                Object.entries(validations).forEach(([idx, step]: [string, any]) => {
                    if (step?.data) {
                        results[`step_${idx}`] = step.data;
                        // Extract specific values
                        if (step.data.temperatura) results.condiciones = { ...results.condiciones, temperatura: step.data.temperatura };
                        if (step.data.humedad) results.condiciones = { ...results.condiciones, humedad: step.data.humedad };
                        if (step.data.presion) results.condiciones = { ...results.condiciones, presion: step.data.presion };
                        if (step.data.laeq) results.ruido = { ...results.ruido, [`laeq${idx}`]: step.data.laeq };
                        if (step.data.resultado) results.resultados = { ...results.resultados, [idx]: step.data.resultado };
                    }
                });
            } catch { }
        }

        return results;
    }

    private getTemplateFieldsList(fileName: string): string[] {
        // Find template in allTemplateFields
        const template = ALL_TEMPLATE_FIELDS.templates?.find((t: any) =>
            t.fileName === fileName || fileName.includes(t.shortName)
        );
        return template?.fields || [];
    }

    private calculateDateRange(): string {
        if (this.oit.scheduledDate) {
            const scheduled = new Date(this.oit.scheduledDate);
            const endDate = new Date(scheduled.getTime() + 7 * 24 * 60 * 60 * 1000);
            return `${scheduled.toLocaleDateString('es-CO')} y ${endDate.toLocaleDateString('es-CO')}`;
        }
        const lastWeek = new Date(this.today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return `${lastWeek.toLocaleDateString('es-CO')} y ${this.today.toLocaleDateString('es-CO')}`;
    }

    // ========== DATA EXTRACTION METHODS ==========

    private getClient(): string {
        return this.parsedAI.cliente ||
            this.oit.description?.split(':')[0]?.trim() ||
            'Cliente';
    }

    private getLocation(): string {
        if (this.oit.location) return this.oit.location;
        if (this.parsedAI.ubicacion?.ciudad) {
            return `${this.parsedAI.ubicacion.ciudad}, ${this.parsedAI.ubicacion.departamento || 'Colombia'}`;
        }
        return 'Barranquilla, Atlántico';
    }

    private getCity(): string {
        return this.parsedAI.ubicacion?.ciudad ||
            this.oit.location?.split(',')[0]?.trim() ||
            'Barranquilla';
    }

    private getDepartment(): string {
        return this.parsedAI.ubicacion?.departamento ||
            this.oit.location?.split(',')[1]?.trim() ||
            'Atlántico';
    }

    private getStationCount(): number {
        return this.parsedAI.estaciones?.length ||
            this.parsedAI.puntos?.length ||
            3;
    }

    private getStationCountText(): string {
        const count = this.getStationCount();
        const nums: Record<number, string> = {
            1: 'una', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco',
            6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez'
        };
        if (count === 1) return '(1) una estación';
        return `(${count}) ${nums[count] || count} estaciones`;
    }

    private getParameters(): string {
        if (this.parsedAI.parametros?.length) {
            return this.parsedAI.parametros.join(', ');
        }
        // Default based on template type
        switch (this.templateType) {
            case 'CALIDAD_AIRE': return 'PM10, PM2.5, SO2, NO2, O3';
            case 'EMISION_RUIDO': case 'RUIDO_AMBIENTAL': return 'LAeq, Lmin, Lmax';
            case 'FUENTES_FIJAS': return 'MP, NOx, SO2, CO';
            case 'OLORES': return 'H2S, NH3';
            default: return 'parámetros ambientales';
        }
    }

    private getEquipment(): string {
        if (this.parsedAI.equipos?.length) {
            return this.parsedAI.equipos.map((e: any) =>
                typeof e === 'string' ? e : e.nombre || e.name
            ).join(', ');
        }
        // Default based on template type
        switch (this.templateType) {
            case 'CALIDAD_AIRE': return 'Muestreador de Alto Volumen BGI PQ200';
            case 'EMISION_RUIDO': case 'RUIDO_AMBIENTAL': return 'Sonómetro integrador tipo 1';
            case 'FUENTES_FIJAS': return 'Equipo de muestreo isocinético';
            default: return 'Equipos de monitoreo ambiental';
        }
    }

    private getNestedValue(obj: any, path: string): any {
        const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
        let value = obj;
        for (const part of parts) {
            value = value?.[part];
            if (value === undefined) break;
        }
        return value;
    }

    // ========== FIELD VALUE RESOLUTION ==========

    private resolveFieldValue(fieldName: string, mapping?: FieldMapping): string {
        if (!mapping) {
            // Try to infer from field name
            return this.inferFieldValue(fieldName);
        }

        let value: any;

        switch (mapping.source) {
            case 'OIT':
                value = this.getNestedValue(this.oit, mapping.field || '');
                break;

            case 'AI':
                value = this.getNestedValue(this.parsedAI, mapping.field || '');
                // Handle special AI fields
                if (!value) {
                    if (mapping.field === 'cliente') value = this.getClient();
                    if (mapping.field === 'ubicacion.ciudad') value = this.getCity();
                    if (mapping.field === 'ubicacion.departamento') value = this.getDepartment();
                    if (mapping.field === 'parametros') value = this.getParameters();
                    if (mapping.field === 'equipos') value = this.getEquipment();
                    if (mapping.field === 'numeroEstaciones') value = this.getStationCountText();
                    if (mapping.field?.startsWith('estaciones[')) {
                        const idx = parseInt(mapping.field.match(/\[(\d+)\]/)?.[1] || '0');
                        const station = this.parsedAI.estaciones?.[idx];
                        if (station) {
                            const subField = mapping.field.split('.')[1];
                            value = station[subField] || station.codigo || station.nombre || `EST-0${idx + 1}`;
                        }
                    }
                }
                break;

            case 'STATIC':
                value = mapping.staticValue || '';
                break;

            case 'SAMPLING':
                value = this.getNestedValue(this.samplingResults, mapping.field || '');
                if (mapping.field === 'dateRange') value = this.dateRange;
                break;

            case 'DATE':
                switch (mapping.field) {
                    case 'day': value = this.day; break;
                    case 'month': value = this.month; break;
                    case 'year': value = this.year; break;
                    case 'fullDate': value = this.fullDate; break;
                    case 'monthYear': value = this.monthYear; break;
                    case 'dateRange': value = this.dateRange; break;
                    default: value = this.fullDate;
                }
                break;

            case 'SYSTEM':
                value = 'SERAMBIENTE S.A.S.';
                break;
        }

        // Format value
        if (value !== undefined && value !== null) {
            if (mapping.format === 'number') {
                value = typeof value === 'number' ? value.toFixed(2) : value;
            }
            return String(value);
        }

        return '';
    }

    private inferFieldValue(fieldName: string): string {
        // var_N patterns
        if (fieldName.startsWith('var_')) {
            const num = parseInt(fieldName.split('_')[1]);

            // Common var patterns
            if (num === 1) return this.oit.oitNumber;
            if (num === 2) return this.year;
            if (num === 3) return this.parsedAI.estaciones?.map((e: any) => e.codigo || 'EST').join(', ') || 'EST-01, EST-02';
            if (num === 4) return this.oit.description || 'Proyecto de monitoreo ambiental';
            if (num === 5) return this.parsedAI.fuentesEmision?.[0] || '';

            // Station coordinates (21-24)
            if (num >= 21 && num <= 24) {
                const station = this.parsedAI.estaciones?.[0] || {};
                if (num === 21) return station.codigo || 'EST-01';
                if (num === 22) return station.descripcion || station.nombre || 'Estación de monitoreo';
                if (num === 23) return station.norte || station.latitud || '1.852.345';
                if (num === 24) return station.este || station.longitud || '920.567';
            }

            // Equipment/method (16-20)
            if (num === 16) return this.getEquipment().split(',')[0];
            if (num === 17) return this.getParameters();
            if (num === 18) return '24 horas';
            if (num === 19) return this.parsedAI.caudal || '1.13 m³/min';
            if (num === 20) return this.parsedAI.metodo || 'Método normativo';

            // Return empty for unknown vars
            return '';
        }

        // Client-related
        if (fieldName.includes('cliente') || fieldName.includes('contrato_los_servicios')) {
            return this.getClient();
        }

        // Location-related
        if (fieldName.includes('localizado_en') || fieldName.includes('ubicado_en')) {
            return this.getLocation();
        }
        if (fieldName.includes('departamento')) {
            return this.getDepartment();
        }

        // Date-related
        if (fieldName.includes('realizada_el_dia_1')) return this.day;
        if (fieldName.includes('de_del_a_o') || fieldName.includes('de_de_')) return this.year;
        if (fieldName.includes('monitoreo_se_efectuo') || fieldName.includes('ejecutado_entre')) return this.dateRange;

        // Company
        if (fieldName.includes('serambiente')) return 'SERAMBIENTE S.A.S.';
        if (fieldName.includes('fuente_')) return 'SERAMBIENTE S.A.S.';

        // Stations
        if (fieldName.includes('estaciones') && (fieldName.includes('numero') || fieldName.includes('seleccion'))) {
            return this.getStationCountText();
        }

        // Parameters
        if (fieldName.includes('parametros') || fieldName.includes('contaminant')) {
            return this.getParameters();
        }

        // Equipment
        if (fieldName.includes('equipo') || fieldName.includes('sonometro') || fieldName.includes('muestreador')) {
            return this.getEquipment();
        }

        // Climate
        if (fieldName.includes('clima') || fieldName.includes('tropical')) {
            return this.parsedAI.clima?.temperatura || '28°C';
        }

        // Default: empty string
        return '';
    }

    // ========== MAIN GENERATION METHOD ==========

    public generateData(): Record<string, any> {
        const data: Record<string, any> = {};

        // 1. Fill from template config if available
        if (this.templateConfig) {
            for (const [fieldName, mapping] of Object.entries(this.templateConfig.fields)) {
                data[fieldName] = this.resolveFieldValue(fieldName, mapping);
            }
        }

        // 2. Fill remaining template-specific fields
        for (const fieldName of this.templateFields) {
            if (!data[fieldName]) {
                data[fieldName] = this.resolveFieldValue(fieldName);
            }
        }

        // 3. Fill standard fallbacks for all var_N (1-200)
        for (let i = 1; i <= 200; i++) {
            const key = `var_${i}`;
            if (!data[key]) {
                data[key] = this.inferFieldValue(key);
            }
        }

        // 4. Add common aliases
        data['Client'] = this.getClient();
        data['client'] = this.getClient();
        data['cliente_1'] = this.getClient();
        data['Date'] = this.fullDate;
        data['date'] = this.fullDate;
        data['fecha_1'] = this.fullDate;
        data['fecha_informe'] = this.fullDate;
        data['Location'] = this.getLocation();
        data['location'] = this.getLocation();
        data['OIT'] = this.oit.oitNumber;
        data['oitNumber'] = this.oit.oitNumber;
        data['description'] = this.oit.description || '';
        data['analysis'] = this.aiAnalysis;
        data['narrative'] = this.aiAnalysis;
        data['ciudad_1'] = this.getCity();
        data['departamento_1'] = this.getDepartment();
        data['nit_1'] = this.parsedAI.nit || '900.XXX.XXX-X';
        data['contacto_1'] = this.parsedAI.contacto || 'Ing. Director Técnico';
        data['direccion_1'] = this.getLocation();

        console.log(`[TemplateMapper] Generated ${Object.keys(data).length} data keys for ${this.templateType}`);
        return data;
    }
}

export default TemplateDataMapper;
