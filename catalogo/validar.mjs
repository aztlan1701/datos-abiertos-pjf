// Valida el catálogo maestro de conjuntos de datos.
//
//   npm run catalogo:validar
//   npm run catalogo:validar -- --entrada ejemplos/catalogo.csv
import { existsSync } from "node:fs";
import { leerArgs, salirConErrores } from "../lib/args.mjs";
import { cargarCatalogo } from "../lib/catalogo.mjs";

const args = leerArgs();
const entrada = args.entrada ?? "catalogo/catalogo.csv";
if (!existsSync(entrada)) salirConErrores([`No existe ${entrada}`]);

const { filas, errores, avisos } = cargarCatalogo(entrada);
for (const a of avisos) console.warn(`! ${a}`);
if (errores.length) salirConErrores(errores);

const por = (campo) => {
  const conteo = new Map();
  for (const f of filas) conteo.set(f[campo] || "—", (conteo.get(f[campo] || "—") ?? 0) + 1);
  return [...conteo].map(([k, n]) => `${k}: ${n}`).join(" · ");
};

console.log(`✓ ${entrada}: ${filas.length} conjuntos sin errores`);
if (filas.length) {
  console.log(`  Viabilidad · ${por("viable")}`);
  console.log(`  Prioridad · ${por("prioridad")}`);
  console.log(`  Publicado · ${por("publicado")}`);
}
