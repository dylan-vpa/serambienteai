# Criterios de Validación para OITs

## Descripción General
Este documento define los criterios que debe cumplir una OIT (Orden de Inspección de Trabajo) y su cotización asociada para ser aprobada por el sistema de validación automática con IA.

## Documentos Requeridos
1. **Documento OIT** (PDF)
2. **Documento de Cotización** (PDF)

## Criterios de Validación

### 1. Formato y Estructura
- ✅ Ambos documentos deben estar en formato PDF
- ✅ Los PDFs deben ser legibles (no imágenes escaneadas de baja calidad)
- ✅ Tamaño máximo por archivo: 10MB

### 2. Información Obligatoria en OIT

#### Datos de Identificación
- **Número de OIT**: Debe estar presente y ser único
- **Fecha de emisión**: Formato válido (DD/MM/YYYY)
- **Cliente/Empresa**: Nombre completo del solicitante

#### Descripción del Trabajo
- **Tipo de inspección**: Debe especificar claramente el tipo
- **Alcance**: Descripción detallada del trabajo a realizar
- **Ubicación**: Dirección o coordenadas del sitio

#### Requisitos Técnicos
- **Normas aplicables**: Al menos una norma o estándar de referencia
- **Equipos/Recursos necesarios**: Lista de equipos requeridos
- **Personal asignado**: Responsables de la inspección

### 3. Información Obligatoria en Cotización

#### Datos Comerciales
- **Número de cotización**: Debe coincidir o referenciar el número de OIT
- **Fecha de cotización**: No debe ser anterior a la fecha de la OIT
- **Vigencia**: Período de validez de la cotización

#### Desglose Económico
- **Ítems detallados**: Lista de servicios/productos con descripción
- **Precios unitarios**: Cada ítem debe tener precio especificado
- **Subtotales y totales**: Cálculos correctos
- **Impuestos**: IVA u otros impuestos aplicables claramente indicados
- **Total general**: Suma correcta de todos los conceptos

### 4. Coherencia entre Documentos

#### Validaciones Cruzadas
- ✅ Los equipos/recursos en la OIT deben aparecer en la cotización
- ✅ Las fechas deben ser coherentes (cotización no anterior a OIT)
- ✅ Los números de referencia deben coincidir
- ✅ El cliente/empresa debe ser el mismo en ambos documentos

### 5. Criterios de Calidad

#### Completitud
- ✅ No debe haber campos obligatorios vacíos
- ✅ Las descripciones deben ser claras y específicas
- ✅ Los montos deben estar en la moneda correcta (COP)

#### Razonabilidad
- ✅ Los precios deben estar dentro de rangos razonables
- ✅ La cantidad de recursos debe ser proporcional al alcance
- ✅ Los tiempos estimados deben ser realistas

## Proceso de Validación Automática

### Paso 1: Extracción de Datos
La IA extrae información clave de ambos documentos usando OCR y procesamiento de lenguaje natural.

### Paso 2: Verificación de Criterios
Se valida cada criterio de la lista anterior, generando un reporte de cumplimiento.

### Paso 3: Análisis de Coherencia
Se comparan los datos entre ambos documentos para detectar inconsistencias.

### Paso 4: Decisión Final
- **APROBADO**: Si cumple todos los criterios obligatorios
- **RECHAZADO**: Si falta información crítica o hay inconsistencias graves
- **REVISIÓN MANUAL**: Si hay advertencias menores que requieren revisión humana

## Mensajes de Error Comunes

### Errores Críticos (Rechazo Automático)
- "Falta número de OIT"
- "Cotización sin desglose de precios"
- "Fechas inconsistentes entre documentos"
- "Cliente no coincide entre OIT y cotización"
- "Total de cotización no calculado correctamente"

### Advertencias (Revisión Manual)
- "Descripción del alcance muy breve"
- "Falta especificar normas aplicables"
- "Precio fuera del rango esperado"
- "Vigencia de cotización muy corta"

## Ejemplo de Validación Exitosa

```json
{
  "valid": true,
  "message": "Documentos validados correctamente",
  "details": {
    "oit": {
      "numero": "OIT-2024-001",
      "fecha": "2024-11-30",
      "cliente": "Empresa XYZ S.A.S",
      "tipo": "Inspección de Seguridad Industrial"
    },
    "cotizacion": {
      "numero": "COT-2024-001",
      "fecha": "2024-11-30",
      "total": 5500000,
      "items": 8
    },
    "coherencia": "100%"
  }
}
```

## Ejemplo de Validación Fallida

```json
{
  "valid": false,
  "message": "Documentos no cumplen criterios de validación",
  "errors": [
    "Falta número de OIT en el documento",
    "Cotización no incluye desglose de precios",
    "Cliente no coincide entre documentos"
  ],
  "warnings": [
    "Descripción del alcance muy breve"
  ]
}
```

## Notas Técnicas

### Tecnologías Utilizadas
- **Ollama + Llama 3.2**: Para procesamiento de lenguaje natural
- **PDF.js**: Para extracción de texto de PDFs
- **Expresiones regulares**: Para validación de formatos

### Configuración
Los umbrales y rangos de validación pueden ajustarse en:
```
server/src/config/validation.config.ts
```

### Logs
Todas las validaciones se registran en:
```
server/logs/oit-validations.log
```
