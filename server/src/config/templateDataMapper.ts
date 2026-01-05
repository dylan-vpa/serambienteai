/**
 * ACCURATE Template Data Mapper
 * Based on actual Word document context analysis
 * 
 * KEY INSIGHT: Variables are NOT text blocks - they are TABLE CELLS
 * that repeat for each station/measurement row!
 */

import * as fs from 'fs';
import * as path from 'path';

// Load extracted contexts
const contextsPath = path.join(__dirname, 'variableContexts.json');
let VAR_CONTEXTS: Record<string, any> = {};

try {
    VAR_CONTEXTS = JSON.parse(fs.readFileSync(contextsPath, 'utf-8'));
} catch (e) {
    console.warn('[TemplateMapper] Could not load variable contexts');
}

interface OITData {
    oitNumber: string;
    description?: string;
    location?: string;
    scheduledDate?: Date;
}

export class TemplateDataMapper {
    private oit: OITData;
    private aiAnalysis: string;
    private date: string;
    private year: string;

    constructor(templateFileName: string, oit: OITData, aiAnalysis: string) {
        this.oit = oit;
        this.aiAnalysis = aiAnalysis.replace(/[#*`]/g, '');
        this.date = new Date().toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
        this.year = new Date().getFullYear().toString();
    }

    private getClient(): string {
        return this.oit.description?.split(':')[0]?.trim() || 'Cliente General';
    }

    private getLocation(): string {
        return this.oit.location || 'Barranquilla, Atlántico';
    }

    private getDateRange(): string {
        const today = new Date();
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return `${lastWeek.toLocaleDateString('es-CO')} y ${today.toLocaleDateString('es-CO')}`;
    }

    /**
     * Generate data based on ACTUAL document context
     */
    public generateData(): Record<string, any> {
        const data: Record<string, any> = {};

        // === HEADER/COVER PAGE ===
        // e_por_1 → After "INFORME TÉCNICO... POR" = Company/Author
        data['e_por_1'] = 'SERAMBIENTE S.A.S.';

        // var_1 → Part of title block = Report identifier
        data['var_1'] = this.oit.oitNumber;

        // var_2 → Before "PROYECTO" = Additional title info
        data['var_2'] = this.year;

        // === PROJECT INFO ===
        // monitoreo_de_calidad_del_aire_ejecutado_entre_el_1 → Date range
        data['monitoreo_de_calidad_del_aire_ejecutado_entre_el_1'] = this.getDateRange();

        // var_3 → After "en las siguientes estaciones:" = Station list
        data['var_3'] = 'EST-01, EST-02, EST-03';

        // var_4 → Station info continuation
        data['var_4'] = 'ubicadas en el área de influencia del proyecto';

        // === INTRODUCTION ===
        // contrato_los_servicios... = Client name
        data['contrato_los_servicios_de_serambiente_s_a_s_para_r_1'] = this.getClient();
        data['contrato_los_servicios_de_serambiente_s_a_s_para_r_2'] = this.oit.description || 'Proyecto de Monitoreo';

        // del_localizado_en_1 → City/Location
        data['del_localizado_en_1'] = this.getLocation();

        // localizado_en_departamento_de_1 → Department
        data['localizado_en_departamento_de_1'] = 'Atlántico';

        // === STATION TABLE (var_21-24 repeat for each row!) ===
        // var_21 = Station code, var_22 = Description, var_23 = North coord, var_24 = East coord
        data['var_21'] = 'EST-01';
        data['var_22'] = 'Estación de monitoreo principal';
        data['var_23'] = '1.852.345';  // North coordinate format
        data['var_24'] = '920.567';    // East coordinate format

        // === FICHA TÉCNICA (var_16-20 - sampling details) ===
        data['var_16'] = 'High Volume Sampler';
        data['var_17'] = 'PM10, PM2.5';
        data['var_18'] = '24 horas';
        data['var_19'] = '1.13 m³/min';
        data['var_20'] = 'Método gravimétrico';

        // === TECHNICAL SPECS ===
        // var_27 = Equipment in ficha técnica table
        data['var_27'] = 'Muestreador de Alto Volumen BGI PQ200';
        // var_28 = After "Distancia energía" = Some technical value
        data['var_28'] = '2.0 m';
        // var_31 = After "Observaciones" = Observations
        data['var_31'] = 'Sin anomalías durante el muestreo';

        // === RESULTS TABLE (var_32, var_34, var_51 - repeat for each measurement!) ===
        // These are TABLE CELLS - they repeat for each row of results
        // var_32 = Station ID in results table (18 occurrences)
        data['var_32'] = 'EST-01';
        // var_51 = Some result value (3 occurrences) 
        data['var_51'] = '45.2';
        // var_34 = Result values (54 occurrences! - main result column)
        data['var_34'] = '45.2 µg/m³';

        // === EMISSION SOURCES (var_5-8) ===
        // These come after "a continuación:" describing emission sources
        data['var_5'] = 'Tráfico vehicular en vías principales';
        data['var_6'] = 'Actividad industrial en zona';
        data['var_7'] = 'Fuentes móviles y estacionarias';
        data['var_8'] = 'Emisiones fugitivas de material particulado';

        // === NORMATIVE TABLE (var_53-73 - regulation values) ===
        // These are in the table comparing results to norms
        data['var_53'] = '75';  // PM10 limit
        data['var_54'] = '37';  // PM2.5 limit
        data['var_55'] = '100'; // NO2 limit
        data['var_56'] = '50';  // SO2 limit
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

        // var_9 → After normative table, before "METODOLOGÍAS"
        data['var_9'] = '';

        // var_10-15 → Methodology section content
        for (let i = 10; i <= 15; i++) {
            data[`var_${i}`] = '';
        }

        // === LONG DESCRIPTIVE KEYS ===
        // These are sentence-completion fields
        data['a_fin_de_dar_cumplimiento_a_los_requerimientos_de__1'] = '(3) tres';
        data['estaciones_en_sitios_representativos_de_la_direcci_1'] = 'representativo del área de estudio';
        data['el_presente_documento_de_caracter_tecnico_contiene_1'] = this.getDateRange();
        data['de_noviembre_de_2017_del_ministerio_de_ambiente_y__1'] = '';
        data['realizar_la_evaluacion_de_la_calidad_de_aire_en_1'] = '(3) tres';
        data['estaciones_ubicadas_en_el_area_de_estudio_del_1'] = this.getClient();
        data['estaciones_ubicadas_en_el_area_de_estudio_del_loca_1'] = 'departamento de Atlántico';
        data['determinar_los_niveles_de_inmision_de_los_contamin_1'] = 'PM10, PM2.5, SO2, NO2 y O3';
        data['las_mediciones_toma_de_muestra_y_analisis_de_1'] = 'calidad del aire';
        data['fue_realizada_por_servicios_de_ingenieria_y_ambien_1'] = 'Resolución 1262 de 2021';
        data['para_determinar_los_niveles_de_calidad_de_aire_de_1'] = '(3) tres estaciones';
        data['de_de_monitoreo_ubicadas_en_el_area_de_estudio_del_1'] = this.getClient();
        data['las_evaluaciones_de_la_calidad_del_aire_se_efectua_1'] = '(3) tres estaciones';
        data['las_evaluaciones_de_la_calidad_del_aire_se_efectua_2'] = this.getDateRange();
        data['de_monitoreo_evaluadas_durante_el_periodo_comprend_1'] = 'PM10, PM2.5, SO2, NO2, O3';
        data['el_presente_monitoreo_se_efectuo_1'] = this.getDateRange();
        data['en_el_area_de_estudio_1'] = this.getClient();
        data['para_el_desarrollo_de_este_estudio_en_particular_f_1'] = 'seleccionadas (3) tres estaciones';
        data['en_el_area_de_estudio_del_1'] = this.getClient();
        data['las_normas_de_calidad_del_aire_para_todo_el_territ_1'] = '';
        data['se_determino_pm10_mediante_el_metodo_u_s_epa_cfr_t_1'] = '';
        data['se_determino_pm10_mediante_el_metodo_u_s_epa_cfr_t_2'] = '';
        data['se_determino_pm2_5_mediante_el_metodo_us_epa_cfr_t_1'] = '';
        data['3_ficha_tecnica_1'] = 'Estación EST-01';
        data['tabla_4_contiene_los_numeros_de_identificacion_asi_1'] = '';
        data['se_presentan_las_incertidumbres_de_los_resultados__1'] = '';
        data['las_incertidumbres_de_los_resultados_asociados_a_c_1'] = 'se detallan en el Anexo 4';
        data['en_las_siguientes_secciones_se_presentan_las_conce_1'] = 'PM10 y PM2.5';
        data['en_las_siguientes_secciones_se_presentan_las_conce_2'] = this.getClient();
        data['los_resultados_de_las_1'] = 'estaciones de monitoreo';

        // === STANDARD FIELDS ===
        data['fuente_serambiente_s_a_s_1'] = 'SERAMBIENTE S.A.S.';
        data['fuente_serambiente_s_a_s_2'] = 'SERAMBIENTE S.A.S.';
        data['fuente_serambiente_s_a_s_3'] = 'SERAMBIENTE S.A.S.';
        data['el_monitoreo_fue_realizado_por_la_empresa_servicio_1'] = 'SERAMBIENTE S.A.S.';

        // === LEGACY SNAKE CASE ===
        data['cliente_1'] = this.getClient();
        data['nit_1'] = '900.123.456-7';
        data['direccion_1'] = this.getLocation();
        data['contacto_1'] = 'Ing. Director Técnico';
        data['ciudad_1'] = 'Barranquilla';
        data['departamento_1'] = 'Atlántico';
        data['fecha_1'] = this.date;
        data['fecha_informe'] = this.date;

        // === CAPITALIZED VARIATIONS ===
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

        // === FILL REMAINING var_N up to 200 with safe defaults ===
        for (let i = 1; i <= 200; i++) {
            if (!data[`var_${i}`]) {
                data[`var_${i}`] = '';
            }
        }

        console.log(`[TemplateMapper] Generated ${Object.keys(data).length} data keys`);
        return data;
    }
}

export default TemplateDataMapper;
