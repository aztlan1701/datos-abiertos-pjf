# CLAUDE.md

Herramientas internas del PE-5 (PAT 2026, DGETD). El contexto del proyecto, el plan de 45 días y los entregables están en `docs/brief.md`; léelo antes de proponer cambios.

## Convenciones de redacción

- Español, registro formal de administración pública, salidas concisas.
- Sin la construcción «no es A, sino B».
- Los títulos de evidencia son idénticos a los del PAT. El de la matriz es «Matriz de compromisos actualizada con estatus de entrega» (`TITULO_EVIDENCIA` en `lib/xlsx-matriz.mjs`).
- Observaciones fechadas con el formato «Observación registrada el [fecha]».

## Código

- Node 22, módulos ES (`.mjs`), sin TypeScript. Pruebas con `node:test` en `test/`; ejecuta `npm test` antes de cada commit.
- La lógica vive en `lib/`; los scripts de cada carpeta (`catalogo/`, `matriz/`) solo leen argumentos, llaman a `lib/` e imprimen.
- Fechas como texto ISO AAAA-MM-DD; conviértelas con `lib/fechas.mjs` (UTC) para no correr días.
- `catalogo/catalogo.csv` y `matriz/compromisos.csv` son los archivos maestros con datos reales; los ejemplos van en `ejemplos/` y deben marcarse como «Registro de ejemplo».
- No versiones nada de `salidas/`.
- Este repositorio es privado. No copies su contenido administrativo (nombres, oficios, estatus ante la UCI) al repositorio del portal.
