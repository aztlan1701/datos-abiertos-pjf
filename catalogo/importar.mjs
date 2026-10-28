// Importa la «Estructura de carga» del portal (XLSX) al catálogo maestro.
//
//   npm run catalogo:importar -- --entrada Estructura_de_carga_PDA-2.xlsx
//
// Si el catálogo ya tiene conjuntos, combina por id_origen y conserva los campos de planeación
// (prioridad, viable, publicado, observaciones…). Ningún conjunto existente se elimina.
import { existsSync } from "node:fs";
import { leerArgs, salirConErrores } from "../lib/args.mjs";
import { cargarCatalogo, COLUMNAS_CATALOGO } from "../lib/catalogo.mjs";
import { escribirCsv, ErrorCodificacion } from "../lib/csv.mjs";
import { leerEstructuraCarga, combinarConCatalogo, diagnosticar } from "../lib/estructura-carga.mjs";

const args = leerArgs();
const entrada = args.entrada;
const salida = args.salida ?? "catalogo/catalogo.csv";
if (typeof entrada !== "string") salirConErrores(["Indique el archivo con --entrada <ruta.xlsx>"]);
if (!existsSync(entrada)) salirConErrores([`No existe ${entrada}`]);

let existentes = [];
if (existsSync(salida)) {
  try {
    const actual = cargarCatalogo(salida);
    if (actual.errores.length) salirConErrores([`${salida} tiene errores; corríjalos antes de importar`, ...actual.errores]);
    const sobrantes = actual.encabezados.filter((c) => !COLUMNAS_CATALOGO.includes(c));
    if (sobrantes.length) salirConErrores([`${salida} tiene columnas que la importación eliminaría: ${sobrantes.join(", ")}`]);
    existentes = actual.filas;
  } catch (e) {
    if (e instanceof ErrorCodificacion) salirConErrores([e.message]);
    throw e;
  }
}

let importadas;
try {
  importadas = await leerEstructuraCarga(entrada);
} catch (e) {
  salirConErrores([e.message]);
}
if (!importadas.length) salirConErrores([`${entrada} no tiene conjuntos`]);

const { filas, nuevas, conservadas } = combinarConCatalogo(importadas, existentes);
escribirCsv(salida, filas, COLUMNAS_CATALOGO);

console.log(`✓ ${importadas.length} conjuntos leídos de ${entrada}`);
console.log(`  Nuevos: ${nuevas} · Actualizados: ${importadas.length - nuevas} · Conservados sin cambios: ${conservadas}`);
const hallazgos = diagnosticar(filas.slice(0, importadas.length));
if (hallazgos.length) {
  console.log("  Observaciones de calidad:");
  for (const h of hallazgos) console.log(`  - ${h}`);
}
console.log(`→ ${salida}`);
