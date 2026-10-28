import ExcelJS from "exceljs";
import { COLUMNAS_CATALOGO, separarFormatos, FORMATOS_PAT } from "./catalogo.mjs";

// Lee la «Estructura de carga» del portal (XLSX con encabezados en minúsculas, p. ej.
// Estructura_de_carga_PDA-2.xlsx) y la convierte en filas del catálogo.

const sinAcentos = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Encabezado del XLSX (sin acentos ni mayúsculas) → columna del catálogo.
const MAPEO = {
  id: "id_origen",
  categoria_conjunto: "categoria",
  nombre_conjunto: "conjunto",
  descripcion_conjunto: "descripcion",
  palabras_clave: "palabras_clave",
  fecha_creacion: "fecha_creacion",
  fecha_actualizacion: "fecha_actualizacion",
  frecuencia_actualizacion: "frecuencia",
  area_responsable: "area_generadora",
  formato_descarga: "formatos",
  "descripcion en lenguaje ciudadano": "descripcion_ciudadana",
  // url_descarga apunta a carpetas internas de SharePoint; no es una URL pública y no se importa.
};

// Campos que se definen en el PE-5 y no vienen en la estructura de carga.
export const CAMPOS_PLANEACION = [
  "area_custodia",
  "sistema_origen",
  "prioridad",
  "viable",
  "publicado",
  "fecha_publicacion",
  "url_publicacion",
  "observaciones",
];

const STOP = new Set(["de", "del", "la", "las", "el", "los", "y", "o", "e", "en", "por", "a", "al", "para", "con", "sus", "su"]);

export function generarId(nombre, usados) {
  const palabras = sinAcentos(nombre)
    .replace(/ñ/g, "n")
    .split(/[^a-z0-9]+/)
    .filter((p) => p && !STOP.has(p))
    .slice(0, 5);
  const base = palabras.join("-") || "conjunto";
  let id = base;
  for (let i = 2; usados.has(id); i++) id = `${base}-${i}`;
  usados.add(id);
  return id;
}

function texto(valor) {
  if (valor === null || valor === undefined) return "";
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  if (typeof valor === "object") {
    if (valor.richText) return valor.richText.map((t) => t.text).join("");
    if ("result" in valor) return texto(valor.result);
    if ("text" in valor) return texto(valor.text);
  }
  return String(valor);
}

const limpiar = (t) => t.replace(/\s+/g, " ").trim();

// "31/12/2025" o Date → "2025-12-31"; devuelve el texto original si no se reconoce.
export function fechaIso(valor) {
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  const t = limpiar(texto(valor));
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : t;
}

export async function leerEstructuraCarga(ruta) {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.readFile(ruta);
  const hoja = libro.worksheets.find((h) => h.state === "visible") ?? libro.worksheets[0];

  // La fila de encabezados es la que contiene «nombre_conjunto»; arriba van los membretes.
  let filaEnc = null;
  hoja.eachRow((fila, n) => {
    if (filaEnc === null && fila.values.some((v) => sinAcentos(texto(v)) === "nombre_conjunto")) filaEnc = n;
  });
  if (filaEnc === null) throw new Error(`${ruta}: no se encontró la fila de encabezados (nombre_conjunto)`);

  const columnas = new Map();
  hoja.getRow(filaEnc).eachCell((celda, col) => {
    const destino = MAPEO[sinAcentos(texto(celda.value))];
    if (destino) columnas.set(destino, col);
  });
  const faltantes = Object.values(MAPEO).filter((c) => !columnas.has(c));
  if (faltantes.length) throw new Error(`${ruta}: faltan columnas: ${faltantes.join(", ")}`);

  const filas = [];
  for (let n = filaEnc + 1; n <= hoja.rowCount; n++) {
    const fila = hoja.getRow(n);
    const valor = (c) => fila.getCell(columnas.get(c)).value;
    if (!limpiar(texto(valor("conjunto")))) continue;
    filas.push({
      id_origen: limpiar(texto(valor("id_origen"))),
      categoria: limpiar(texto(valor("categoria"))),
      conjunto: limpiar(texto(valor("conjunto"))),
      descripcion: limpiar(texto(valor("descripcion"))),
      descripcion_ciudadana: limpiar(texto(valor("descripcion_ciudadana"))),
      // Las palabras clave vienen una por renglón dentro de la celda.
      palabras_clave: texto(valor("palabras_clave"))
        .split(/[\n,;|]+/)
        .map(limpiar)
        .filter(Boolean)
        .join("|"),
      fecha_creacion: fechaIso(valor("fecha_creacion")),
      fecha_actualizacion: fechaIso(valor("fecha_actualizacion")),
      frecuencia: limpiar(texto(valor("frecuencia"))),
      area_generadora: limpiar(texto(valor("area_generadora"))),
      formatos: separarFormatos(texto(valor("formatos")).replace(/[,;/]/g, "|")).join("|"),
    });
  }
  return filas;
}

// Combina lo importado con el catálogo existente por id_origen, conservando los campos de
// planeación y el id ya asignado. Los conjuntos que ya no vienen en el XLSX se conservan.
export function combinarConCatalogo(importadas, existentes = []) {
  const porOrigen = new Map(existentes.filter((f) => f.id_origen).map((f) => [f.id_origen, f]));
  const usados = new Set(existentes.map((f) => f.id));
  const vistos = new Set();
  const resultado = importadas.map((nueva) => {
    const previa = porOrigen.get(nueva.id_origen);
    if (previa) vistos.add(previa);
    const base = Object.fromEntries(COLUMNAS_CATALOGO.map((c) => [c, ""]));
    const planeacion = previa ? Object.fromEntries(CAMPOS_PLANEACION.map((c) => [c, previa[c] ?? ""])) : {};
    return { ...base, ...planeacion, ...nueva, id: previa?.id || generarId(nueva.conjunto, usados) };
  });
  const conservadas = existentes.filter((f) => !vistos.has(f));
  return { filas: [...resultado, ...conservadas], nuevas: importadas.length - vistos.size, conservadas: conservadas.length };
}

// Observaciones de calidad sobre lo importado, para el reporte de la importación.
export function diagnosticar(filas) {
  const hallazgos = [];

  const sinPat = filas.filter((f) => FORMATOS_PAT.some((x) => !separarFormatos(f.formatos).includes(x)));
  if (sinPat.length) hallazgos.push(`${sinPat.length} de ${filas.length} conjuntos no se ofrecen en CSV y JSON (formatos del PAT 2026)`);

  const varios = filas.filter((f) => /^varios$/i.test(f.area_generadora));
  if (varios.length) hallazgos.push(`${varios.length} conjuntos con área «Varios»: ${varios.map((f) => f.id).join(", ")}`);

  const grupos = new Map();
  for (const f of filas) {
    const clave = sinAcentos(f.area_generadora);
    if (!grupos.has(clave)) grupos.set(clave, new Set());
    grupos.get(clave).add(f.area_generadora);
  }
  for (const variantes of grupos.values())
    if (variantes.size > 1) hallazgos.push(`Un área escrita de varias formas: ${[...variantes].map((v) => `«${v}»`).join(" / ")}`);

  for (const c of ["fecha_creacion", "fecha_actualizacion", "frecuencia"]) {
    const valores = new Set(filas.map((f) => f[c]));
    if (filas.length > 1 && valores.size === 1)
      hallazgos.push(`Todos los conjuntos tienen el mismo valor en ${c} (${[...valores][0]}); confirme si es real`);
  }
  return hallazgos;
}
