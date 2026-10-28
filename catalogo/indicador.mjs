// Calcula el IND-5 (DGETD-LG04SL06-AE04PE05PO05) a una fecha de corte:
// (conjuntos publicados / conjuntos programados) × 100.
//
//   npm run indicador -- --corte 2026-12-11
import { existsSync } from "node:fs";
import { leerArgs, salirConErrores } from "../lib/args.mjs";
import { ErrorCodificacion } from "../lib/csv.mjs";
import { cargarCatalogo, calcularIndicador } from "../lib/catalogo.mjs";
import { esFechaValida, fechaLarga, hoyIso } from "../lib/fechas.mjs";

const args = leerArgs();
const corte = args.corte ?? hoyIso();
const entrada = args.entrada ?? "catalogo/catalogo.csv";

if (!esFechaValida(corte)) salirConErrores([`--corte debe tener el formato AAAA-MM-DD (recibido: ${corte})`]);
if (!existsSync(entrada)) salirConErrores([`No existe ${entrada}`]);

let catalogo;
try {
  catalogo = cargarCatalogo(entrada);
} catch (e) {
  if (e instanceof ErrorCodificacion) salirConErrores([e.message]);
  throw e;
}
const { filas, errores } = catalogo;
if (errores.length) salirConErrores(["El catálogo tiene errores; ejecute npm run catalogo:validar", ...errores]);

const ind = calcularIndicador(filas, corte);
if (ind.valor === null) salirConErrores(["No hay conjuntos programados (viable = 2026) en el catálogo"]);

console.log(`IND-5 · corte al ${fechaLarga(corte)}`);
console.log(`  Conjuntos publicados: ${ind.publicados}`);
console.log(`  Conjuntos programados: ${ind.programados}`);
console.log(`  Resultado: (${ind.publicados} / ${ind.programados}) × 100 = ${ind.valor.toFixed(2)} %`);
if (ind.pendientes.length) console.log(`  Pendientes: ${ind.pendientes.join(", ")}`);
