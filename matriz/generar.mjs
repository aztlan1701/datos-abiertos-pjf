// Recalcula el estatus de la matriz de compromisos a una fecha de corte y genera el XLSX para el SPEI.
//
//   npm run matriz -- --corte 2026-11-13
//   npm run matriz -- --corte 2026-06-30 --observacion "La matriz dejó de actualizarse en mayo."
//   npm run matriz -- --actualizar      (además reescribe el estatus en el CSV maestro)
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { leerArgs, salirConErrores } from "../lib/args.mjs";
import { cargarCatalogo } from "../lib/catalogo.mjs";
import { cargarMatriz, calcularEstatus, resumirMatriz, filasAlCorte, COLUMNAS_MATRIZ } from "../lib/matriz.mjs";
import { generarXlsxMatriz } from "../lib/xlsx-matriz.mjs";
import { escribirCsv, ErrorCodificacion } from "../lib/csv.mjs";
import { esFechaValida, fechaLarga, hoyIso } from "../lib/fechas.mjs";

const args = leerArgs();
const hoy = hoyIso();
const corte = args.corte ?? hoy;
const entrada = args.entrada ?? "matriz/compromisos.csv";
const rutaCatalogo = args.catalogo ?? "catalogo/catalogo.csv";
const salida = args.salida ?? "salidas";
const observacion = typeof args.observacion === "string" ? args.observacion.trim() : "";

if (!esFechaValida(corte)) salirConErrores([`--corte debe tener el formato AAAA-MM-DD (recibido: ${corte})`]);
if (corte > hoy) console.warn(`! --corte ${corte} es posterior a hoy (${hoy}); el estatus es una proyección`);
// Reescribir el maestro con un corte distinto de hoy dejaría estatus pasados o proyectados.
if (args.actualizar && corte !== hoy) salirConErrores([`--actualizar solo puede usarse con el corte de hoy (${hoy})`]);
if (args.observacion !== undefined && !observacion) salirConErrores(["--observacion requiere un texto"]);
if (!existsSync(entrada)) salirConErrores([`No existe ${entrada}`]);

let ids = null;
let matriz;
try {
  if (existsSync(rutaCatalogo)) {
    const catalogo = cargarCatalogo(rutaCatalogo);
    if (catalogo.filas.length) ids = new Set(catalogo.filas.map((f) => f.id));
  }
  matriz = cargarMatriz(entrada, ids);
} catch (e) {
  if (e instanceof ErrorCodificacion) salirConErrores([e.message]);
  throw e;
}

const { encabezados, filas, errores, avisos } = matriz;
for (const a of avisos) console.warn(`! ${a}`);
if (errores.length) salirConErrores(errores);
if (!filas.length) salirConErrores([`${entrada} no tiene compromisos capturados`]);

mkdirSync(salida, { recursive: true });
const libro = await generarXlsxMatriz(filas, corte, { elaboracion: hoy, observacion });
const archivo = join(salida, `matriz_compromisos_corte_${corte}.xlsx`);
await libro.xlsx.writeFile(archivo);

if (args.actualizar) {
  // Se conservan todas las columnas del archivo; solo cambia «estatus» de los compromisos vigentes al corte.
  const vigentes = new Set(filasAlCorte(filas, corte));
  const columnas = [...encabezados, ...COLUMNAS_MATRIZ.filter((c) => !encabezados.includes(c))];
  escribirCsv(entrada, filas.map((f) => (vigentes.has(f) ? { ...f, estatus: calcularEstatus(f, corte) } : f)), columnas);
  console.log(`Estatus actualizado en ${entrada}`);
}

const r = resumirMatriz(filas, corte);
console.log(`Corte al ${fechaLarga(corte)} · ${r.total} compromisos`);
if (r.registradosDespues) console.log(`  (${r.registradosDespues} registrados después del corte no se incluyen)`);
for (const [estatus, n] of Object.entries(r.porEstatus)) if (n) console.log(`  ${estatus}: ${n}`);
if (r.cumplimiento !== null) console.log(`  Cumplimiento de entrega: ${r.cumplimiento.toFixed(1)} %`);
console.log(`→ ${archivo}`);
