"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const docx_service_1 = require("../services/docx.service");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function generateSample() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('--- GENERATING SAMPLE WORD REPORT ---');
        const templateName = 'FO-PO-PSM-64-10 FORMATO PARA LA ELABORACIÓN DE INFORME PUNTO SECO-plantilla.docx';
        // Mock data matching the fields we found in this template
        const demoData = {
            'informe_tecnico_de_estudio_de_caracterizacion_de_a_1': 'INFORME TÉCNICO DE MONITOREO',
            'var_1': 'OIT-2026-001',
            'estudio_de_caracterizacion_1': 'ESTUDIO AMBIENTAL INTEGRAL',
            'var_2': 'SERAMBIENTE S.A.S',
            'realizada_el_dia_1': '03',
            'realizada_el_dia_de_1': 'Enero',
            'de_del_a_o_1': '2026',
            'var_3': 'BOGOTÁ, CUNDINAMARCA',
            'nombre_cliente_los_cuales_contemplaban_la_toma_de__1': 'ALIMENTOS DEL NORTE S.A.',
            'en_xxx_xx_puntos_de_monitoreo_ubicados_en_la_ciuda_1': '05',
            'en_xxx_xx_puntos_de_monitoreo_ubicados_en_la_ciuda_2': 'Bogotá',
            'var_4': 'Se realizó muestreo en puntos críticos de vertimiento.',
            'en_el_anexo_2_formatos_de_campo_p_1': 'Formatos de campo adjuntos.',
            'var_8': 'Análisis de PH, DQO, DBO5.',
            'var_10': 'Resultados dentro de los límites permisibles.',
            'de_monitoreo_realizado_en_el_1': 'Sector Industrial',
            'tiene_un_clima_tropical_en_comparacion_con_el_invi_1': '22°C',
            'tiene_un_clima_tropical_en_comparacion_con_el_invi_2': '85%',
            'var_15': 'Cumple Norma 0631 de 2015.',
            'var_16': 'Se recomienda mantenimiento de trampa de grasas.',
            'var_17': 'Auditoría Técnica ALS V2',
            'var_13': 'Muestreo Instantáneo',
            'var_14': 'Punto de vertimiento principal',
            'var_18': 'Sin novedades especiales',
            'var_19': 'Finalización exitosa',
            'var_5': 'CONCLUSIONES GENERALES',
            '1_ubicacion_geografica_1': 'Mapa de ubicación en anexos',
            'en_cumplimiento_de_los_compromisos_establecidos_co_1': 'Contrato 456-2025',
            'american_public_healt_association_apha_1': 'Método Standard Methods',
            'standard_methods_for_the_examination_of_water_and__1': 'Procedimiento Interno SER-01',
            'obtenido_de_1': 'Sistema de Gestión ALS',
            'obtenido_de_www_es_climate_data_org_1': 'Estación Meteorológica Local'
        };
        try {
            const buffer = yield docx_service_1.docxService.generateDocument(templateName, demoData);
            const outputPath = path_1.default.join(__dirname, '../../uploads/MUESTRA_INFORME_FINAL.docx');
            // Ensure uploads directory exists
            const uploadsDir = path_1.default.dirname(outputPath);
            if (!fs_1.default.existsSync(uploadsDir)) {
                fs_1.default.mkdirSync(uploadsDir, { recursive: true });
            }
            fs_1.default.writeFileSync(outputPath, buffer);
            console.log(`Successfully generated sample report at: ${outputPath}`);
            console.log('You can now check the file to see how it looks.');
        }
        catch (error) {
            console.error('Error generating sample report:', error);
        }
    });
}
generateSample();
