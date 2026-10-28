import { leerCsv, numeroFila } from "./csv.mjs";
import { esFechaValida, diasEntre } from "./fechas.mjs";
import { separarFormatos, FORMATOS_VALIDOS } from "./catalogo.mjs";

// Columnas pedidas en el brief; deben estar en el CSV maestro.
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
// Columnas opcionales para reconstruir cortes pasados con lo que se sabía a esa fecha.
export const COLUMNAS_OPCIONALES = ["fecha_registro", "fecha_cancelacion"];

export const ESTATUS = {
  EN_TIEMPO: "Entregado en tiempo",
  CON_ATRASO: "Entregado con atraso",
  EN_PLAZO: "En plazo",
  VENCIDO: "Vencido",
  SIN_FECHA: "Sin fecha comprometida",
  CANCELADO: "Cancelado",
};

const sinAcentos = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const CANONICOS = new Map(Object.values(ESTATUS).map((e) => [sinAcentos(e), e]));

// Devuelve el estatus canónico («cancelado» → «Cancelado»), "" si la celda está vacía
// o null si el texto no corresponde a ningún estatus.
export function normalizarEstatus(texto) {
  if (!texto?.trim()) return "";
  return CANONICOS.get(sinAcentos(texto)) ?? null;
}

// Un compromiso registrado después del corte no existía a esa fecha.
export const filasAlCorte = (filas, corte) => filas.filter((f) => !f.fecha_registro || f.fecha_registro <= corte);

const canceladoAlCorte = (fila, corte) =>
  normalizarEstatus(fila.estatus) === ESTATUS.CANCELADO && (!fila.fecha_cancelacion || fila.fecha_cancelacion <= corte);

// Estatus de un compromiso a la fecha de corte. Una entrega o una cancelación posteriores
// al corte no cuentan, para poder reconstruir cortes pasados (p. ej. al 30 de junio).
export function calcularEstatus(fila, corte) {
  if (canceladoAlCorte(fila, corte)) return ESTATUS.CANCELADO;
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
  const sobrantes = encabezados.filter((c) => ![...COLUMNAS_MATRIZ, ...COLUMNAS_OPCIONALES].includes(c));
  if (sobrantes.length) avisos.push(`Columnas no reconocidas (se conservan, no se usan): ${sobrantes.join(", ")}`);
  if (faltantes.length) return { errores, avisos };

  const vistos = new Map();
  filas.forEach((f, i) => {
    const n = numeroFila(f, i);
    const fila = `Fila ${n}${f.conjunto_id ? ` (${f.conjunto_id})` : ""}`;
    for (const c of ["area_generadora", "conjunto", "formato_requerido"])
      if (!f[c]) errores.push(`${fila}: «${c}» está vacío`);

    for (const c of ["fecha_comprometida", "fecha_entrega_efectiva", ...COLUMNAS_OPCIONALES])
      if (f[c] && !esFechaValida(f[c])) errores.push(`${fila}: ${c} debe tener el formato AAAA-MM-DD`);

    const invalidos = separarFormatos(f.formato_requerido).filter((x) => !FORMATOS_VALIDOS.includes(x));
    if (invalidos.length) errores.push(`${fila}: formato no reconocido: ${invalidos.join(", ")}`);

    // Un estatus desconocido es error: recalcularlo borraría lo que se capturó a mano.
    const estatus = normalizarEstatus(f.estatus);
    if (estatus === null)
      errores.push(`${fila}: estatus «${f.estatus}» no reconocido; deje la celda vacía o use «${ESTATUS.CANCELADO}»`);
    if (f.fecha_cancelacion && estatus !== ESTATUS.CANCELADO)
      avisos.push(`${fila}: tiene fecha_cancelacion pero el estatus no es «${ESTATUS.CANCELADO}»`);

    if (f.conjunto_id) {
      const clave = `${f.conjunto_id}|${f.area_generadora}`;
      if (vistos.has(clave)) avisos.push(`${fila}: compromiso repetido (también en la fila ${vistos.get(clave)})`);
      else vistos.set(clave, n);
      if (idsCatalogo && !idsCatalogo.has(f.conjunto_id))
        avisos.push(`${fila}: conjunto_id no existe en el catálogo`);
    } else {
      avisos.push(`${fila}: sin conjunto_id; no se puede cruzar con el catálogo`);
    }
  });

  return { errores, avisos };
}

export function cargarMatriz(ruta, idsCatalogo = null) {
  const { encabezados, filas } = leerCsv(ruta);
  return { encabezados, filas, ...validarMatriz(filas, encabezados, idsCatalogo) };
}

export function resumirMatriz(todas, corte) {
  const filas = filasAlCorte(todas, corte);
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
    registradosDespues: todas.length - filas.length,
    vigentes,
    entregados,
    cumplimiento: vigentes ? (entregados / vigentes) * 100 : null,
    porEstatus,
    porArea: [...porArea.values()].sort((a, b) => a.area.localeCompare(b.area, "es")),
  };
}
