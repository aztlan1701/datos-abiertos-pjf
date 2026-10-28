import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { generarId, fechaIso, leerEstructuraCarga, combinarConCatalogo, diagnosticar } from "../lib/estructura-carga.mjs";
import { validarCatalogo } from "../lib/catalogo.mjs";

test("genera ids legibles y únicos", () => {
  const usados = new Set();
  assert.equal(generarId("Padrón de personas proveedoras y contratistas", usados), "padron-personas-proveedoras-contratistas");
  assert.equal(generarId("Concesiones, contratos, convenios, permisos, licencias o autorizaciones otorgadas", usados), "concesiones-contratos-convenios-permisos-licencias");
  assert.equal(generarId("Padrón de personas proveedoras y contratistas", usados), "padron-personas-proveedoras-contratistas-2");
});

test("convierte fechas dd/mm/aaaa y Date a ISO", () => {
  assert.equal(fechaIso("31/12/2025"), "2025-12-31");
  assert.equal(fechaIso("1/2/2025"), "2025-02-01");
  assert.equal(fechaIso(new Date(Date.UTC(2025, 0, 1))), "2025-01-01");
});

async function estructuraDePrueba() {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Hoja1");
  hoja.getRow(1).values = [, "ORGANO DE ADMINISTRACIÓN JUDICIAL"];
  hoja.getRow(5).values = [, "Id", "categoria_conjunto", "nombre_conjunto", "descripcion_conjunto", "palabras_clave", "fecha_creacion", "fecha_actualizacion", "frecuencia_actualizacion", "area_responsable", "formato_descarga", "url_descarga", "descripción en lenguaje ciudadano"];
  hoja.getRow(6).values = [, 1, "Archivo", "Inventarios documentales", "Inventario.", "archivo\nclasificación \nhistórico", "01/01/2025", "31/12/2025", "Trimestral", "Dirección General de Programación ", "XLS", { text: "Carpeta", hyperlink: "../sites/interno" }, "Aquí puedes revisar."];
  hoja.getRow(7).values = [, 2, "Contrataciones", "Contratos abiertos", "Contratos.", "licitación", "01/01/2025", "31/12/2025", "Trimestral", "Dirección General de Programacion", "XLS", "", "En esta sección."];
  hoja.getRow(8).values = [, 3, "Contrataciones", "Donaciones", "Donaciones.", "donación", "01/01/2025", "31/12/2025", "Trimestral", "Varios", "CSV, JSON", "", "Donaciones."];
  const ruta = join(mkdtempSync(join(tmpdir(), "dapjf-")), "estructura.xlsx");
  await libro.xlsx.writeFile(ruta);
  return ruta;
}

test("lee la estructura de carga y produce un catálogo válido", async () => {
  const importadas = await leerEstructuraCarga(await estructuraDePrueba());
  assert.equal(importadas.length, 3);
  assert.deepEqual(
    { ...importadas[0] },
    {
      id_origen: "1",
      categoria: "Archivo",
      conjunto: "Inventarios documentales",
      descripcion: "Inventario.",
      descripcion_ciudadana: "Aquí puedes revisar.",
      palabras_clave: "archivo|clasificación|histórico",
      fecha_creacion: "2025-01-01",
      fecha_actualizacion: "2025-12-31",
      frecuencia: "Trimestral",
      area_generadora: "Dirección General de Programación",
      formatos: "XLS",
    },
  );
  assert.equal(importadas[2].formatos, "CSV|JSON");
  const { filas } = combinarConCatalogo(importadas);
  assert.deepEqual(validarCatalogo(filas).errores, []);
  assert.ok(!Object.values(filas[0]).some((v) => String(v).includes("sites/interno")), "no importa enlaces internos");
});

test("reimportar conserva la planeación y el id, y no elimina conjuntos", async () => {
  const importadas = await leerEstructuraCarga(await estructuraDePrueba());
  const primera = combinarConCatalogo(importadas).filas;
  primera[0].viable = "2026";
  primera[0].observaciones = "Confirmado por el área";
  primera[0].id = "inventarios";
  const manual = { ...primera[1], id_origen: "", id: "manual", conjunto: "Capturado a mano" };
  const segunda = combinarConCatalogo(importadas, [...primera, manual]);
  assert.equal(segunda.nuevas, 0);
  assert.equal(segunda.conservadas, 1);
  assert.equal(segunda.filas[0].id, "inventarios");
  assert.equal(segunda.filas[0].viable, "2026");
  assert.equal(segunda.filas[0].observaciones, "Confirmado por el área");
  assert.ok(segunda.filas.some((f) => f.id === "manual"));
});

test("diagnostica formatos fuera del PAT, área «Varios», variantes de nombre y valores repetidos", async () => {
  const h = diagnosticar(combinarConCatalogo(await leerEstructuraCarga(await estructuraDePrueba())).filas);
  assert.ok(h.some((x) => x.startsWith("2 de 3 conjuntos no se ofrecen en CSV y JSON")));
  assert.ok(h.some((x) => x.includes("«Varios»") && x.includes("donaciones")));
  assert.ok(h.some((x) => x.includes("«Dirección General de Programación» / «Dirección General de Programacion»")));
  assert.ok(h.some((x) => x.includes("fecha_creacion (2025-01-01)")));
});
