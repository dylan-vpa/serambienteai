# Template Variable Mapping Guide
## FO-PO-PSM-66-18 - Calidad de Aire

Based on document analysis, here's what each variable represents:

### Header/Client Section (var_1 to var_4)
- `var_1`: Título del Informe (e.g., "MONITOREO DE CALIDAD DEL AIRE")
- `var_2`: Período de monitoreo (e.g., "Del 15 al 20 de Diciembre de 2025")
- `var_3`: Nombre del Cliente
- `var_4`: Ubicación del proyecto

### Monitoring Points (var_16 to var_24)
- `var_16` to `var_20`: Coordenadas y descripción de estaciones de monitoreo
- `var_21`: Código de estación
- `var_22`: Descripción del punto
- `var_23`: Coordenada Norte
- `var_24`: Coordenada Este

### Equipment & Methods (var_27, var_28, var_31)
- `var_27`: Equipo utilizado
- `var_28`: Método de referencia
- `var_31`: Rango de medición

### Results Section (var_32+)
- Variables altas (32+): Resultados de mediciones, comparaciones con normativa

### Conclusions (var_100+)
- Análisis de cumplimiento normativo
- Recomendaciones

## How AI Should Fill These

The AI analysis should be structured to provide:
1. **Executive Summary** → var_1, var_2
2. **Client/Location Context** → var_3, var_4
3. **Methodology Description** → var_27, var_28
4. **Measurement Results Table** → var_21-24 (station data)
5. **Compliance Analysis** → var_50+
6. **Conclusions** → var_100+
