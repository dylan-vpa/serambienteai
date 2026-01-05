/**
 * Template Variable Definitions
 * Maps template types to their specific variable meanings
 */

export interface TemplateVariableConfig {
    templatePattern: string;
    variables: Record<string, {
        description: string;
        source: 'oit' | 'ai' | 'static' | 'lab_results';
        oitField?: string;
        aiSection?: 'intro' | 'methodology' | 'results' | 'conclusions';
        defaultValue?: string;
    }>;
}

export const TEMPLATE_CONFIGS: TemplateVariableConfig[] = [
    {
        templatePattern: 'CALIDAD DE AIRE',
        variables: {
            // Header Section
            'var_1': { description: 'Título del Informe', source: 'ai', aiSection: 'intro', defaultValue: 'Monitoreo de Calidad del Aire' },
            'var_2': { description: 'Período de monitoreo', source: 'oit', oitField: 'scheduledDate' },
            'var_3': { description: 'Nombre del Cliente', source: 'oit', oitField: 'description' },
            'var_4': { description: 'Ubicación del proyecto', source: 'oit', oitField: 'location' },

            // Monitoring Stations
            'var_16': { description: 'Coordenada Norte Est. 1', source: 'lab_results', defaultValue: 'N/A' },
            'var_17': { description: 'Coordenada Este Est. 1', source: 'lab_results', defaultValue: 'N/A' },
            'var_18': { description: 'Coordenada Norte Est. 2', source: 'lab_results', defaultValue: 'N/A' },
            'var_19': { description: 'Coordenada Este Est. 2', source: 'lab_results', defaultValue: 'N/A' },
            'var_20': { description: 'Descripción Área Estudio', source: 'ai', aiSection: 'methodology' },

            // Station Details
            'var_21': { description: 'Código Estación', source: 'lab_results', defaultValue: 'EST-01' },
            'var_22': { description: 'Descripción Punto Monitoreo', source: 'ai', aiSection: 'methodology' },
            'var_23': { description: 'Coordenada N', source: 'lab_results', defaultValue: '0.000000' },
            'var_24': { description: 'Coordenada E', source: 'lab_results', defaultValue: '0.000000' },

            // Equipment
            'var_27': { description: 'Equipo de Muestreo', source: 'static', defaultValue: 'High Volume Sampler' },
            'var_28': { description: 'Método de Referencia', source: 'static', defaultValue: 'US EPA CFR 40' },
            'var_31': { description: 'Rango de Medición', source: 'static', defaultValue: '0 - 500 µg/m³' },

            // Results (populated from AI analysis)
            'var_32': { description: 'Resultado PM10', source: 'ai', aiSection: 'results' },
            'var_33': { description: 'Resultado PM2.5', source: 'ai', aiSection: 'results' },
            'var_34': { description: 'Comparación Normativa', source: 'ai', aiSection: 'results' },

            // Conclusions
            'var_51': { description: 'Análisis Cumplimiento', source: 'ai', aiSection: 'conclusions' },
            'var_53': { description: 'Recomendaciones', source: 'ai', aiSection: 'conclusions' },
        }
    },
    {
        templatePattern: 'RUIDO',
        variables: {
            'var_1': { description: 'Título del Informe', source: 'ai', aiSection: 'intro' },
            'var_2': { description: 'Fecha', source: 'oit', oitField: 'scheduledDate' },
            'var_3': { description: 'Cliente', source: 'oit', oitField: 'description' },
            'var_4': { description: 'Ubicación', source: 'oit', oitField: 'location' },
            'var_10': { description: 'Nivel Leq Diurno', source: 'lab_results', defaultValue: 'N/A' },
            'var_11': { description: 'Nivel Leq Nocturno', source: 'lab_results', defaultValue: 'N/A' },
            'var_12': { description: 'Límite Normativo', source: 'static', defaultValue: '65 dB' },
            'var_13': { description: 'Cumplimiento', source: 'ai', aiSection: 'conclusions' },
        }
    }
];
