"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateDataMapper = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const templateConfigs_1 = __importStar(require("./templateConfigs"));
// Load all template fields for reference
const allFieldsPath = path.join(__dirname, 'allTemplateFields.json');
let ALL_TEMPLATE_FIELDS = {};
try {
    ALL_TEMPLATE_FIELDS = JSON.parse(fs.readFileSync(allFieldsPath, 'utf-8'));
}
catch (e) {
    console.warn('[TemplateMapper] Could not load allTemplateFields.json');
}
class TemplateDataMapper {
    constructor(templateFileName, oit, aiAnalysis) {
        this.oit = oit;
        this.aiAnalysis = aiAnalysis.replace(/[#*`]/g, '');
        this.templateType = (0, templateConfigs_1.getTemplateType)(templateFileName);
        this.templateConfig = templateConfigs_1.default[this.templateType] || null;
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
    parseAIData() {
        if (!this.oit.aiData)
            return {};
        try {
            return JSON.parse(this.oit.aiData);
        }
        catch (_a) {
            return {};
        }
    }
    parseSamplingData() {
        const results = { dateRange: this.dateRange };
        // Parse step validations for actual sampling results
        if (this.oit.stepValidations) {
            try {
                const validations = JSON.parse(this.oit.stepValidations);
                Object.entries(validations).forEach(([idx, step]) => {
                    if (step === null || step === void 0 ? void 0 : step.data) {
                        results[`step_${idx}`] = step.data;
                        // Extract specific values
                        if (step.data.temperatura)
                            results.condiciones = Object.assign(Object.assign({}, results.condiciones), { temperatura: step.data.temperatura });
                        if (step.data.humedad)
                            results.condiciones = Object.assign(Object.assign({}, results.condiciones), { humedad: step.data.humedad });
                        if (step.data.presion)
                            results.condiciones = Object.assign(Object.assign({}, results.condiciones), { presion: step.data.presion });
                        if (step.data.laeq)
                            results.ruido = Object.assign(Object.assign({}, results.ruido), { [`laeq${idx}`]: step.data.laeq });
                        if (step.data.resultado)
                            results.resultados = Object.assign(Object.assign({}, results.resultados), { [idx]: step.data.resultado });
                    }
                });
            }
            catch (_a) { }
        }
        return results;
    }
    getTemplateFieldsList(fileName) {
        var _a;
        // Find template in allTemplateFields
        const template = (_a = ALL_TEMPLATE_FIELDS.templates) === null || _a === void 0 ? void 0 : _a.find((t) => t.fileName === fileName || fileName.includes(t.shortName));
        return (template === null || template === void 0 ? void 0 : template.fields) || [];
    }
    calculateDateRange() {
        if (this.oit.scheduledDate) {
            const scheduled = new Date(this.oit.scheduledDate);
            const endDate = new Date(scheduled.getTime() + 7 * 24 * 60 * 60 * 1000);
            return `${scheduled.toLocaleDateString('es-CO')} y ${endDate.toLocaleDateString('es-CO')}`;
        }
        const lastWeek = new Date(this.today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return `${lastWeek.toLocaleDateString('es-CO')} y ${this.today.toLocaleDateString('es-CO')}`;
    }
    // ========== DATA EXTRACTION METHODS ==========
    getClient() {
        var _a, _b;
        return this.parsedAI.cliente ||
            ((_b = (_a = this.oit.description) === null || _a === void 0 ? void 0 : _a.split(':')[0]) === null || _b === void 0 ? void 0 : _b.trim()) ||
            'Cliente';
    }
    getLocation() {
        var _a;
        if (this.oit.location)
            return this.oit.location;
        if ((_a = this.parsedAI.ubicacion) === null || _a === void 0 ? void 0 : _a.ciudad) {
            return `${this.parsedAI.ubicacion.ciudad}, ${this.parsedAI.ubicacion.departamento || 'Colombia'}`;
        }
        return 'Barranquilla, Atlántico';
    }
    getCity() {
        var _a, _b, _c;
        return ((_a = this.parsedAI.ubicacion) === null || _a === void 0 ? void 0 : _a.ciudad) ||
            ((_c = (_b = this.oit.location) === null || _b === void 0 ? void 0 : _b.split(',')[0]) === null || _c === void 0 ? void 0 : _c.trim()) ||
            'Barranquilla';
    }
    getDepartment() {
        var _a, _b, _c;
        return ((_a = this.parsedAI.ubicacion) === null || _a === void 0 ? void 0 : _a.departamento) ||
            ((_c = (_b = this.oit.location) === null || _b === void 0 ? void 0 : _b.split(',')[1]) === null || _c === void 0 ? void 0 : _c.trim()) ||
            'Atlántico';
    }
    getStationCount() {
        var _a, _b;
        return ((_a = this.parsedAI.estaciones) === null || _a === void 0 ? void 0 : _a.length) ||
            ((_b = this.parsedAI.puntos) === null || _b === void 0 ? void 0 : _b.length) ||
            3;
    }
    getStationCountText() {
        const count = this.getStationCount();
        const nums = {
            1: 'una', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco',
            6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez'
        };
        if (count === 1)
            return '(1) una estación';
        return `(${count}) ${nums[count] || count} estaciones`;
    }
    getParameters() {
        var _a;
        if ((_a = this.parsedAI.parametros) === null || _a === void 0 ? void 0 : _a.length) {
            return this.parsedAI.parametros.join(', ');
        }
        // Default based on template type
        switch (this.templateType) {
            case 'CALIDAD_AIRE': return 'PM10, PM2.5, SO2, NO2, O3';
            case 'EMISION_RUIDO':
            case 'RUIDO_AMBIENTAL': return 'LAeq, Lmin, Lmax';
            case 'FUENTES_FIJAS': return 'MP, NOx, SO2, CO';
            case 'OLORES': return 'H2S, NH3';
            default: return 'parámetros ambientales';
        }
    }
    getEquipment() {
        var _a;
        if ((_a = this.parsedAI.equipos) === null || _a === void 0 ? void 0 : _a.length) {
            return this.parsedAI.equipos.map((e) => typeof e === 'string' ? e : e.nombre || e.name).join(', ');
        }
        // Default based on template type
        switch (this.templateType) {
            case 'CALIDAD_AIRE': return 'Muestreador de Alto Volumen BGI PQ200';
            case 'EMISION_RUIDO':
            case 'RUIDO_AMBIENTAL': return 'Sonómetro integrador tipo 1';
            case 'FUENTES_FIJAS': return 'Equipo de muestreo isocinético';
            default: return 'Equipos de monitoreo ambiental';
        }
    }
    getNestedValue(obj, path) {
        const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
        let value = obj;
        for (const part of parts) {
            value = value === null || value === void 0 ? void 0 : value[part];
            if (value === undefined)
                break;
        }
        return value;
    }
    // ========== FIELD VALUE RESOLUTION ==========
    resolveFieldValue(fieldName, mapping) {
        var _a, _b, _c;
        if (!mapping) {
            // Try to infer from field name
            return this.inferFieldValue(fieldName);
        }
        let value;
        switch (mapping.source) {
            case 'OIT':
                value = this.getNestedValue(this.oit, mapping.field || '');
                break;
            case 'AI':
                value = this.getNestedValue(this.parsedAI, mapping.field || '');
                // Handle special AI fields
                if (!value) {
                    if (mapping.field === 'cliente')
                        value = this.getClient();
                    if (mapping.field === 'ubicacion.ciudad')
                        value = this.getCity();
                    if (mapping.field === 'ubicacion.departamento')
                        value = this.getDepartment();
                    if (mapping.field === 'parametros')
                        value = this.getParameters();
                    if (mapping.field === 'equipos')
                        value = this.getEquipment();
                    if (mapping.field === 'numeroEstaciones')
                        value = this.getStationCountText();
                    if ((_a = mapping.field) === null || _a === void 0 ? void 0 : _a.startsWith('estaciones[')) {
                        const idx = parseInt(((_b = mapping.field.match(/\[(\d+)\]/)) === null || _b === void 0 ? void 0 : _b[1]) || '0');
                        const station = (_c = this.parsedAI.estaciones) === null || _c === void 0 ? void 0 : _c[idx];
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
                if (mapping.field === 'dateRange')
                    value = this.dateRange;
                break;
            case 'DATE':
                switch (mapping.field) {
                    case 'day':
                        value = this.day;
                        break;
                    case 'month':
                        value = this.month;
                        break;
                    case 'year':
                        value = this.year;
                        break;
                    case 'fullDate':
                        value = this.fullDate;
                        break;
                    case 'monthYear':
                        value = this.monthYear;
                        break;
                    case 'dateRange':
                        value = this.dateRange;
                        break;
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
    inferFieldValue(fieldName) {
        var _a, _b, _c, _d;
        // var_N patterns
        if (fieldName.startsWith('var_')) {
            const num = parseInt(fieldName.split('_')[1]);
            // Common var patterns
            if (num === 1)
                return this.oit.oitNumber;
            if (num === 2)
                return this.year;
            if (num === 3)
                return ((_a = this.parsedAI.estaciones) === null || _a === void 0 ? void 0 : _a.map((e) => e.codigo || 'EST').join(', ')) || 'EST-01, EST-02';
            if (num === 4)
                return this.oit.description || 'Proyecto de monitoreo ambiental';
            if (num === 5)
                return ((_b = this.parsedAI.fuentesEmision) === null || _b === void 0 ? void 0 : _b[0]) || '';
            // Station coordinates (21-24)
            if (num >= 21 && num <= 24) {
                const station = ((_c = this.parsedAI.estaciones) === null || _c === void 0 ? void 0 : _c[0]) || {};
                if (num === 21)
                    return station.codigo || 'EST-01';
                if (num === 22)
                    return station.descripcion || station.nombre || 'Estación de monitoreo';
                if (num === 23)
                    return station.norte || station.latitud || '1.852.345';
                if (num === 24)
                    return station.este || station.longitud || '920.567';
            }
            // Equipment/method (16-20)
            if (num === 16)
                return this.getEquipment().split(',')[0];
            if (num === 17)
                return this.getParameters();
            if (num === 18)
                return '24 horas';
            if (num === 19)
                return this.parsedAI.caudal || '1.13 m³/min';
            if (num === 20)
                return this.parsedAI.metodo || 'Método normativo';
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
        if (fieldName.includes('realizada_el_dia_1'))
            return this.day;
        if (fieldName.includes('de_del_a_o') || fieldName.includes('de_de_'))
            return this.year;
        if (fieldName.includes('monitoreo_se_efectuo') || fieldName.includes('ejecutado_entre'))
            return this.dateRange;
        // Company
        if (fieldName.includes('serambiente'))
            return 'SERAMBIENTE S.A.S.';
        if (fieldName.includes('fuente_'))
            return 'SERAMBIENTE S.A.S.';
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
            return ((_d = this.parsedAI.clima) === null || _d === void 0 ? void 0 : _d.temperatura) || '28°C';
        }
        // Default: empty string
        return '';
    }
    // ========== MAIN GENERATION METHOD ==========
    generateData() {
        const data = {};
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
exports.TemplateDataMapper = TemplateDataMapper;
exports.default = TemplateDataMapper;
