"use strict";
/**
 * Template-Specific Configuration
 * Maps each template type to its specific field meanings and data sources
 *
 * Generated from allTemplateFields.json extraction
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEMPLATE_CONFIGS = exports.FUENTES_FIJAS_CONFIG = exports.OLORES_CONFIG = exports.CALIDAD_AIRE_CONFIG = exports.RUIDO_AMBIENTAL_CONFIG = exports.EMISION_RUIDO_CONFIG = exports.PUNTO_SECO_CONFIG = exports.RESPEL_CONFIG = void 0;
exports.getTemplateType = getTemplateType;
// Common field mappings used across templates
const COMMON_FIELDS = {
    // OIT identification
    'var_1': { source: 'OIT', field: 'oitNumber', description: 'Código OIT' },
    'var_2': { source: 'DATE', field: 'year', description: 'Año del informe' },
    // Client info
    'contrato_los_servicios_de_serambiente_s_a_s_para_r_1': { source: 'AI', field: 'cliente', description: 'Nombre del cliente' },
    'contrato_los_servicios_de_serambiente_s_a_s_para_r_2': { source: 'OIT', field: 'description', description: 'Descripción del proyecto' },
    'contrato_los_servicios_de_servicios_de_ingenieria__1': { source: 'AI', field: 'cliente', description: 'Nombre del cliente' },
    // Location
    'del_localizado_en_1': { source: 'OIT', field: 'location', format: 'location', description: 'Ciudad, Departamento' },
    'localizado_en_departamento_de_1': { source: 'AI', field: 'ubicacion.departamento', description: 'Departamento' },
    'ubicado_en_el_1': { source: 'OIT', field: 'location', description: 'Ubicación' },
    // Dates
    'realizada_el_dia_1': { source: 'DATE', field: 'day', description: 'Día del monitoreo' },
    'realizada_el_dia_de_1': { source: 'DATE', field: 'month', description: 'Mes del monitoreo' },
    'de_del_a_o_1': { source: 'DATE', field: 'year', description: 'Año del monitoreo' },
    'de_de_1': { source: 'DATE', field: 'year', description: 'Año' },
    'de_de_2': { source: 'DATE', field: 'year', description: 'Año' },
    'el_presente_monitoreo_se_efectuo_1': { source: 'SAMPLING', field: 'dateRange', description: 'Rango de fechas' },
    // Company
    'fuente_serambiente_s_a_s_1': { source: 'STATIC', staticValue: 'SERAMBIENTE S.A.S.', description: 'Fuente' },
    'fuente_serambiente_s_a_s_2': { source: 'STATIC', staticValue: 'SERAMBIENTE S.A.S.', description: 'Fuente' },
    'fuente_serambiente_s_a_s_3': { source: 'STATIC', staticValue: 'SERAMBIENTE S.A.S.', description: 'Fuente' },
    'el_monitoreo_fue_realizado_por_la_empresa_servicio_1': { source: 'STATIC', staticValue: 'SERAMBIENTE S.A.S.', description: 'Empresa ejecutora' },
    // Climate data
    'tiene_un_clima_tropical_de_acuerdo_con_k_ppen_y_ge_1': { source: 'AI', field: 'clima.temperatura', description: 'Temperatura promedio' },
    'tiene_un_clima_tropical_de_acuerdo_con_k_ppen_y_ge_2': { source: 'AI', field: 'clima.humedad', description: 'Humedad relativa' },
    'tiene_un_clima_tropical_en_comparacion_con_el_invi_1': { source: 'AI', field: 'clima.temperatura', description: 'Temperatura' },
    'tiene_un_clima_tropical_en_comparacion_con_el_invi_2': { source: 'AI', field: 'clima.humedad', description: 'Humedad' },
    // Station info
    'var_3': { source: 'AI', field: 'estaciones.codigos', description: 'Códigos de estaciones' },
    'var_4': { source: 'AI', field: 'descripcionArea', description: 'Descripción del área de estudio' },
    'puntos_de_monitoreo_los_cuales_se_ubican_en_el_1': { source: 'OIT', field: 'location', description: 'Ubicación puntos' },
    // Coordinates (var_21-24 typical for station tables)
    'var_21': { source: 'AI', field: 'estaciones[0].codigo', description: 'Código estación 1' },
    'var_22': { source: 'AI', field: 'estaciones[0].descripcion', description: 'Descripción estación 1' },
    'var_23': { source: 'AI', field: 'estaciones[0].norte', description: 'Coordenada Norte' },
    'var_24': { source: 'AI', field: 'estaciones[0].este', description: 'Coordenada Este' },
};
// RESPEL Template (64-09)
exports.RESPEL_CONFIG = {
    templateType: 'RESPEL',
    displayName: 'Caracterización de Residuos Peligrosos',
    filePattern: 'FO-PO-PSM-64-09',
    fields: Object.assign(Object.assign({}, COMMON_FIELDS), { 'de_estudio_de_caracterizacion_de_respel_en_1': { source: 'AI', field: 'tipoResiduo', description: 'Tipo de residuo caracterizado' }, 'determinar_la_concentracion_de_contaminantes_en_lo_1': { source: 'AI', field: 'parametros', description: 'Parámetros analizados' }, 'var_30': { source: 'STATIC', staticValue: 'Resolución 1207/2014', description: 'Resolución aplicable' }, 'var_31': { source: 'STATIC', staticValue: 'Resolución 1207/2014', description: 'Resolución aplicable' }, 'var_32': { source: 'STATIC', staticValue: 'Resolución 1207/2014', description: 'Resolución aplicable' }, 'var_35': { source: 'OIT', field: 'location', description: 'Sede monitoreo' }, 'var_36': { source: 'AI', field: 'cumplimiento', description: 'CUMPLE/NO CUMPLE' }, 'var_37': { source: 'DATE', field: 'fullDate', description: 'Fecha de monitoreo' }, 'se_realizo_la_toma_de_las_muestras_el_dia_1': { source: 'DATE', field: 'day', description: 'Día muestreo' }, 'se_realizo_la_toma_de_las_muestras_el_dia_de_1': { source: 'DATE', field: 'monthYear', description: 'Mes y año muestreo' }, 'punto_1': { source: 'AI', field: 'puntos[0].nombre', description: 'Nombre punto 1' }, 'finalmente_es_importante_mencionar_los_metodos_emp_1': { source: 'AI', field: 'metodologia', description: 'Metodología empleada' } })
};
// PUNTO SECO Template (64-10)
exports.PUNTO_SECO_CONFIG = {
    templateType: 'PUNTO_SECO',
    displayName: 'Informe de Punto Seco (Agua)',
    filePattern: 'FO-PO-PSM-64-10',
    fields: Object.assign(Object.assign({}, COMMON_FIELDS), { 'informe_tecnico_de_estudio_de_caracterizacion_de_a_1': { source: 'AI', field: 'tituloInforme', description: 'Título del informe' }, 'estudio_de_caracterizacion_1': { source: 'AI', field: 'tipoEstudio', description: 'Tipo de caracterización' }, 'nombre_cliente_los_cuales_contemplaban_la_toma_de__1': { source: 'AI', field: 'cliente', description: 'Nombre cliente' }, 'en_xxx_xx_puntos_de_monitoreo_ubicados_en_la_ciuda_1': { source: 'AI', field: 'numeroPuntos', description: 'Número de puntos' }, 'en_xxx_xx_puntos_de_monitoreo_ubicados_en_la_ciuda_2': { source: 'AI', field: 'ubicacion.ciudad', description: 'Ciudad' }, 'en_el_anexo_2_formatos_de_campo_p_1': { source: 'STATIC', staticValue: 'se adjuntan los formatos de campo', description: 'Referencia anexos' }, 'var_8': { source: 'AI', field: 'parametrosAnalizados', description: 'Parámetros analizados' }, 'var_10': { source: 'AI', field: 'resultadosResumen', description: 'Resumen de resultados' }, 'de_monitoreo_realizado_en_el_1': { source: 'OIT', field: 'location', description: 'Lugar de monitoreo' }, 'var_15': { source: 'AI', field: 'cumplimiento', description: 'Cumplimiento normativo' }, 'var_16': { source: 'AI', field: 'recomendaciones', description: 'Recomendaciones' }, '1_ubicacion_geografica_1': { source: 'STATIC', staticValue: 'Ver mapa en anexos', description: 'Ubicación geográfica' }, 'en_cumplimiento_de_los_compromisos_establecidos_co_1': { source: 'AI', field: 'contrato', description: 'Referencia contrato' } })
};
// EMISIÓN DE RUIDO Template (65-06)
exports.EMISION_RUIDO_CONFIG = {
    templateType: 'EMISION_RUIDO',
    displayName: 'Estudio de Emisión de Ruido',
    filePattern: 'FO-PO-PSM-65-06',
    fields: Object.assign(Object.assign({}, COMMON_FIELDS), { 'monitoreo_de_emision_de_ruido_realizado_el_1': { source: 'DATE', field: 'fullDate', description: 'Fecha monitoreo' }, 'un_monitoreo_de_emision_de_ruido_en_serambiente_s__1': { source: 'AI', field: 'descripcionMonitoreo', description: 'Descripción' }, 'vigente_hasta_el_1': { source: 'STATIC', staticValue: 'vigente', description: 'Vigencia certificación' }, 'las_mediciones_de_emision_de_ruido_se_llevaron_a_c_1': { source: 'AI', field: 'metodologia', description: 'Metodología' }, 'de_monitoreo_ubicados_en_el_area_de_estudio_de_la__1': { source: 'AI', field: 'cliente', description: 'Área de estudio' }, 'cabe_se_alar_que_la_jornada_de_monitoreo_se_ejecut_1': { source: 'AI', field: 'jornadaMonitoreo', description: 'Jornada de monitoreo' }, 'el_monitoreo_se_realizo_1': { source: 'DATE', field: 'dateRange', description: 'Período' }, 'var_19': { source: 'AI', field: 'jornada', description: 'Jornada (diurna/nocturna)' }, 'el_proposito_de_la_medicion_es_determinar_los_nive_1': { source: 'AI', field: 'objetivos', description: 'Objetivo de medición' }, 'aron_a_cabo_mediciones_de_emision_de_ruido_en_1': { source: 'AI', field: 'numeroPuntos', description: 'Número de puntos' }, 'el_area_de_estudio_de_la_empresa_1': { source: 'AI', field: 'cliente', description: 'Empresa evaluada' }, 'var_5': { source: 'AI', field: 'descripcionPuntos', description: 'Descripción puntos' }, '4_descripcion_y_ubicacion_1': { source: 'AI', field: 'ubicacionDetalle', description: 'Ubicación detallada' }, 'var_20': { source: 'AI', field: 'sectorCategoria', description: 'Sector/Categoría' }, 'el_equipo_utilizado_para_la_medicion_fue_un_sonome_1': { source: 'STATIC', staticValue: 'Sonómetro integrador tipo 1', description: 'Equipo' }, 'el_equipo_utilizado_para_la_medicion_fue_un_sonome_2': { source: 'AI', field: 'equipoModelo', description: 'Modelo equipo' }, 'los_resultados_obtenidos_en_las_medidas_de_la_emis_1': { source: 'AI', field: 'resumenResultados', description: 'Resumen resultados' }, 
        // Noise measurements
        'var_6': { source: 'SAMPLING', field: 'ruido.laeq1', format: 'number', description: 'LAeq punto 1' }, 'var_7': { source: 'SAMPLING', field: 'ruido.laeq2', format: 'number', description: 'LAeq punto 2' }, 'var_8': { source: 'SAMPLING', field: 'ruido.laeq3', format: 'number', description: 'LAeq punto 3' }, 'laeq_t_residual_1': { source: 'SAMPLING', field: 'ruido.residual', description: 'LAeq residual' }, 
        // Weather conditions
        'var_10': { source: 'SAMPLING', field: 'condiciones.temperatura', description: 'Temperatura' }, 'var_11': { source: 'SAMPLING', field: 'condiciones.humedad', description: 'Humedad' }, 'var_12': { source: 'SAMPLING', field: 'condiciones.presion', description: 'Presión' }, 'var_13': { source: 'AI', field: 'rosaVientos', description: 'Rosa de vientos' }, 
        // Compliance
        'grafica_1_se_logra_identificar_que_todos_los_punto_1': { source: 'AI', field: 'analisisGrafico', description: 'Análisis gráfico' }, 'fueron_clasificados_como_conformes_con_respecto_al_1': { source: 'AI', field: 'clasificacionConformidad', description: 'Conformidad' } })
};
// RUIDO AMBIENTAL Template (65-07)
exports.RUIDO_AMBIENTAL_CONFIG = {
    templateType: 'RUIDO_AMBIENTAL',
    displayName: 'Estudio de Ruido Ambiental',
    filePattern: 'FO-PO-PSM-65-07',
    fields: Object.assign(Object.assign({}, COMMON_FIELDS), { 'aron_a_cabo_mediciones_de_ruido_ambiental_1': { source: 'AI', field: 'numeroPuntos', description: 'Número de puntos' }, 'las_mediciones_de_ruido_ambiental_se_llevaron_a_ca_1': { source: 'AI', field: 'metodologia', description: 'Metodología' }, 'las_mediciones_de_ruido_ambiental_se_realizaron_co_1': { source: 'AI', field: 'equipoUsado', description: 'Equipo usado' }, 'la_jornada_de_monitoreo_de_ruido_ambiental_se_ejec_1': { source: 'AI', field: 'jornadaMonitoreo', description: 'Jornada monitoreo' }, 'ambiental_para_la_fecha_y_hora_del_monitoreo_el_co_1': { source: 'AI', field: 'condicionesAmbientales', description: 'Condiciones' }, 'ambiental_por_cada_punto_de_muestreo_es_de_una_hor_1': { source: 'STATIC', staticValue: '1 hora', description: 'Duración medición' }, '5_2_1_ruido_ambiental_diurno_habil_1': { source: 'AI', field: 'resultadosDiurnoHabil', description: 'Resultados diurno hábil' }, '5_2_2_ruido_ambiental_nocturno_habil_1': { source: 'AI', field: 'resultadosNocturnoHabil', description: 'Resultados nocturno hábil' }, 'ruido_ambiental_diurno_no_habil_1': { source: 'AI', field: 'resultadosDiurnoNoHabil', description: 'Resultados diurno no hábil' }, 'isofonas_1': { source: 'STATIC', staticValue: 'Ver mapas en anexos', description: 'Referencia isofonas' }, 'mapas_de_ruido_isofonas_para_el_horario_diurno_hab_1': { source: 'AI', field: 'analisisMapas', description: 'Análisis mapas ruido' } })
};
// CALIDAD DE AIRE Template (66-18)
exports.CALIDAD_AIRE_CONFIG = {
    templateType: 'CALIDAD_AIRE',
    displayName: 'Informe de Calidad de Aire',
    filePattern: 'FO-PO-PSM-66-18',
    fields: Object.assign(Object.assign({}, COMMON_FIELDS), { 'e_por_1': { source: 'STATIC', staticValue: 'SERAMBIENTE S.A.S.', description: 'Empresa' }, 'monitoreo_de_calidad_del_aire_ejecutado_entre_el_1': { source: 'SAMPLING', field: 'dateRange', description: 'Rango de fechas' }, 'calidad_del_aire_ejecutado_entre_el_1': { source: 'SAMPLING', field: 'dateRange', description: 'Período' }, 'calidad_del_aire_en_el_area_de_estudio_del_el_cual_1': { source: 'AI', field: 'areaEstudio', description: 'Área de estudio' }, 
        // Stations
        'estaciones_en_sitios_representativos_de_la_direcci_1': { source: 'AI', field: 'criterioUbicacion', description: 'Criterio ubicación' }, 'estaciones_ubicadas_en_el_area_de_estudio_del_1': { source: 'AI', field: 'cliente', description: 'Cliente' }, 'estaciones_ubicadas_en_el_area_de_estudio_del_loca_1': { source: 'AI', field: 'ubicacion.departamento', description: 'Departamento' }, 
        // Parameters
        'determinar_los_niveles_de_inmision_de_los_contamin_1': { source: 'AI', field: 'parametros', description: 'Contaminantes medidos' }, 'las_mediciones_toma_de_muestra_y_analisis_de_1': { source: 'STATIC', staticValue: 'calidad del aire', description: 'Tipo análisis' }, 'fue_realizada_por_servicios_de_ingenieria_y_ambien_1': { source: 'STATIC', staticValue: 'Resolución 1262 de 2021', description: 'Acreditación' }, 
        // Methodology
        'a_fin_de_dar_cumplimiento_a_los_requerimientos_de__1': { source: 'AI', field: 'numeroEstaciones', description: 'Número estaciones' }, 'realizar_la_evaluacion_de_la_calidad_de_aire_en_1': { source: 'AI', field: 'numeroEstaciones', description: 'Número estaciones' }, 'para_determinar_los_niveles_de_calidad_de_aire_de_1': { source: 'AI', field: 'numeroEstaciones', description: 'Número estaciones' }, 'para_el_desarrollo_de_este_estudio_en_particular_f_1': { source: 'AI', field: 'seleccionEstaciones', description: 'Selección de estaciones' }, 
        // Equipment
        'var_16': { source: 'AI', field: 'equipoPM', description: 'Equipo PM' }, 'var_17': { source: 'AI', field: 'parametros', description: 'Parámetros' }, 'var_18': { source: 'STATIC', staticValue: '24 horas', description: 'Duración muestreo' }, 'var_19': { source: 'AI', field: 'caudal', description: 'Caudal' }, 'var_20': { source: 'AI', field: 'metodo', description: 'Método' }, 'var_27': { source: 'AI', field: 'equipos', description: 'Equipos usados' }, 'var_28': { source: 'STATIC', staticValue: '2.0 m', description: 'Altura muestreo' }, 'var_31': { source: 'AI', field: 'observaciones', description: 'Observaciones' }, 
        // Results
        'var_32': { source: 'AI', field: 'estaciones[0].codigo', description: 'Código estación' }, 'var_34': { source: 'SAMPLING', field: 'resultados.pm10', format: 'number', description: 'Resultado PM10' }, 'var_51': { source: 'SAMPLING', field: 'resultados.valor', format: 'number', description: 'Valor medido' }, 'los_resultados_de_las_1': { source: 'STATIC', staticValue: 'estaciones de monitoreo', description: 'Referencia resultados' }, 
        // Normative limits (Colombian Res. 2254/2017)
        'var_53': { source: 'STATIC', staticValue: '75', description: 'Límite PM10 24h' }, 'var_54': { source: 'STATIC', staticValue: '37', description: 'Límite PM2.5 24h' }, 'var_55': { source: 'STATIC', staticValue: '100', description: 'Límite NO2 1h' }, 'var_56': { source: 'STATIC', staticValue: '50', description: 'Límite SO2 24h' }, 'var_57': { source: 'STATIC', staticValue: '24 horas', description: 'Tiempo exposición' }, 
        // Conclusions
        'las_evaluaciones_de_la_calidad_del_aire_se_efectua_1': { source: 'AI', field: 'numeroEstaciones', description: 'Número estaciones' }, 'las_evaluaciones_de_la_calidad_del_aire_se_efectua_2': { source: 'SAMPLING', field: 'dateRange', description: 'Período evaluación' }, 'de_monitoreo_evaluadas_durante_el_periodo_comprend_1': { source: 'AI', field: 'parametros', description: 'Parámetros evaluados' }, 'en_el_area_de_estudio_1': { source: 'AI', field: 'cliente', description: 'Cliente' }, 'en_el_area_de_estudio_del_1': { source: 'AI', field: 'cliente', description: 'Cliente' }, 'las_normas_de_calidad_del_aire_para_todo_el_territ_1': { source: 'STATIC', staticValue: 'Resolución 2254 de 2017', description: 'Normativa' }, 
        // PM10/PM2.5 Methods
        'se_determino_pm10_mediante_el_metodo_u_s_epa_cfr_t_1': { source: 'STATIC', staticValue: 'EPA CFR 40 Part 50', description: 'Método PM10' }, 'se_determino_pm10_mediante_el_metodo_u_s_epa_cfr_t_2': { source: 'STATIC', staticValue: 'EPA CFR 40 Part 50', description: 'Método PM10' }, 'se_determino_pm2_5_mediante_el_metodo_us_epa_cfr_t_1': { source: 'STATIC', staticValue: 'EPA CFR 40 Part 50', description: 'Método PM2.5' }, 
        // Technical sheets
        '3_ficha_tecnica_1': { source: 'AI', field: 'estaciones[0].codigo', description: 'Estación ficha' }, 'tabla_4_contiene_los_numeros_de_identificacion_asi_1': { source: 'STATIC', staticValue: '', description: 'Tabla identificación' }, 
        // Uncertainties
        'se_presentan_las_incertidumbres_de_los_resultados__1': { source: 'STATIC', staticValue: 'se detallan en el Anexo 4', description: 'Incertidumbres' }, 'las_incertidumbres_de_los_resultados_asociados_a_c_1': { source: 'STATIC', staticValue: 'se detallan en el Anexo 4', description: 'Incertidumbres' }, 
        // Analysis sections
        'en_las_siguientes_secciones_se_presentan_las_conce_1': { source: 'AI', field: 'parametrosPrincipales', description: 'Parámetros principales' }, 'en_las_siguientes_secciones_se_presentan_las_conce_2': { source: 'AI', field: 'cliente', description: 'Cliente' } })
};
// OLORES OFENSIVOS Template (66-19)
exports.OLORES_CONFIG = {
    templateType: 'OLORES',
    displayName: 'Informe de Olores Ofensivos',
    filePattern: 'FO-PO-PSM-66-19',
    fields: Object.assign(Object.assign({}, COMMON_FIELDS), { 'informe_tecnico_de_estudio_de_olores_ofensivos_en__1': { source: 'AI', field: 'cliente', description: 'Cliente' }, 'olores_ofensivos_en_calidad_de_aire_en_el_area_del_1': { source: 'AI', field: 'areaEstudio', description: 'Área de estudio' }, 'realizar_la_evaluacion_de_olores_ofensivos_en_cali_1': { source: 'AI', field: 'objetivo', description: 'Objetivo' }, 'la_calidad_de_aire_por_olores_ofensivos_en_las_1': { source: 'AI', field: 'numeroEstaciones', description: 'Número estaciones' }, 'de_la_calidad_del_aire_por_olores_ofensivos_se_efe_1': { source: 'AI', field: 'metodologia', description: 'Metodología' }, 'resolucion_1541_de_2013_del_ministerio_de_ambiente_1': { source: 'STATIC', staticValue: 'Resolución 1541 de 2013', description: 'Normativa' } })
};
// FUENTES FIJAS Template (67-11)
exports.FUENTES_FIJAS_CONFIG = {
    templateType: 'FUENTES_FIJAS',
    displayName: 'Informe de Fuentes Fijas',
    filePattern: 'FO-PO-PSM-67-11',
    fields: Object.assign(Object.assign({}, COMMON_FIELDS), { 'monitoreo_de_emisiones_en_fuentes_fijas_realizado__1': { source: 'DATE', field: 'fullDate', description: 'Fecha monitoreo' }, 'de_evaluacion_de_emisiones_atmosfericas_de_fuentes_1': { source: 'AI', field: 'objetivoEvaluacion', description: 'Objetivo' }, 'a_traves_de_monitoreo_isocinetico_1': { source: 'STATIC', staticValue: 'muestreo isocinético', description: 'Tipo muestreo' }, 'la_legislacion_colombiana_aplicable_a_las_emisione_1': { source: 'STATIC', staticValue: 'Resolución 909 de 2008', description: 'Normativa' }, 'de_la_resolucion_909_de_2008_al_reportar_una_conce_1': { source: 'AI', field: 'cumplimiento909', description: 'Cumplimiento Res. 909' }, 'de_la_resolucion_909_de_2008_debido_a_que_se_repor_1': { source: 'AI', field: 'razonCumplimiento', description: 'Razón cumplimiento' }, 'las_emisiones_de_oxido_de_nitrogeno_nox_para_las_f_1': { source: 'SAMPLING', field: 'emisionesNOx', description: 'Emisiones NOx' }, 'valor_tomado_de_la_resolucion_909_de_2008_para_flu_1': { source: 'STATIC', staticValue: 'Resolución 909/2008', description: 'Referencia normativa' }, 'reportadas_a_condiciones_de_referencia_de_presion__1': { source: 'STATIC', staticValue: '25°C y 760 mmHg', description: 'Condiciones referencia' }, 'se_realizo_correccion_a_oxigeno_de_referencia_del_1': { source: 'AI', field: 'correccionO2', description: 'Corrección O2' }, 'se_realizo_correccion_a_oxigeno_de_referencia_del__1': { source: 'AI', field: 'correccionO2', description: 'Corrección O2' }, 'cuantificar_la_emision_de_1': { source: 'AI', field: 'parametrosEmision', description: 'Parámetros de emisión' } })
};
// Map template type to config
exports.TEMPLATE_CONFIGS = {
    'RESPEL': exports.RESPEL_CONFIG,
    'PUNTO_SECO': exports.PUNTO_SECO_CONFIG,
    'EMISION_RUIDO': exports.EMISION_RUIDO_CONFIG,
    'RUIDO_AMBIENTAL': exports.RUIDO_AMBIENTAL_CONFIG,
    'CALIDAD_AIRE': exports.CALIDAD_AIRE_CONFIG,
    'OLORES': exports.OLORES_CONFIG,
    'FUENTES_FIJAS': exports.FUENTES_FIJAS_CONFIG,
};
/**
 * Get template type from filename
 */
function getTemplateType(fileName) {
    if (fileName.includes('RESPEL'))
        return 'RESPEL';
    if (fileName.includes('PUNTO SECO'))
        return 'PUNTO_SECO';
    if (fileName.includes('EMISIÓN DE RUIDO Y RUIDO AMBIENTAL'))
        return 'EMISION_RUIDO_AMBIENTAL';
    if (fileName.includes('EMISIÓN DE RUIDO'))
        return 'EMISION_RUIDO';
    if (fileName.includes('RUIDO INTRADOMICILIARIO'))
        return 'RUIDO_INTRADOMICILIARIO';
    if (fileName.includes('RUIDO AMBIENTAL'))
        return 'RUIDO_AMBIENTAL';
    if (fileName.includes('CALIDAD DE AIRE'))
        return 'CALIDAD_AIRE';
    if (fileName.includes('OLORES OFENSIVOS'))
        return 'OLORES';
    if (fileName.includes('PARTÍCULAS VIABLES'))
        return 'PARTICULAS_VIABLES';
    if (fileName.includes('PREVIOS EN FUENTES FIJAS'))
        return 'FUENTES_FIJAS_PREVIO';
    if (fileName.includes('FUENTES FIJAS'))
        return 'FUENTES_FIJAS';
    return 'UNKNOWN';
}
exports.default = exports.TEMPLATE_CONFIGS;
