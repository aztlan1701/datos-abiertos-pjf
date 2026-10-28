import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

// Lee un CSV UTF-8 (con o sin BOM, como lo guarda Excel) y devuelve filas como objetos.
// Recorta espacios en encabezados y valores.
export function leerCsv(ruta) {
  const texto = readFileSync(ruta, "utf8");
  return parse(texto, {
    bom: true,
    columns: (encabezados) => encabezados.map((e) => e.trim()),
    skip_empty_lines: true,
    trim: true,
  });
}

export function leerEncabezados(ruta) {
  const texto = readFileSync(ruta, "utf8");
  const [primera = []] = parse(texto, { bom: true, to_line: 1 });
  return primera.map((e) => e.trim());
}

// Escribe con BOM para que Excel en Windows reconozca los acentos.
export function escribirCsv(ruta, filas, columnas) {
  writeFileSync(ruta, "﻿" + stringify(filas, { header: true, columns: columnas }), "utf8");
}
