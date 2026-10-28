import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

export class ErrorCodificacion extends Error {}

// Lee el archivo exigiendo UTF-8. Excel en Windows guarda «CSV (delimitado por comas)» en
// Windows-1252; leerlo como UTF-8 corrompería los acentos sin aviso.
function leerTexto(ruta) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(ruta));
  } catch (e) {
    if (!(e instanceof TypeError)) throw e;
    throw new ErrorCodificacion(
      `${ruta} no está en UTF-8. En Excel use Archivo › Guardar como › «CSV UTF-8 (delimitado por comas)».`,
    );
  }
}

// Lee un CSV UTF-8 (con o sin BOM) y devuelve { encabezados, filas }.
// Cada fila guarda en `_fila` (no enumerable) su número de línea en el archivo, para los mensajes.
// Se descartan las filas que solo tienen separadores, como las que deja Excel al final.
export function leerCsv(ruta) {
  const registros = parse(leerTexto(ruta), {
    bom: true,
    columns: (encabezados) => encabezados.map((e) => e.trim()),
    skip_empty_lines: true,
    trim: true,
    info: true,
  });
  const filas = [];
  for (const { record, info } of registros) {
    if (Object.values(record).every((v) => v === "")) continue;
    Object.defineProperty(record, "_fila", { value: info.lines, enumerable: false });
    filas.push(record);
  }
  const [primera = []] = parse(leerTexto(ruta), { bom: true, to_line: 1 });
  return { encabezados: primera.map((e) => e.trim()), filas };
}

// Escribe con BOM para que Excel en Windows reconozca los acentos.
export function escribirCsv(ruta, filas, columnas) {
  writeFileSync(ruta, "﻿" + stringify(filas, { header: true, columns: columnas }), "utf8");
}

export const numeroFila = (f, i) => f._fila ?? i + 2;
