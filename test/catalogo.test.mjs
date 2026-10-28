import { test } from "node:test";
import assert from "node:assert/strict";
import { validarCatalogo, calcularIndicador, separarFormatos, COLUMNAS_CATALOGO } from "../lib/catalogo.mjs";
import { cargarCatalogo } from "../lib/catalogo.mjs";
import { cargarMatriz } from "../lib/matriz.mjs";
import { esFechaValida, fechaLarga, hoyIso } from "../lib/fechas.mjs";

const base = Object.fromEntries(COLUMNAS_CATALOGO.map((c) => [c, ""]));
const conj = (extra) => ({ ...base, id: "a", conjunto: "A", area_generadora: "Área", formatos: "CSV|JSON", prioridad: "alta", viable: "2026", publicado: "no", ...extra });

test("separa formatos sin importar espacios ni mayúsculas", () => {
  assert.deepEqual(separarFormatos(" csv | Json|"), ["CSV", "JSON"]);
});

test("un catálogo correcto no tiene errores", () => {
  assert.deepEqual(validarCatalogo([conj()]).errores, []);
});

test("detecta ids repetidos o mal formados y valores fuera de catálogo", () => {
  const { errores } = validarCatalogo([
    conj(),
    conj({ prioridad: "urgente" }),
    conj({ id: "Con Espacios", viable: "2028", publicado: "tal vez" }),
  ]);
  assert.ok(errores.some((e) => e.includes("Fila 3") && e.includes("id repetido")));
  assert.ok(errores.some((e) => e.includes("prioridad")));
  assert.ok(errores.some((e) => e.includes("minúsculas")));
  assert.ok(errores.some((e) => e.includes("viable")));
  assert.ok(errores.some((e) => e.includes("publicado debe ser")));
});

test("exige fecha válida cuando está publicado", () => {
  assert.ok(validarCatalogo([conj({ publicado: "si" })]).errores.some((e) => e.includes("sin fecha_publicacion")));
  assert.ok(validarCatalogo([conj({ publicado: "si", fecha_publicacion: "13/11/2026" })]).errores.length);
});

test("avisa cuando un conjunto 2026 no cumple CSV y JSON del PAT", () => {
  assert.ok(validarCatalogo([conj({ formatos: "CSV" })]).avisos.some((a) => a.includes("falta JSON")));
  assert.equal(validarCatalogo([conj({ formatos: "CSV", viable: "2027" })]).avisos.length, 0);
});

test("detecta columnas faltantes", () => {
  assert.ok(validarCatalogo([], ["id"]).errores[0].startsWith("Faltan columnas"));
});

test("IND-5 cuenta solo conjuntos 2026 publicados al corte", () => {
  const filas = [
    conj({ id: "a", publicado: "si", fecha_publicacion: "2026-03-01" }),
    conj({ id: "b", publicado: "si", fecha_publicacion: "2026-11-20" }),
    conj({ id: "c" }),
    conj({ id: "d" }),
    conj({ id: "e", viable: "2027", publicado: "si", fecha_publicacion: "2026-01-01" }),
  ];
  const ind = calcularIndicador([...filas, conj({ id: "f", viable: "" })], "2026-06-30");
  assert.equal(ind.programados, 4);
  assert.equal(ind.publicados, 1);
  assert.equal(ind.valor, 25);
  assert.equal(ind.sinViabilidad, 1);
  assert.deepEqual(ind.pendientes, ["b", "c", "d"]);
  assert.equal(calcularIndicador(filas, "2026-12-11").valor, 50);
  assert.equal(calcularIndicador([], "2026-12-11").valor, null);
});

test("fechas", () => {
  assert.ok(esFechaValida("2026-02-28"));
  assert.ok(!esFechaValida("2026-02-30"));
  assert.ok(!esFechaValida("2026-2-3"));
  assert.equal(fechaLarga("2026-12-01"), "1 de diciembre de 2026");
  // 5:00 UTC del 29 de octubre aún es 28 de octubre en la Ciudad de México.
  assert.equal(hoyIso(new Date("2026-10-29T05:00:00Z")), "2026-10-28");
});

test("los ejemplos y las plantillas vacías son válidos", () => {
  for (const ruta of ["ejemplos/catalogo.csv", "catalogo/catalogo.csv"]) assert.deepEqual(cargarCatalogo(ruta).errores, [], ruta);
  const ids = new Set(cargarCatalogo("ejemplos/catalogo.csv").filas.map((f) => f.id));
  for (const ruta of ["ejemplos/compromisos.csv", "matriz/compromisos.csv"]) {
    const m = cargarMatriz(ruta, ids);
    assert.deepEqual(m.errores, [], ruta);
    assert.ok(!m.avisos.some((a) => a.includes("no existe en el catálogo")), ruta);
  }
});

test("los campos de planeación vacíos y el área «Varios» generan avisos, no errores", () => {
  const { errores, avisos } = validarCatalogo([conj({ prioridad: "", viable: "", publicado: "", area_generadora: "Varios" })]);
  assert.deepEqual(errores, []);
  assert.ok(avisos.some((a) => a.includes("pendiente de depurar: prioridad, viable, publicado")));
  assert.ok(avisos.some((a) => a.includes("«Varios»")));
});
