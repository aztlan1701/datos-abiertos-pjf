# datos-abiertos-pjf

Herramientas internas del proyecto **PE-5 · Portal Institucional de Datos Abiertos del PJF** (PAT 2026 de la Dirección General de Estrategia y Transformación Digital, Órgano de Administración Judicial).

Repositorio privado. Contiene información administrativa (matriz de compromisos, oficios, evidencias); no debe publicarse ni mezclarse con el código del portal (`abiertosdatosoaj`).

## Estado

| Módulo | Contenido | Estado |
|---|---|---|
| `catalogo/` | Catálogo maestro de conjuntos (CSV), validador y cálculo del IND-5 | Listo |
| `matriz/` | Matriz de compromisos (CSV maestro) y generación del XLSX con corte | Listo |
| `metadatos/` | Plantilla DCAT (JSON) y fichas descriptivas | Pendiente |
| `validacion/` | Reporte de calidad por conjunto | Pendiente |
| `oficios/` | Oficios a áreas generadoras (DOCX/PDF) | Pendiente |
| `monitoreo/` | Panel de estadísticas de uso | Pendiente |
| `spei/` | Textos para captura en el SPEI | Pendiente |

El contexto completo del proyecto está en [`docs/brief.md`](docs/brief.md).

## Uso

Requiere Node.js 22 o superior.

```sh
npm ci
npm run catalogo:validar                    # valida catalogo/catalogo.csv
npm run indicador -- --corte 2026-12-11     # IND-5 a la fecha de corte
npm run matriz -- --corte 2026-11-13        # genera salidas/matriz_compromisos_corte_2026-11-13.xlsx
npm test
```

Sin `--corte`, se usa la fecha del día en la Ciudad de México. Todos los comandos aceptan `--entrada <ruta>` para trabajar con otro archivo; `matriz` acepta además `--catalogo <ruta>`, `--salida <carpeta>` y `--actualizar` (reescribe la columna `estatus` en el CSV maestro).

Para probar con datos de ejemplo:

```sh
npm run matriz -- --entrada ejemplos/compromisos.csv --catalogo ejemplos/catalogo.csv --corte 2026-06-30
```

Los archivos de `salidas/` no se versionan.

## Catálogo (`catalogo/catalogo.csv`)

| Columna | Valores |
|---|---|
| `id` | Identificador único: minúsculas, números y guiones (`est-mensual`) |
| `conjunto` | Nombre del conjunto de datos |
| `descripcion` | Descripción breve |
| `area_generadora` | Área que produce la información |
| `area_custodia` | Área que resguarda el sistema o la base |
| `sistema_origen` | `DGTI`, `DGEJ` u otro (sirve para priorizar conjuntos que ya existen en sistemas) |
| `formatos` | Separados por `\|`: `CSV`, `JSON`, `XML`, `XLSX`. El PAT 2026 compromete CSV y JSON |
| `prioridad` | `alta`, `media` o `baja` |
| `viable` | `2026` (programado en el PAT 2026) o `2027` |
| `frecuencia` | Frecuencia de actualización |
| `publicado` | `si` o `no` |
| `fecha_publicacion` | AAAA-MM-DD; obligatoria si `publicado` es `si` |
| `url_publicacion` | Dirección del conjunto en el portal |
| `observaciones` | Texto libre |

**IND-5** (DGETD-LG04SL06-AE04PE05PO05) = (conjuntos publicados / conjuntos programados) × 100. Programados: `viable = 2026`. Publicados: de esos, los que tienen `publicado = si` y `fecha_publicacion` igual o anterior al corte.

## Matriz de compromisos (`matriz/compromisos.csv`)

Columnas: `area_generadora`, `conjunto_id` (el `id` del catálogo), `conjunto`, `formato_requerido`, `fecha_comprometida`, `fecha_entrega_efectiva`, `estatus`, `observaciones`.

El estatus se recalcula a la fecha de corte:

| Estatus | Regla |
|---|---|
| Entregado en tiempo | Entrega igual o anterior a la fecha comprometida |
| Entregado con atraso | Entrega posterior a la fecha comprometida |
| En plazo | Sin entrega y el corte no ha rebasado la fecha comprometida |
| Vencido | Sin entrega y el corte rebasó la fecha comprometida |
| Sin fecha comprometida | Sin entrega ni fecha comprometida |
| Cancelado | Se captura a mano y se respeta |

Una entrega posterior a la fecha de corte no cuenta en ese corte. Así puede reconstruirse una matriz pasada (por ejemplo, con corte al 30 de junio) a partir del mismo CSV.

El XLSX tiene dos hojas: **Matriz**, con el título de la evidencia del PAT («Matriz de compromisos actualizada con estatus de entrega»), y **Resumen**, con el conteo por estatus, el porcentaje de cumplimiento y el avance por área.

## Convenciones

- Español, registro formal de administración pública, salidas concisas.
- Los títulos de las evidencias son idénticos a los del PAT.
- CSV en UTF-8; las herramientas aceptan el BOM que agrega Excel.
- Fechas en formato AAAA-MM-DD.
