# Guía Completa de Variables por Plantilla

Este documento define qué significa cada variable en cada tipo de plantilla y cómo debe llenarse.

---

## 1. RESPEL (Caracterización de Residuos Peligrosos)
**Archivo:** `FO-PO-PSM-64-09...`
**Variables:** 80 | **Comentarios:** 54

| Variable | Descripción | Fuente | Ejemplo |
|----------|-------------|--------|---------|
| `var_1` | Código OIT | OIT | OT-12345-X-A-2026-V00 |
| `var_2` | Versión del informe | Sistema | V00 |
| `var_3` | Proyecto/Sede del cliente | OIT | Planta Norte |
| `var_4` | Procedencia muestra + fecha | OIT + Fecha | Sedimentos - 04/01/2026 |
| `var_5` | Procedencia muestra + fecha (copia) | OIT | = var_4 |
| `var_6` | Referencia clima zona | AI | Clima tropical húmedo |
| `var_7` | Tipo procedencia (suelos/sedimentos) | OIT | Sedimentos |
| `var_8` | Nombre fotografía | AI | Vista general punto muestreo |
| `var_9` | Año de monitoreo | Fecha | 2026 |
| `var_10` - `var_12` | Año (repetido) | Fecha | 2026 |
| `var_13` - `var_16` | Análisis según resultados | AI | Conforme normativa |
| `var_17` | Referencia clima | AI | Köppen: Am |
| `var_18` | Conclusiones (cumplimiento) | AI | Cumple normativa |
| `var_19` - `var_24` | Guía/Ejemplo (usar de referencia) | AI | [Texto ejemplo] |
| `var_25` - `var_27` | Referencia clima | AI | Temperatura promedio 28°C |
| `var_28` | Control versiones | Sistema | V00 - Inicial |
| `var_29` | Nota versión anterior | Sistema | N/A primera versión |
| `var_30` - `var_32` | Resolución vigente | Estático | Res. 1207/2014 |
| `var_33` | Singular/Plural | AI | punto/puntos |
| `var_35` | Sede monitoreo | OIT | Barranquilla, Atlántico |
| `var_36` | Cumplimiento normativo | AI | CUMPLE |
| `var_37` | Fecha monitoreo | OIT | 04 de enero de 2026 |
| `var_40`, `var_42` | Singular/Plural | AI | muestra/muestras |
| `var_43` - `var_60` | Resultados/Comparación normativa | AI | [Resultados detallados] |
| `var_61` - `var_79` | Referencias clima | AI | Datos climáticos |

---

## 2. PUNTO SECO (Caracterización de Agua)
**Archivo:** `FO-PO-PSM-64-10...`
**Variables:** 32 | **Comentarios:** 39

| Variable | Descripción | Fuente |
|----------|-------------|--------|
| `var_1` | Singular/Plural puntos | AI |
| `var_2` | Año ejecución monitoreo | Fecha |
| `var_3` | Tipo caracterización (parámetros) | OIT/AI |
| `var_4` | Año ejecución | Fecha |
| `var_5` | Año monitoreo | Fecha |
| `var_8`, `var_10` | Singular/Plural | AI |
| `var_13` - `var_19` | Singular/Plural | AI |
| `var_15` - `var_17` | Singular/Plural | AI |

---

## 3. EMISIÓN DE RUIDO
**Archivo:** `FO-PO-PSM-65-06...`
**Variables:** 82 | **Comentarios:** 74

| Variable | Descripción | Fuente |
|----------|-------------|--------|
| `var_1` | Título (guía, actualizar) | AI |
| `var_2` | Formato tabla info | Sistema |
| `var_3` | Código OIT | OIT |
| `var_4` | Lugar ejecución monitoreo | OIT |
| `var_5` | Descripción/Ubicación | OIT |
| `var_6` - `var_8` | Resultados LAeq | AI/Lab |
| `var_9` | Equipo empleado | Estático |
| `var_10` - `var_12` | Condiciones atmosféricas | AI/Estación Met |
| `var_13` | Rosa de vientos | AI |
| `var_14` | Formato campo | N/A |
| `var_15` - `var_16` | Mediciones puntos | AI |
| `var_17` | Control/Anexos | Sistema |
| `var_18` | Versión | Sistema |
| `var_19` | Jornada monitoreo | OIT |
| `var_20` - `var_24` | Ubicación/Descripción puntos | OIT/AI |
| `var_25`, `var_27` | Actividad asociada | OIT |
| `var_30` | Mediciones punto | AI |
| `var_37` | Hoja cálculo | N/A |
| `var_41` | Anexos cert equipo | N/A |

---

## 4. RUIDO AMBIENTAL
**Archivo:** `FO-PO-PSM-65-07...`
**Variables:** 102 | **Comentarios:** 76

| Variable | Descripción | Fuente |
|----------|-------------|--------|
| `var_1` - `var_4` | Identificación OIT/Lugar | OIT |
| `var_5` - `var_10` | Descripción proyecto | OIT/AI |
| `var_11` - `var_20` | Metodología/Equipos | AI/Estático |
| `var_21` - `var_40` | Resultados mediciones | AI/Lab |
| `var_41` - `var_60` | Análisis comparativo | AI |
| `var_61` - `var_80` | Condiciones atmosféricas | AI/Estación |
| `var_81` - `var_102` | Conclusiones/Recomendaciones | AI |

---

## 5. RUIDO INTRADOMICILIARIO
**Archivo:** `FO-PO-PSM-65-08...`
**Variables:** 138 | **Comentarios:** 78

*(Similar a Ruido Ambiental con secciones adicionales para habitaciones/espacios)*

---

## 6. CALIDAD DE AIRE
**Archivo:** `FO-PO-PSM-66-18...`
**Variables:** 105 | **Comentarios:** 60

| Variable | Descripción | Fuente |
|----------|-------------|--------|
| `var_1` | Título informe | AI |
| `var_2` | Período monitoreo | OIT |
| `var_3` | Nombre cliente | OIT |
| `var_4` | Ubicación proyecto | OIT |
| `var_5` - `var_9` | Introducción/Contexto | AI (Intro) |
| `var_10` - `var_15` | Metodología | AI (Metodología) |
| `var_16` - `var_20` | Estaciones/Coordenadas | OIT/GPS |
| `var_21` - `var_24` | Código estación/Coords | OIT |
| `var_27`, `var_28` | Método/Equipo | Estático |
| `var_31` | Rango medición | Estático |
| `var_32` - `var_50` | Resultados PM10/PM2.5 | AI (Resultados) |
| `var_51` - `var_74` | Análisis/Comparación | AI (Resultados) |
| `var_100`+ | Conclusiones | AI (Conclusiones) |

---

## 7. OLORES OFENSIVOS
**Archivo:** `FO-PO-PSM-66-19...`
**Variables:** 98 | **Comentarios:** 52

| Variable | Descripción | Fuente |
|----------|-------------|--------|
| Similar estructura a Calidad de Aire | | |
| Variables específicas para umbrales olfativos | AI/Lab | |

---

## 8. PARTÍCULAS VIABLES
**Archivo:** `FO-PO-PSM-66-20...`
**Variables:** 101 | **Comentarios:** 35

| Variable | Descripción | Fuente |
|----------|-------------|--------|
| Variables para conteo microbiológico | AI/Lab | |
| Identificación de géneros bacterianos | AI | |
| Comparación con límites IDEAM | AI | |

---

## 9. FUENTES FIJAS (Previo e Informe)
**Archivo:** `FO-PO-PSM-67-10...` y `FO-PO-PSM-67-11...`
**Variables:** 71-180 | **Comentarios:** 71

| Variable | Descripción | Fuente |
|----------|-------------|--------|
| `var_1` - `var_10` | Identificación/Fecha | OIT |
| `var_11` - `var_30` | Ficha técnica chimeneas | OIT/Campo |
| `var_31` - `var_70` | Parámetros muestreo | Campo/Lab |
| `var_71` - `var_110` | Resultados emisiones | AI/Lab |
| `var_111` - `var_159` | Análisis cumplimiento | AI |

---

## Notas Generales de Comentarios

Los comentarios en las plantillas dan instrucciones como:
- **"Singular o plural según sea el caso"** → El sistema debe detectar si hay 1 o más puntos
- **"Actualizar según resolución vigente"** → Usar datos normativos actuales
- **"Año de ejecución del monitoreo"** → Extraer de fecha OIT
- **"Nombre debe coincidir con papelería"** → Usar exactamente el nombre del cliente
- **"Esto es un ejemplo"** → La IA debe generar contenido real basado en resultados
- **"Especificar procedencia"** → Indicar si es suelo, sedimento, agua, etc.

---

## Cómo Usa Esto la IA

1. **Detectar Tipo de Template** → Por nombre de archivo o tipo OIT
2. **Cargar Configuración** → Usar este mapeo para saber qué va en cada variable
3. **Dividir Análisis** → Intro, Metodología, Resultados, Conclusiones
4. **Llenar Variables** → Según fuente especificada (OIT, AI, Estático, Lab)
5. **Validar** → Verificar singular/plural, fechas, códigos
