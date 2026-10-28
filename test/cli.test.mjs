import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hoyIso } from "../lib/fechas.mjs";

const ejecutar = (script, args) => {
  const r = spawnSync("node", [script, ...args], { encoding: "utf8" });
  return { codigo: r.status, salida: `${r.stdout}${r.stderr}` };
};
const temp = () => mkdtempSync(join(tmpdir(), "dapjf-"));
const ENC = "area_generadora,conjunto_id,conjunto,formato_requerido,fecha_comprometida,fecha_entrega_efectiva,estatus,observaciones";
const FILA = "Dirección General de Estadística Judicial,est-mensual,Estadística mensual,CSV|JSON,2026-03-15,2026-03-12,,";

test("rechaza un CSV que no está en UTF-8 en lugar de corromper los acentos", () => {
  const dir = temp();
  const ruta = join(dir, "latin1.csv");
  writeFileSync(ruta, Buffer.from(`${ENC}\n${FILA}\n`, "latin1"));
  const r = ejecutar("matriz/generar.mjs", ["--entrada", ruta, "--salida", dir, "--corte", "2026-06-30"]);
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /no está en UTF-8/);
  const c = ejecutar("catalogo/validar.mjs", ["--entrada", ruta]);
  assert.equal(c.codigo, 1);
  assert.match(c.salida, /no está en UTF-8/);
});

test("ignora las filas vacías que deja Excel y numera bien las demás", () => {
  const dir = temp();
  const ruta = join(dir, "m.csv");
  writeFileSync(ruta, `${ENC}\n${FILA}\n,,,,,,,\n,,,,,,,\nÁrea,x,X,PDF,2026-03-15,,,\n`);
  const r = ejecutar("matriz/generar.mjs", ["--entrada", ruta, "--salida", dir, "--corte", "2026-06-30"]);
  assert.equal(r.codigo, 1);
  assert.match(r.salida, /Fila 5 \(x\): formato no reconocido: PDF/);
  assert.doesNotMatch(r.salida, /está vacío/);
});

test("--actualizar conserva las columnas agregadas y solo se permite con el corte de hoy", () => {
  const dir = temp();
  const ruta = join(dir, "m.csv");
  writeFileSync(ruta, `${ENC},responsable\n${FILA},Persona A\n`);
  const pasado = ejecutar("matriz/generar.mjs", ["--entrada", ruta, "--salida", dir, "--corte", "2026-06-30", "--actualizar"]);
  assert.equal(pasado.codigo, 1);
  assert.match(pasado.salida, /solo puede usarse con el corte de hoy/);

  const r = ejecutar("matriz/generar.mjs", ["--entrada", ruta, "--salida", dir, "--corte", hoyIso(), "--actualizar"]);
  assert.equal(r.codigo, 0, r.salida);
  assert.match(r.salida, /Columnas no reconocidas.*responsable/);
  const texto = readFileSync(ruta, "utf8");
  assert.match(texto, /,responsable\r?\n/);
  assert.match(texto, /Entregado en tiempo,,Persona A/);
  assert.ok(existsSync(join(dir, `matriz_compromisos_corte_${hoyIso()}.xlsx`)));
});
