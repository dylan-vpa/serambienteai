/**
 * Template Data Mapper Service
 * Intelligently maps data to template variables based on template type
 */

import * as fs from 'fs';
import * as path from 'path';

// Load the generated template mappings
const mappingsPath = path.join(__dirname, 'templateMappings.json');
let TEMPLATE_MAPPINGS: Record<string, any> = {};

try {
    TEMPLATE_MAPPINGS = JSON.parse(fs.readFileSync(mappingsPath, 'utf-8'));
} catch (e) {
    console.warn('[TemplateMapper] Could not load template mappings, using defaults');
}

interface OITData {
    oitNumber: string;
    description?: string;
    location?: string;
    scheduledDate?: Date;
    status?: string;
}

interface AIAnalysisSections {
    intro: string;
    methodology: string;
    results: string;
    conclusions: string;
    fullText: string;
}

export class TemplateDataMapper {
    private templateType: string;
    private templateConfig: any;
    private oit: OITData;
    private aiSections: AIAnalysisSections;
    private date: string;

    constructor(templateFileName: string, oit: OITData, aiAnalysis: string) {
        this.oit = oit;
        this.date = new Date().toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        // Parse AI analysis into sections
        this.aiSections = this.parseAISections(aiAnalysis);

        // Detect template type from filename
        this.templateType = this.detectTemplateType(templateFileName);
        this.templateConfig = TEMPLATE_MAPPINGS[this.templateType] || {};
    }

    private detectTemplateType(filename: string): string {
        const patterns: Record<string, string[]> = {
            'ESTUDIO DE CARACTERIZACIÓN DE RESPEL': ['RESPEL', '64-09'],
            'PUNTO SECO': ['PUNTO SECO', '64-10'],
            'ESTUDIO DE EMISIÓN DE RUIDO': ['EMISIÓN DE RUIDO', '65-06'],
            'ESTUDIO DE RUIDO AMBIENTAL': ['RUIDO AMBIENTAL', '65-07'],
            'ESTUDIO DE RUIDO INTRADOMICILIARIO': ['INTRADOMICILIARIO', '65-08'],
            'ESTUDIO DE EMISIÓN DE RUIDO Y RUIDO AMBIENTAL': ['EMISIÓN DE RUIDO Y RUIDO', '65-09'],
            'CALIDAD DE AIRE': ['CALIDAD DE AIRE', '66-18'],
            'OLORES OFENSIVOS': ['OLORES', '66-19'],
            'PARTÍCULAS VIABLES': ['PARTÍCULAS VIABLES', '66-20'],
            'FUENTES FIJAS': ['FUENTES FIJAS', '67-1']
        };

        const upperFilename = filename.toUpperCase();
        for (const [type, keywords] of Object.entries(patterns)) {
            if (keywords.some(k => upperFilename.includes(k.toUpperCase()))) {
                console.log(`[TemplateMapper] Detected template type: ${type}`);
                return type;
            }
        }

        return 'CALIDAD DE AIRE'; // Default fallback
    }

    private parseAISections(analysis: string): AIAnalysisSections {
        const cleanText = analysis.replace(/[#*`]/g, '');
        const sections = cleanText.split(/(?=\n(?:#{1,3} |[0-9]+\. ))/g);

        return {
            intro: sections.slice(0, 2).join('\n') || cleanText.substring(0, 1000),
            methodology: sections.slice(2, 4).join('\n') || cleanText.substring(1000, 2000),
            results: sections.slice(4, -2).join('\n') || cleanText.substring(2000, 4000),
            conclusions: sections.slice(-2).join('\n') || cleanText.substring(4000),
            fullText: cleanText
        };
    }

    private getClient(): string {
        if (this.oit.description) {
            const parts = this.oit.description.split(':');
            return parts[0]?.trim() || 'Cliente General';
        }
        return 'Cliente General';
    }

    private getYear(): string {
        return this.oit.scheduledDate
            ? new Date(this.oit.scheduledDate).getFullYear().toString()
            : new Date().getFullYear().toString();
    }

    /**
     * Generate complete data object for docxtemplater
     */
    public generateData(): Record<string, any> {
        const data: Record<string, any> = {};
        const varDescriptions = this.templateConfig?.variableDescriptions || {};

        // Core OIT fields (always included)
        Object.assign(data, {
            oitNumber: this.oit.oitNumber,
            description: this.oit.description || '',
            location: this.oit.location || '',
            date: this.date,
            client: this.getClient(),
            year: this.getYear(),
            analysis: this.aiSections.fullText,
            narrative: this.aiSections.fullText,

            // Legacy snake_case
            cliente_1: this.getClient(),
            nit_1: '800.123.456-7',
            direccion_1: this.oit.location || 'Ubicación del Proyecto',
            contacto_1: 'Ing. Responsable',
            ciudad_1: 'Barranquilla',
            departamento_1: 'Atlántico',
            fecha_1: this.date,
            fecha_informe: this.date,

            // Capitalized
            Client: this.getClient(),
            Date: this.date,
            Location: this.oit.location || '',
            OIT: this.oit.oitNumber,
            Project: this.oit.description || 'Monitoreo Ambiental'
        });

        // Process each variable based on its description from comments
        const allVars = this.templateConfig?.variables || [];

        for (const varName of allVars) {
            if (data[varName]) continue; // Already set

            const desc = varDescriptions[varName]?.description?.toLowerCase() || '';

            // Intelligent fill based on comment description
            if (desc.includes('código') || desc.includes('consecutivo') || desc.includes('oit')) {
                data[varName] = this.oit.oitNumber;
            } else if (desc.includes('año') || desc.includes('year')) {
                data[varName] = this.getYear();
            } else if (desc.includes('fecha') || desc.includes('date')) {
                data[varName] = this.date;
            } else if (desc.includes('cliente') || desc.includes('nombre')) {
                data[varName] = this.getClient();
            } else if (desc.includes('ubicación') || desc.includes('lugar') || desc.includes('sede')) {
                data[varName] = this.oit.location || 'Ubicación del Proyecto';
            } else if (desc.includes('singular') || desc.includes('plural')) {
                data[varName] = 'punto'; // Default singular, would need context
            } else if (desc.includes('conclusi') || desc.includes('cumplimiento')) {
                data[varName] = this.aiSections.conclusions.substring(0, 500);
            } else if (desc.includes('resultado') || desc.includes('análisis')) {
                data[varName] = this.aiSections.results.substring(0, 500);
            } else if (desc.includes('metodolog') || desc.includes('método')) {
                data[varName] = this.aiSections.methodology.substring(0, 500);
            } else if (desc.includes('introducción') || desc.includes('resumen')) {
                data[varName] = this.aiSections.intro.substring(0, 500);
            } else if (desc.includes('clima') || desc.includes('atmósfer')) {
                data[varName] = 'Clima tropical húmedo. Temperatura promedio 28°C.';
            } else if (desc.includes('resolución') || desc.includes('norma')) {
                data[varName] = 'Resolución vigente aplicable';
            } else if (desc.includes('equipo') || desc.includes('sonómetro')) {
                data[varName] = 'Equipo calibrado según especificaciones técnicas';
            } else if (desc.includes('guía') || desc.includes('ejemplo')) {
                data[varName] = this.aiSections.fullText.substring(0, 400);
            } else if (desc.includes('versión')) {
                data[varName] = 'V00';
            } else {
                // Default: use appropriate AI section based on variable number
                const varNum = parseInt(varName.replace(/\D/g, ''), 10);
                if (varNum <= 10) {
                    data[varName] = this.aiSections.intro.substring(0, 400);
                } else if (varNum <= 30) {
                    data[varName] = this.aiSections.methodology.substring(0, 400);
                } else if (varNum <= 80) {
                    data[varName] = this.aiSections.results.substring(0, 400);
                } else {
                    data[varName] = this.aiSections.conclusions.substring(0, 400);
                }
            }
        }

        // Also fill descriptive long-key variables
        const longKeys = [
            'contrato_los_servicios_de_serambiente_s_a_s_para_r_1',
            'contrato_los_servicios_de_serambiente_s_a_s_para_r_2',
            'la_organizacion_tiene_como_actividad_principal_1',
            'en_las_instalaciones_de_1',
            'localizado_en_1',
            'fuente_serambiente_s_a_s_1',
            'fuente_serambiente_s_a_s_2',
            'fuente_serambiente_s_a_s_3',
            'el_monitoreo_fue_realizado_por_la_empresa_servicio_1',
            'monitoreo_de_calidad_del_aire_ejecutado_entre_el_1',
            'el_presente_documento_de_caracter_tecnico_contiene_1',
            'realizar_la_evaluacion_de_la_calidad_de_aire_en_1',
            'fue_realizada_por_servicios_de_ingenieria_y_ambien_1',
            'determinar_los_niveles_de_inmision_de_los_contamin_1',
            'cumple_con_la_norma_1',
            'no_cumple_con_la_norma_1'
        ];

        for (const key of longKeys) {
            if (!data[key]) {
                if (key.includes('serambiente')) {
                    data[key] = 'Serambiente S.A.S.';
                } else if (key.includes('cumple')) {
                    data[key] = 'CUMPLE';
                } else if (key.includes('contrato') || key.includes('servicios')) {
                    data[key] = this.oit.description || 'Monitoreo Ambiental';
                } else if (key.includes('instalaciones') || key.includes('localizado')) {
                    data[key] = this.oit.location || 'Ubicación del Proyecto';
                } else {
                    data[key] = this.aiSections.intro.substring(0, 300);
                }
            }
        }

        console.log(`[TemplateMapper] Generated ${Object.keys(data).length} data keys for template: ${this.templateType}`);
        return data;
    }
}

export default TemplateDataMapper;
