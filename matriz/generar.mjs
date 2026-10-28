// Recalcula el estatus de la matriz de compromisos a una fecha de corte y genera el XLSX para el SPEI.
//
//   npm run matriz -- --corte 2026-11-13
//   npm run matriz -- --corte 2026-06-30 --entrada ejemplos/compromisos.csv
//   npm run matriz -- --actualizar      (además reescribe el estatus en el CSV maestro)
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { leerArgs, salirConErrores } from "../lib/args.mjs";
import { cargarCatalogo } from "../lib/catalogo.mjs";
import { cargarMatriz, calcularEstatus, resumirMatriz, COLUMNAS_MATRIZ } from "../lib/matriz.mjs";
import { generarXlsxMatriz } from "../lib/xlsx-matriz.mjs";
import { escribirCsv } from "../lib/csv.mjs";
import { esFechaValida, fechaLarga, hoyIso } from "../lib/fechas.mjs";

const args = leerArgs();
const corte = args.corte ?? hoyIso();
const entrada = args.entrada ?? "matriz/compromisos.csv";
const rutaCatalogo = args.catalogo ?? "catalogo/catalogo.csv";
const salida = args.salida ?? "salidas";

if (!esFechaValida(corte)) salirConErrores([`--corte debe tener el formato AAAA-MM-DD (recibido: ${corte})`]);
if (!existsSync(entrada)) salirConErrores([`No existe ${entrada}`]);

let ids = null;
if (existsSync(rutaCatalogo)) {
  const catalogo = cargarCatalogo(rutaCatalogo);
  if (catalogo.filas.length) ids = new Set(catalogo.filas.map((f) => f.id));
}

const { filas, errores, avisos } = cargarMatriz(entrada, ids);
for (const a of avisos) console.warn(`! ${a}`);
if (errores.length) salirConErrores(errores);
if (!filas.length) salirConErrores([`${entrada} no tiene compromisos capturados`]);

mkdirSync(salida, { recursive: true });
const libro = await generarXlsxMatriz(filas, corte);
const archivo = join(salida, `matriz_compromisos_corte_${corte}.xlsx`);
await libro.xlsx.writeFile(archivo);

if (args.actualizar) {
  escribirCsv(entrada, filas.map((f) => ({ ...f, estatus: calcularEstatus(f, corte) })), COLUMNAS_MATRIZ);
  console.log(`Estatus actualizado en ${entrada}`);
}

const r = resumirMatriz(filas, corte);
console.log(`Corte al ${fechaLarga(corte)} · ${r.total} compromisos`);
for (const [estatus, n] of Object.entries(r.porEstatus)) if (n) console.log(`  ${estatus}: ${n}`);
if (r.cumplimiento !== null) console.log(`  Cumplimiento de entrega: ${r.cumplimiento.toFixed(1)} %`);
console.log(`→ ${archivo}`);
