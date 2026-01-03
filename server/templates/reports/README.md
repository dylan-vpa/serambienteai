# Plantillas de Informes

Coloca aquí tus archivos `.docx` (Word) que se utilizarán como plantillas para los informes finales.

## Configuración

Para que el sistema use una plantilla, el nombre del archivo debe coincidir con el campo `reportTemplateFile` configurado en el `SamplingTemplate` (Base de datos).

## Formato de Variables

Usa llaves `{ }` para indicar dónde el sistema debe insertar datos dinámicos.

### Variables Disponibles (Ejemplo)

- `{oitNumber}`: Número de la OIT
- `{description}`: Descripción de la OIT
- `{location}`: Ubicación del muestreo
- `{scheduledDate}`: Fecha del muestreo
- `{completionDate}`: Fecha de finalización
- `{clientName}`: Nombre del cliente (si aplica)
- `{labResults}`: Resumen de resultados de laboratorio
- `{aiAnalysis}`: Análisis de la IA
- `{recommendations}`: Recomendaciones generadas

### Tablas y Listas

Para iterar sobre listas de muestras o resultados, usa la sintaxis de bucle:

```text
{#samples}
  Muestra: {id}
  Tipo: {type}
  Valor: {value}
{/samples}
```

Asegúrate de que los nombres de las variables coincidan exactamente (distingue mayúsculas y minúsculas).
