import { leerCsv, leerEncabezados } from "./csv.mjs";
import { esFechaValida, diasEntre } from "./fechas.mjs";
import { separarFormatos, FORMATOS_VALIDOS } from "./catalogo.mjs";

export const COLUMNAS_MATRIZ = [
  "area_generadora",
  "conjunto_id",
  "conjunto",
  "formato_requerido",
  "fecha_comprometida",
  "fecha_entrega_efectiva",
  "estatus",
  "observaciones",
];

export const ESTATUS = {
  EN_TIEMPO: "Entregado en tiempo",
  CON_ATRASO: "Entregado con atraso",
  EN_PLAZO: "En plazo",
  VENCIDO: "Vencido",
  SIN_FECHA: "Sin fecha comprometida",
  CANCELADO: "Cancelado",
};

// Estatus que se capturan a mano y el cálculo respeta.
const MANUALES = [ESTATUS.CANCELADO];

// Estatus de un compromiso a la fecha de corte. Una entrega posterior al corte
// no cuenta, para poder reconstruir cortes pasados (p. ej. al 30 de junio).
export function calcularEstatus(fila, corte) {
  if (MANUALES.includes(fila.estatus)) return fila.estatus;
  const comprometida = fila.fecha_comprometida;
  const entrega = fila.fecha_entrega_efectiva && fila.fecha_entrega_efectiva <= corte ? fila.fecha_entrega_efectiva : "";

  if (entrega) {
    if (!comprometida || entrega <= comprometida) return ESTATUS.EN_TIEMPO;
    return ESTATUS.CON_ATRASO;
  }
  if (!comprometida) return ESTATUS.SIN_FECHA;
  return corte <= comprometida ? ESTATUS.EN_PLAZO : ESTATUS.VENCIDO;
}

// Días de atraso al corte: de la entrega (si fue tardía) o del corte (si está vencido).
export function diasAtraso(fila, corte) {
  const estatus = calcularEstatus(fila, corte);
  if (estatus === ESTATUS.CON_ATRASO) return diasEntre(fila.fecha_comprometida, fila.fecha_entrega_efectiva);
  if (estatus === ESTATUS.VENCIDO) return diasEntre(fila.fecha_comprometida, corte);
  return 0;
}

export function validarMatriz(filas, encabezados = COLUMNAS_MATRIZ, idsCatalogo = null) {
  const errores = [];
  const avisos = [];

  const faltantes = COLUMNAS_MATRIZ.filter((c) => !encabezados.includes(c));
  if (faltantes.length) errores.push(`Faltan columnas: ${faltantes.join(", ")}`);
  if (faltantes.length) return { errores, avisos };

  const vistos = new Map();
  filas.forEach((f, i) => {
    const fila = `Fila ${i + 2}${f.conjunto_id ? ` (${f.conjunto_id})` : ""}`;
    for (const c of ["area_generadora", "conjunto", "formato_requerido"])
      if (!f[c]) errores.push(`${fila}: «${c}» está vacío`);

    for (const c of ["fecha_comprometida", "fecha_entrega_efectiva"])
      if (f[c] && !esFechaValida(f[c])) errores.push(`${fila}: ${c} debe tener el formato AAAA-MM-DD`);

    const invalidos = separarFormatos(f.formato_requerido).filter((x) => !FORMATOS_VALIDOS.includes(x));
    if (invalidos.length) errores.push(`${fila}: formato no reconocido: ${invalidos.join(", ")}`);

    if (f.estatus && !Object.values(ESTATUS).includes(f.estatus))
      avisos.push(`${fila}: estatus «${f.estatus}» no reconocido; se recalcula`);

    if (f.conjunto_id) {
      const clave = `${f.conjunto_id}|${f.area_generadora}`;
      if (vistos.has(clave)) avisos.push(`${fila}: compromiso repetido (también en la fila ${vistos.get(clave)})`);
      else vistos.set(clave, i + 2);
      if (idsCatalogo && !idsCatalogo.has(f.conjunto_id))
        avisos.push(`${fila}: conjunto_id no existe en el catálogo`);
    } else {
      avisos.push(`${fila}: sin conjunto_id; no se puede cruzar con el catálogo`);
    }
  });

  return { errores, avisos };
}

export function cargarMatriz(ruta, idsCatalogo = null) {
  const encabezados = leerEncabezados(ruta);
  const filas = leerCsv(ruta);
  return { filas, ...validarMatriz(filas, encabezados, idsCatalogo) };
}

export function resumirMatriz(filas, corte) {
  const porEstatus = Object.fromEntries(Object.values(ESTATUS).map((e) => [e, 0]));
  const porArea = new Map();

  for (const f of filas) {
    const e = calcularEstatus(f, corte);
    porEstatus[e]++;
    const a = porArea.get(f.area_generadora) ?? { area: f.area_generadora, total: 0, entregados: 0, vencidos: 0 };
    a.total++;
    if (e === ESTATUS.EN_TIEMPO || e === ESTATUS.CON_ATRASO) a.entregados++;
    if (e === ESTATUS.VENCIDO) a.vencidos++;
    porArea.set(f.area_generadora, a);
  }

  const vigentes = filas.length - porEstatus[ESTATUS.CANCELADO];
  const entregados = porEstatus[ESTATUS.EN_TIEMPO] + porEstatus[ESTATUS.CON_ATRASO];
  return {
    corte,
    total: filas.length,
    vigentes,
    entregados,
    cumplimiento: vigentes ? (entregados / vigentes) * 100 : null,
    porEstatus,
    porArea: [...porArea.values()].sort((a, b) => a.area.localeCompare(b.area, "es")),
  };
}
