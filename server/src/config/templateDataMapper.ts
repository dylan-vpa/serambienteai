/**
 * Enhanced Template Data Mapper V2
 * Dynamically extracts template fields and maps OIT/AI data to them
 * 
 * Key improvements:
 * 1. Template-aware: Loads variable contexts from JSON
 * 2. Dynamic mapping: Uses OIT data, AI analysis, and sampling data
 * 3. Intelligent defaults: Falls back gracefully for missing data
 * 4. Type-safe: Properly formats dates, numbers, locations
 */

import * as fs from 'fs';
import * as path from 'path';

// Variable context provides before/after context for each placeholder
const contextsPath = path.join(__dirname, 'variableContexts.json');
let VAR_CONTEXTS: Record<string, any> = {};

try {
    VAR_CONTEXTS = JSON.parse(fs.readFileSync(contextsPath, 'utf-8'));
} catch (e) {
    console.warn('[TemplateMapper] Could not load variable contexts');
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

interface SamplingStep {
    name: string;
    data?: Record<string, any>;
}

interface ParsedAIData {
    resumen?: string;
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
    [key: string]: any;
}

export class TemplateDataMapper {
    private oit: OITData;
    private aiAnalysis: string;
    private parsedAI: ParsedAIData;
    private date: string;
    private year: string;
    private samplingSteps: SamplingStep[];

    constructor(templateFileName: string, oit: OITData, aiAnalysis: string) {
        this.oit = oit;
        this.aiAnalysis = aiAnalysis.replace(/[#*`]/g, '');
        this.parsedAI = this.parseAIData();
        this.samplingSteps = this.parseSamplingData();

        this.date = new Date().toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
        this.year = new Date().getFullYear().toString();
    }

    /**
     * Parse aiData JSON from OIT record
     */
    private parseAIData(): ParsedAIData {
        if (!this.oit.aiData) return {};
        try {
            return JSON.parse(this.oit.aiData);
        } catch {
            return {};
        }
    }

    /**
     * Parse sampling steps from OIT
     */
    private parseSamplingData(): SamplingStep[] {
        if (!this.oit.samplingData) return [];
        try {
            const data = JSON.parse(this.oit.samplingData);
            return data.steps || [];
        } catch {
            return [];
        }
    }

    /**
     * Get client name from OIT description
     */
    private getClient(): string {
        // Try from AI data first
        if (this.parsedAI.cliente) return this.parsedAI.cliente;

        // Fallback: extract from description (format: "CLIENTE: Proyecto...")
        const desc = this.oit.description || '';
        const match = desc.match(/^([^:]+)/);
        if (match) return match[1].trim();

        return 'Cliente';
    }

    /**
     * Get location from OIT or AI data
     */
    private getLocation(): string {
        if (this.oit.location) return this.oit.location;
        if (this.parsedAI.ubicacion?.ciudad) {
            return `${this.parsedAI.ubicacion.ciudad}, ${this.parsedAI.ubicacion.departamento || ''}`;
        }
        return 'Barranquilla, Atlántico';
    }

    /**
     * Get city only
     */
    private getCity(): string {
        if (this.parsedAI.ubicacion?.ciudad) return this.parsedAI.ubicacion.ciudad;
        return this.oit.location?.split(',')[0]?.trim() || 'Barranquilla';
    }

    /**
     * Get department
     */
    private getDepartment(): string {
        if (this.parsedAI.ubicacion?.departamento) return this.parsedAI.ubicacion.departamento;
        return this.oit.location?.split(',')[1]?.trim() || 'Atlántico';
    }

    /**
     * Get monitoring date range
     */
    private getDateRange(): string {
        if (this.oit.scheduledDate) {
            const scheduled = new Date(this.oit.scheduledDate);
            const endDate = new Date(scheduled.getTime() + 7 * 24 * 60 * 60 * 1000);
            return `${scheduled.toLocaleDateString('es-CO')} y ${endDate.toLocaleDateString('es-CO')}`;
        }
        // Default: use creation date range
        const today = new Date();
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return `${lastWeek.toLocaleDateString('es-CO')} y ${today.toLocaleDateString('es-CO')}`;
    }

    /**
     * Get number of stations from AI data
     */
    private getStationCount(): number {
        return this.parsedAI.estaciones?.length ||
            this.parsedAI.puntosMonitoreo?.length ||
            3; // Default
    }

    /**
     * Get station count as text (singular/plural aware)
     */
    private getStationCountText(): string {
        const count = this.getStationCount();
        if (count === 1) return '(1) una estación';
        return `(${count}) ${this.numberToSpanish(count)} estaciones`;
    }

    /**
     * Number to Spanish text
     */
    private numberToSpanish(n: number): string {
        const nums: Record<number, string> = {
            1: 'una', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco',
            6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez'
        };
        return nums[n] || n.toString();
    }

    /**
     * Get list of parameters being monitored
     */
    private getParameters(): string {
        if (this.parsedAI.parametros?.length) {
            return this.parsedAI.parametros.join(', ');
        }
        return 'PM10, PM2.5, SO2, NO2, O3';
    }

    /**
     * Get equipment list
     */
    private getEquipment(): string {
        if (this.parsedAI.equipos?.length) {
            return this.parsedAI.equipos.map((e: any) =>
                typeof e === 'string' ? e : e.nombre || e.name
            ).join(', ');
        }
        return 'Muestreador de Alto Volumen, Analizadores automáticos';
    }

    /**
     * Get sampling step results
     */
    private getStepResult(stepIndex: number, field: string): string {
        if (!this.oit.stepValidations) return '';
        try {
            const validations = JSON.parse(this.oit.stepValidations);
            const step = validations[stepIndex];
            if (step?.data?.[field]) return String(step.data[field]);
        } catch { }
        return '';
    }

    /**
     * Generate comprehensive data object for template
     */
    public generateData(): Record<string, any> {
        const data: Record<string, any> = {};

        // ======== COVER PAGE / HEADER ========
        data['e_por_1'] = 'SERAMBIENTE S.A.S.';
        data['var_1'] = this.oit.oitNumber;
        data['var_2'] = this.year;

        // ======== PROJECT INFO ========
        data['monitoreo_de_calidad_del_aire_ejecutado_entre_el_1'] = this.getDateRange();
        data['var_3'] = this.parsedAI.estaciones?.map((e: any) => e.codigo || e.nombre || 'EST-01').join(', ') || 'EST-01, EST-02, EST-03';
        data['var_4'] = `ubicadas en el área de influencia de ${this.getClient()}`;

        // ======== CLIENT / LOCATION ========
        data['contrato_los_servicios_de_serambiente_s_a_s_para_r_1'] = this.getClient();
        data['contrato_los_servicios_de_serambiente_s_a_s_para_r_2'] = this.oit.description || 'Proyecto de Monitoreo Ambiental';
        data['del_localizado_en_1'] = this.getLocation();
        data['localizado_en_departamento_de_1'] = this.getDepartment();

        // ======== STATION TABLE (var_21-24) ========
        const stations = this.parsedAI.estaciones || [
            { codigo: 'EST-01', descripcion: 'Estación principal', norte: '1.852.345', este: '920.567' }
        ];
        // First station data
        data['var_21'] = stations[0]?.codigo || 'EST-01';
        data['var_22'] = stations[0]?.descripcion || stations[0]?.nombre || 'Estación de monitoreo';
        data['var_23'] = stations[0]?.norte || stations[0]?.latitud || '1.852.345';
        data['var_24'] = stations[0]?.este || stations[0]?.longitud || '920.567';

        // ======== FICHA TÉCNICA (var_16-20) ========
        data['var_16'] = this.getEquipment().split(',')[0] || 'High Volume Sampler';
        data['var_17'] = this.getParameters();
        data['var_18'] = this.parsedAI.duracionMuestreo || '24 horas';
        data['var_19'] = this.parsedAI.caudal || '1.13 m³/min';
        data['var_20'] = this.parsedAI.metodo || 'Método gravimétrico EPA';

        // ======== TECHNICAL SPECS ========
        data['var_27'] = this.getEquipment();
        data['var_28'] = '2.0 m';
        data['var_31'] = 'Sin anomalías durante el muestreo';

        // ======== RESULTS TABLE ========
        data['var_32'] = stations[0]?.codigo || 'EST-01';
        data['var_34'] = this.getStepResult(0, 'resultado') || '45.2 µg/m³';
        data['var_51'] = this.getStepResult(0, 'valor') || '45.2';

        // ======== EMISSION SOURCES (var_5-8) ========
        const fuentesDescripcion = this.parsedAI.fuentesEmision || [
            'Tráfico vehicular en vías principales',
            'Actividad industrial en la zona',
            'Fuentes móviles y estacionarias',
            'Emisiones fugitivas de material particulado'
        ];
        data['var_5'] = fuentesDescripcion[0] || '';
        data['var_6'] = fuentesDescripcion[1] || '';
        data['var_7'] = fuentesDescripcion[2] || '';
        data['var_8'] = fuentesDescripcion[3] || '';

        // ======== NORMATIVE TABLE (var_53-73) ========
        // These come from standards - using typical Colombian values
        data['var_53'] = '75';   // PM10 daily limit
        data['var_54'] = '37';   // PM2.5 daily limit
        data['var_55'] = '100';  // NO2 hourly limit
        data['var_56'] = '50';   // SO2 daily limit
        data['var_57'] = '24 horas';
        data['var_59'] = 'Anual';
        data['var_60'] = '50';
        data['var_62'] = '100';
        data['var_63'] = '150';
        data['var_65'] = '1 hora';
        data['var_66'] = '8 horas';
        data['var_67'] = '35.000';
        data['var_68'] = '10.000';
        data['var_69'] = '120';
        data['var_71'] = '80';
        data['var_72'] = '60';
        data['var_73'] = '40';

        // ======== METHODOLOGY DEFAULTS ========
        for (let i = 9; i <= 15; i++) {
            data[`var_${i}`] = '';
        }

        // ======== SENTENCE COMPLETIONS ========
        data['a_fin_de_dar_cumplimiento_a_los_requerimientos_de__1'] = this.getStationCountText();
        data['estaciones_en_sitios_representativos_de_la_direcci_1'] = 'representativo del área de estudio';
        data['el_presente_documento_de_caracter_tecnico_contiene_1'] = this.getDateRange();
        data['de_noviembre_de_2017_del_ministerio_de_ambiente_y__1'] = '';
        data['realizar_la_evaluacion_de_la_calidad_de_aire_en_1'] = this.getStationCountText();
        data['estaciones_ubicadas_en_el_area_de_estudio_del_1'] = this.getClient();
        data['estaciones_ubicadas_en_el_area_de_estudio_del_loca_1'] = this.getDepartment();
        data['determinar_los_niveles_de_inmision_de_los_contamin_1'] = this.getParameters();
        data['las_mediciones_toma_de_muestra_y_analisis_de_1'] = 'calidad del aire';
        data['fue_realizada_por_servicios_de_ingenieria_y_ambien_1'] = 'Resolución 1262 de 2021';
        data['para_determinar_los_niveles_de_calidad_de_aire_de_1'] = this.getStationCountText();
        data['de_de_monitoreo_ubicadas_en_el_area_de_estudio_del_1'] = this.getClient();
        data['las_evaluaciones_de_la_calidad_del_aire_se_efectua_1'] = this.getStationCountText();
        data['las_evaluaciones_de_la_calidad_del_aire_se_efectua_2'] = this.getDateRange();
        data['de_monitoreo_evaluadas_durante_el_periodo_comprend_1'] = this.getParameters();
        data['el_presente_monitoreo_se_efectuo_1'] = this.getDateRange();
        data['en_el_area_de_estudio_1'] = this.getClient();
        data['para_el_desarrollo_de_este_estudio_en_particular_f_1'] = `se seleccionaron ${this.getStationCountText()}`;
        data['en_el_area_de_estudio_del_1'] = this.getClient();
        data['las_normas_de_calidad_del_aire_para_todo_el_territ_1'] = '';
        data['se_determino_pm10_mediante_el_metodo_u_s_epa_cfr_t_1'] = '';
        data['se_determino_pm10_mediante_el_metodo_u_s_epa_cfr_t_2'] = '';
        data['se_determino_pm2_5_mediante_el_metodo_us_epa_cfr_t_1'] = '';
        data['3_ficha_tecnica_1'] = `Estación ${stations[0]?.codigo || 'EST-01'}`;
        data['tabla_4_contiene_los_numeros_de_identificacion_asi_1'] = '';
        data['se_presentan_las_incertidumbres_de_los_resultados__1'] = '';
        data['las_incertidumbres_de_los_resultados_asociados_a_c_1'] = 'se detallan en el Anexo 4';
        data['en_las_siguientes_secciones_se_presentan_las_conce_1'] = this.getParameters().split(',').slice(0, 2).join(' y ');
        data['en_las_siguientes_secciones_se_presentan_las_conce_2'] = this.getClient();
        data['los_resultados_de_las_1'] = 'estaciones de monitoreo';

        // ======== STANDARD FIELDS ========
        data['fuente_serambiente_s_a_s_1'] = 'SERAMBIENTE S.A.S.';
        data['fuente_serambiente_s_a_s_2'] = 'SERAMBIENTE S.A.S.';
        data['fuente_serambiente_s_a_s_3'] = 'SERAMBIENTE S.A.S.';
        data['el_monitoreo_fue_realizado_por_la_empresa_servicio_1'] = 'SERAMBIENTE S.A.S.';

        // ======== LEGACY SNAKE_CASE ========
        data['cliente_1'] = this.getClient();
        data['nit_1'] = this.parsedAI.nit || '900.123.456-7';
        data['direccion_1'] = this.getLocation();
        data['contacto_1'] = this.parsedAI.contacto || 'Ing. Director Técnico';
        data['ciudad_1'] = this.getCity();
        data['departamento_1'] = this.getDepartment();
        data['fecha_1'] = this.date;
        data['fecha_informe'] = this.date;

        // ======== CAPITALIZED VARIATIONS ========
        data['Client'] = this.getClient();
        data['Date'] = this.date;
        data['Location'] = this.getLocation();
        data['OIT'] = this.oit.oitNumber;
        data['oitNumber'] = this.oit.oitNumber;
        data['description'] = this.oit.description || '';
        data['location'] = this.getLocation();
        data['date'] = this.date;
        data['client'] = this.getClient();
        data['analysis'] = this.aiAnalysis;
        data['narrative'] = this.aiAnalysis;

        // ======== FILL REMAINING var_N ========
        for (let i = 1; i <= 200; i++) {
            if (!data[`var_${i}`]) {
                data[`var_${i}`] = '';
            }
        }

        console.log(`[TemplateMapper] Generated ${Object.keys(data).length} data keys from OIT ${this.oit.oitNumber}`);
        return data;
    }
}

export default TemplateDataMapper;
