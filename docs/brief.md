# Brief · Portal Institucional de Datos Abiertos del PJF (PE-5 · PAT 2026 DGETD)

Contexto para Claude Code. Fecha: 28 de octubre de 2026. Horizonte del plan: 45 días (28 oct – 11 dic 2026).

## 1. Qué es el proyecto

- Área: Dirección General de Estrategia y Transformación Digital (DGETD), Órgano de Administración Judicial (OAJ), Poder Judicial de la Federación.
- Clave: PE-5 / proyecto operativo PE-5-PO-5. Peso en el PAT 2026: 11.17 %.
- Alineación: ER04 Transparencia · LG04SL06 · acción específica 4.6.4 del PDI 2026-2031.
- Objetivo: fortalecer el portal institucional de datos abiertos publicando de forma sistemática conjuntos de datos prioritarios en formatos estandarizados e interoperables.
- Titular: Daniel Alejandro Rangel Gavia. Responsable en el PAT: Ana Paulina Sandoval Lugo (comisionada a la DGTI desde el 28 de abril de 2026, oficio SGP/COGEPI/69/2026). Nueva persona responsable: PENDIENTE.

## 2. Actividades del PO-5 (programadas enero-abril 2026)

1. Catálogo de conjuntos de datos identificados, validados y priorizados (15 %).
2. Publicación de conjuntos prioritarios en CSV y JSON, metadatos DCAT, una ficha descriptiva por conjunto (35 %).
3. Panel de monitoreo con estadísticas de uso (25 %).
4. Estrategia de comunicación ejecutada con materiales de difusión (25 %).

## 3. Indicador y riesgo

- IND-5 · clave SPEI DGETD-LG04SL06-AE04PE05PO05: (conjuntos publicados / conjuntos programados) × 100. Comportamiento de mantenimiento, meta 100 % en 2026.
- RI5: las áreas generadoras no entregan la información en los formatos requeridos. Causa: falta de priorización y desconocimiento de formatos. Probabilidad alta, impacto mediano.
- Medida de control preventiva: matriz de compromisos con fechas de entrega y seguimiento. Evidencia: "Matriz de compromisos actualizada con estatus de entrega". Semestral, 2 eventos al año. El segundo evento vence en diciembre de 2026.

## 4. Estado actual

- Sin responsable desde el 28 de abril. Actividades de publicación interrumpidas en mayo y junio.
- Reporte de indicadores enero-junio: Datos Abiertos se reportó como desviación documentada con el oficio de comisión.
- Observación de la UCI (octubre): el oficio no sustituye la evidencia comprometida. Respuesta pendiente de cerrar: remitir la matriz de compromisos con corte al 30 de junio o, si dejó de actualizarse, la última versión más observación fechada.
- El PE-5 no recibió actividad nueva en las adecuaciones de septiembre-diciembre.

## 5. Pendientes abiertos

- Designar a la nueva persona responsable (memorándum de Daniel).
- Cifra real de conjuntos publicados contra programados.
- Confirmar si existe matriz de compromisos con corte a junio.
- Unificar el nombre en los documentos: el oficio dice "Ana Paulina"; la UCI escribió "Ana Paula".
- Cerrar la respuesta a la UCI y el plan de regularización.

## 6. Plan de 45 días

| Bloque | Fechas | Qué se hace | Entregable |
|---|---|---|---|
| 1 Rearranque | 28 oct – 3 nov | Designar responsable; inventario de lo heredado (catálogo, conjuntos publicados, matriz, accesos al portal y al panel); cifra base del indicador | Acta de reinicio |
| 2 Matriz y compromisos | 4 – 13 nov | Depurar catálogo (viable 2026 vs. 2027); oficio a cada área generadora con conjunto, formato, diccionario de datos y fecha límite (27 nov); reunión de 30 min por área | Matriz de compromisos actualizada con FIREL (segundo evento semestral) |
| 3 Publicación | 14 – 27 nov | Recepción, validación de calidad y estandarización; publicación semanal con metadatos DCAT y ficha; reactivar panel de monitoreo | Conjuntos publicados + reporte de calidad por conjunto |
| 4 Cierre y evidencia | 28 nov – 11 dic | Segunda vuelta a áreas sin entrega; nota de difusión; captura en SPEI (evidencia, cifra del indicador, observación fechada si aplica); cerrar respuesta a la UCI | Expediente de cierre 2026 + propuesta de conjuntos PAT 2027 |

Hitos: 3 nov responsable y cifra base · 13 nov matriz firmada y oficios enviados · 27 nov fecha límite de entrega · 11 dic evidencia en SPEI.

Riesgos del plan: áreas que no entregan en tres semanas (priorizar conjuntos que ya existen en sistemas de DGTI o DGEJ); carga de la nueva persona responsable (dividir bloque 3 entre publicación y calidad); dependencia técnica de la DGTI (pedir accesos en el bloque 1).

## 7. Qué construir con Claude Code

Propuesta de repositorio `datos-abiertos-pjf`:

1. `matriz/` · Matriz de compromisos en XLSX generada desde un CSV maestro. Columnas: área generadora, conjunto de datos, formato requerido, fecha comprometida, fecha de entrega efectiva, estatus, observaciones. Script que recalcula estatus y genera la versión con corte para el SPEI.
2. `catalogo/` · Catálogo de conjuntos priorizados (CSV) con campo viable_2026 / 2027 y área custodia.
3. `metadatos/` · Plantilla DCAT en JSON y generador de fichas descriptivas en Markdown y PDF a partir del catálogo.
4. `validacion/` · Validador de conjuntos: codificación UTF-8, encabezados, tipos, nulos, duplicados; emite el reporte de calidad por conjunto.
5. `oficios/` · Plantilla DOCX del oficio a las áreas generadoras, llenada desde el catálogo (Node + librería `docx`, PDF con LibreOffice).
6. `monitoreo/` · Dashboard HTML sencillo con estadísticas de uso del portal (descargas y consultas por conjunto).
7. `spei/` · Textos listos para captura: descripción de evidencia (máx. 500 caracteres), memoria de cálculo del IND-5 y observación fechada con el formato "Observación registrada el [fecha]".

Convenciones: español, registro formal de administración pública, salidas concisas, sin la construcción "no es A, sino B". Evidencias formalizadas con FIREL o correo institucional; títulos de evidencia idénticos a los del PAT.
