import ExcelJS from "exceljs";
import { calcularEstatus, diasAtraso, resumirMatriz, filasAlCorte, ESTATUS } from "./matriz.mjs";
import { aDateUTC, fechaLarga, hoyIso } from "./fechas.mjs";

// Título idéntico al de la evidencia comprometida en el PAT.
export const TITULO_EVIDENCIA = "Matriz de compromisos actualizada con estatus de entrega";
const SUBTITULO = "PE-5-PO-5 · Portal Institucional de Datos Abiertos del PJF · DGETD, Órgano de Administración Judicial";

const COLORES = {
  [ESTATUS.EN_TIEMPO]: "FFD9F2E3",
  [ESTATUS.CON_ATRASO]: "FFFCEFD2",
  [ESTATUS.EN_PLAZO]: "FFE3EEF9",
  [ESTATUS.VENCIDO]: "FFF8D7DA",
  [ESTATUS.SIN_FECHA]: "FFEDEDED",
  [ESTATUS.CANCELADO]: "FFEDEDED",
};

const borde = { style: "thin", color: { argb: "FFBFBFBF" } };
const BORDES = { top: borde, left: borde, bottom: borde, right: borde };
const ENCABEZADO = { type: "pattern", pattern: "solid", fgColor: { argb: "FF161A1D" } };

// Fila 3: corte y, si la matriz se elabora después del corte, la fecha de elaboración.
// Fila 4: observación fechada opcional, con el formato del PAT.
function encabezar(hoja, corte, columnas, { elaboracion, observacion } = {}) {
  for (const r of [1, 2, 3, 4]) hoja.mergeCells(r, 1, r, columnas);
  hoja.getCell(1, 1).value = TITULO_EVIDENCIA;
  hoja.getCell(1, 1).font = { bold: true, size: 14 };
  hoja.getCell(2, 1).value = SUBTITULO;
  hoja.getCell(2, 1).font = { size: 10, color: { argb: "FF595959" } };
  const elaborada = elaboracion && elaboracion > corte ? ` · Elaborada el ${fechaLarga(elaboracion)}` : "";
  hoja.getCell(3, 1).value = `Corte al ${fechaLarga(corte)}${elaborada}`;
  hoja.getCell(3, 1).font = { bold: true, size: 11 };
  if (observacion) {
    hoja.getCell(4, 1).value = `Observación registrada el ${fechaLarga(elaboracion)}: ${observacion}`;
    hoja.getCell(4, 1).font = { italic: true, size: 10 };
    hoja.getCell(4, 1).alignment = { wrapText: true, vertical: "top" };
    hoja.getRow(4).height = Math.max(15, 15 * Math.ceil(observacion.length / 140));
  }
}

function estilarEncabezado(fila) {
  fila.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = ENCABEZADO;
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    c.border = BORDES;
  });
  fila.height = 45;
}

// opciones: { elaboracion: AAAA-MM-DD, observacion: texto }
export async function generarXlsxMatriz(todas, corte, opciones = {}) {
  opciones = { elaboracion: hoyIso(), ...opciones };
  const filas = filasAlCorte(todas, corte);
  const libro = new ExcelJS.Workbook();
  libro.creator = "DGETD · PE-5";
  libro.title = `${TITULO_EVIDENCIA} — corte ${corte}`;

  // --- Hoja Matriz ---
  const hoja = libro.addWorksheet("Matriz", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
    views: [{ state: "frozen", ySplit: 5 }],
  });
  const columnas = [
    { titulo: "No.", ancho: 6 },
    { titulo: "Área generadora", ancho: 34 },
    { titulo: "Conjunto de datos", ancho: 38 },
    { titulo: "Formato requerido", ancho: 14 },
    { titulo: "Fecha comprometida", ancho: 14 },
    { titulo: "Fecha de entrega efectiva", ancho: 14 },
    { titulo: "Días de atraso", ancho: 10 },
    { titulo: "Estatus", ancho: 22 },
    { titulo: "Observaciones", ancho: 48 },
  ];
  columnas.forEach((c, i) => (hoja.getColumn(i + 1).width = c.ancho));
  encabezar(hoja, corte, columnas.length, opciones);
  hoja.getRow(5).values = columnas.map((c) => c.titulo);
  estilarEncabezado(hoja.getRow(5));

  filas.forEach((f, i) => {
    const estatus = calcularEstatus(f, corte);
    // Una entrega posterior al corte no se muestra: la matriz refleja lo conocido a esa fecha.
    const entrega = f.fecha_entrega_efectiva && f.fecha_entrega_efectiva <= corte ? f.fecha_entrega_efectiva : "";
    const fila = hoja.addRow([
      i + 1,
      f.area_generadora,
      f.conjunto,
      f.formato_requerido.split("|").map((x) => x.trim()).join(", "),
      f.fecha_comprometida ? aDateUTC(f.fecha_comprometida) : "",
      entrega ? aDateUTC(entrega) : "",
      diasAtraso({ ...f, fecha_entrega_efectiva: entrega }, corte) || "",
      estatus,
      f.observaciones ?? "",
    ]);
    fila.eachCell({ includeEmpty: true }, (c, col) => {
      c.border = BORDES;
      c.alignment = { vertical: "top", wrapText: true, horizontal: [1, 4, 5, 6, 7].includes(col) ? "center" : "left" };
    });
    fila.getCell(5).numFmt = "dd/mm/yyyy";
    fila.getCell(6).numFmt = "dd/mm/yyyy";
    fila.getCell(8).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORES[estatus] } };
    fila.getCell(8).font = { bold: true };
  });
  if (filas.length) hoja.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5 + filas.length, column: columnas.length } };

  // --- Hoja Resumen ---
  const r = resumirMatriz(filas, corte);
  const resumen = libro.addWorksheet("Resumen");
  [52, 14, 14, 14].forEach((w, i) => (resumen.getColumn(i + 1).width = w));
  encabezar(resumen, corte, 4, opciones);

  resumen.getRow(5).values = ["Estatus", "Compromisos"];
  estilarEncabezado(resumen.getRow(5));
  let n = 6;
  for (const [estatus, total] of Object.entries(r.porEstatus)) {
    const fila = resumen.getRow(n++);
    fila.values = [estatus, total];
    fila.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORES[estatus] } };
    fila.eachCell((c) => (c.border = BORDES));
  }
  const total = resumen.getRow(n++);
  total.values = ["Total", r.total];
  total.font = { bold: true };
  total.eachCell((c) => (c.border = BORDES));
  const cumplimiento = resumen.getRow(n++);
  cumplimiento.values = ["Cumplimiento de entrega (sin cancelados)", r.cumplimiento === null ? "—" : r.cumplimiento / 100];
  cumplimiento.font = { bold: true };
  cumplimiento.getCell(2).numFmt = "0.0%";
  cumplimiento.eachCell((c) => (c.border = BORDES));

  n++;
  resumen.getRow(n).values = ["Área generadora", "Compromisos", "Entregados", "Vencidos"];
  estilarEncabezado(resumen.getRow(n++));
  for (const a of r.porArea) {
    const fila = resumen.getRow(n++);
    fila.values = [a.area, a.total, a.entregados, a.vencidos];
    fila.eachCell((c) => (c.border = BORDES));
  }

  return libro;
}
