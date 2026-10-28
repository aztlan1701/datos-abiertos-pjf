import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularEstatus, diasAtraso, resumirMatriz, validarMatriz, ESTATUS, COLUMNAS_MATRIZ } from "../lib/matriz.mjs";
import { generarXlsxMatriz, TITULO_EVIDENCIA } from "../lib/xlsx-matriz.mjs";

const base = { area_generadora: "Área A", conjunto_id: "a", conjunto: "Conjunto A", formato_requerido: "CSV|JSON", estatus: "", observaciones: "" };
const c = (comprometida, entrega = "", extra = {}) => ({ ...base, fecha_comprometida: comprometida, fecha_entrega_efectiva: entrega, ...extra });

test("entregado en tiempo, incluso el mismo día", () => {
  assert.equal(calcularEstatus(c("2026-11-27", "2026-11-20"), "2026-12-01"), ESTATUS.EN_TIEMPO);
  assert.equal(calcularEstatus(c("2026-11-27", "2026-11-27"), "2026-12-01"), ESTATUS.EN_TIEMPO);
});

test("entregado con atraso y días de atraso", () => {
  const f = c("2026-11-27", "2026-12-02");
  assert.equal(calcularEstatus(f, "2026-12-11"), ESTATUS.CON_ATRASO);
  assert.equal(diasAtraso(f, "2026-12-11"), 5);
});

test("en plazo hasta el día comprometido y vencido al día siguiente", () => {
  assert.equal(calcularEstatus(c("2026-11-27"), "2026-11-27"), ESTATUS.EN_PLAZO);
  assert.equal(calcularEstatus(c("2026-11-27"), "2026-11-28"), ESTATUS.VENCIDO);
  assert.equal(diasAtraso(c("2026-11-27"), "2026-12-11"), 14);
});

test("una entrega posterior al corte no cuenta en ese corte", () => {
  const f = c("2026-05-29", "2026-07-10");
  assert.equal(calcularEstatus(f, "2026-06-30"), ESTATUS.VENCIDO);
  assert.equal(calcularEstatus(f, "2026-07-31"), ESTATUS.CON_ATRASO);
});

test("sin fecha comprometida", () => {
  assert.equal(calcularEstatus(c(""), "2026-11-13"), ESTATUS.SIN_FECHA);
  assert.equal(calcularEstatus(c("", "2026-11-01"), "2026-11-13"), ESTATUS.EN_TIEMPO);
});

test("respeta el estatus Cancelado capturado a mano", () => {
  assert.equal(calcularEstatus(c("2026-01-01", "", { estatus: ESTATUS.CANCELADO }), "2026-11-13"), ESTATUS.CANCELADO);
});

test("el cumplimiento excluye los cancelados", () => {
  const r = resumirMatriz(
    [c("2026-11-01", "2026-10-30"), c("2026-11-01"), c("2026-11-01", "", { estatus: ESTATUS.CANCELADO })],
    "2026-11-13",
  );
  assert.equal(r.total, 3);
  assert.equal(r.vigentes, 2);
  assert.equal(r.cumplimiento, 50);
  assert.equal(r.porEstatus[ESTATUS.VENCIDO], 1);
});

test("valida fechas, formatos, columnas y cruce con el catálogo", () => {
  const { errores, avisos } = validarMatriz(
    [c("2026-02-30"), c("2026-11-27", "", { formato_requerido: "PDF", conjunto_id: "x" })],
    COLUMNAS_MATRIZ,
    new Set(["a"]),
  );
  assert.ok(errores.some((e) => e.includes("Fila 2") && e.includes("fecha_comprometida")));
  assert.ok(errores.some((e) => e.includes("Fila 3") && e.includes("PDF")));
  assert.ok(avisos.some((a) => a.includes("Fila 3") && a.includes("no existe en el catálogo")));
  assert.deepEqual(validarMatriz([], ["area_generadora"]).errores.length, 1);
});

test("el XLSX lleva el título de la evidencia, el corte y fechas reales", async () => {
  const libro = await generarXlsxMatriz([c("2026-11-27", "2026-12-02"), c("2026-11-27", "2026-12-20")], "2026-12-11");
  const hoja = libro.getWorksheet("Matriz");
  assert.equal(hoja.getCell("A1").value, TITULO_EVIDENCIA);
  assert.equal(hoja.getCell("A3").value, "Corte al 11 de diciembre de 2026");
  assert.deepEqual(hoja.getCell("E6").value, new Date(Date.UTC(2026, 10, 27)));
  assert.equal(hoja.getCell("H6").value, ESTATUS.CON_ATRASO);
  assert.equal(hoja.getCell("G6").value, 5);
  // La entrega del 20 de diciembre es posterior al corte: no se muestra y el compromiso queda vencido.
  assert.equal(hoja.getCell("F7").value, "");
  assert.equal(hoja.getCell("H7").value, ESTATUS.VENCIDO);
  assert.ok(libro.getWorksheet("Resumen"));
});
