import { leerCsv, leerEncabezados } from "./csv.mjs";
import { esFechaValida } from "./fechas.mjs";

export const COLUMNAS_CATALOGO = [
  "id",
  "conjunto",
  "descripcion",
  "area_generadora",
  "area_custodia",
  "sistema_origen",
  "formatos",
  "prioridad",
  "viable",
  "frecuencia",
  "publicado",
  "fecha_publicacion",
  "url_publicacion",
  "observaciones",
];

export const FORMATOS_VALIDOS = ["CSV", "JSON", "XML", "XLSX"];
// El PAT 2026 compromete la publicación en CSV y JSON.
export const FORMATOS_PAT = ["CSV", "JSON"];
export const PRIORIDADES = ["alta", "media", "baja"];
export const VIABILIDAD = ["2026", "2027"];
export const SI_NO = ["si", "no"];

const OBLIGATORIAS = ["id", "conjunto", "area_generadora", "formatos", "prioridad", "viable", "publicado"];

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const separarFormatos = (texto) =>
  (texto ?? "")
    .split("|")
    .map((f) => f.trim().toUpperCase())
    .filter(Boolean);

// Valida filas ya leídas. Devuelve { errores, avisos } con mensajes que citan la fila del CSV
// (la fila 1 es el encabezado, así que el primer registro es la fila 2).
export function validarCatalogo(filas, encabezados = COLUMNAS_CATALOGO) {
  const errores = [];
  const avisos = [];

  const faltantes = COLUMNAS_CATALOGO.filter((c) => !encabezados.includes(c));
  if (faltantes.length) errores.push(`Faltan columnas: ${faltantes.join(", ")}`);
  const sobrantes = encabezados.filter((c) => !COLUMNAS_CATALOGO.includes(c));
  if (sobrantes.length) avisos.push(`Columnas no reconocidas (se ignoran): ${sobrantes.join(", ")}`);
  if (faltantes.length) return { errores, avisos };

  const vistos = new Map();
  filas.forEach((f, i) => {
    const fila = `Fila ${i + 2}${f.id ? ` (${f.id})` : ""}`;

    for (const c of OBLIGATORIAS) if (!f[c]) errores.push(`${fila}: «${c}» está vacío`);

    if (f.id) {
      if (!ID.test(f.id)) errores.push(`${fila}: el id solo admite minúsculas, números y guiones`);
      if (vistos.has(f.id)) errores.push(`${fila}: id repetido (también en la fila ${vistos.get(f.id)})`);
      else vistos.set(f.id, i + 2);
    }

    const formatos = separarFormatos(f.formatos);
    const invalidos = formatos.filter((x) => !FORMATOS_VALIDOS.includes(x));
    if (invalidos.length) errores.push(`${fila}: formato no reconocido: ${invalidos.join(", ")}`);
    const faltaPat = FORMATOS_PAT.filter((x) => !formatos.includes(x));
    if (f.formatos && f.viable === "2026" && faltaPat.length)
      avisos.push(`${fila}: el PAT 2026 compromete CSV y JSON; falta ${faltaPat.join(" y ")}`);

    if (f.prioridad && !PRIORIDADES.includes(f.prioridad))
      errores.push(`${fila}: prioridad debe ser ${PRIORIDADES.join(", ")}`);
    if (f.viable && !VIABILIDAD.includes(f.viable))
      errores.push(`${fila}: viable debe ser ${VIABILIDAD.join(" o ")}`);
    if (f.publicado && !SI_NO.includes(f.publicado)) errores.push(`${fila}: publicado debe ser «si» o «no»`);

    if (f.publicado === "si" && !f.fecha_publicacion)
      errores.push(`${fila}: publicado sin fecha_publicacion`);
    if (f.fecha_publicacion && !esFechaValida(f.fecha_publicacion))
      errores.push(`${fila}: fecha_publicacion debe tener el formato AAAA-MM-DD`);
    if (f.publicado === "no" && f.fecha_publicacion)
      avisos.push(`${fila}: tiene fecha_publicacion pero publicado es «no»`);
    if (f.publicado === "si" && !f.url_publicacion) avisos.push(`${fila}: publicado sin url_publicacion`);
  });

  return { errores, avisos };
}

export function cargarCatalogo(ruta) {
  const encabezados = leerEncabezados(ruta);
  const filas = leerCsv(ruta);
  return { filas, ...validarCatalogo(filas, encabezados) };
}

// IND-5 = (conjuntos publicados / conjuntos programados) × 100.
// Programados: viables en 2026. Publicados: de esos, los publicados en o antes de la fecha de corte.
export function calcularIndicador(filas, corte) {
  const programados = filas.filter((f) => f.viable === "2026");
  const publicados = programados.filter(
    (f) => f.publicado === "si" && f.fecha_publicacion && f.fecha_publicacion <= corte,
  );
  const valor = programados.length ? (publicados.length / programados.length) * 100 : null;
  return {
    corte,
    programados: programados.length,
    publicados: publicados.length,
    valor,
    pendientes: programados.filter((f) => !publicados.includes(f)).map((f) => f.id),
  };
}
