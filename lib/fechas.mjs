// Fechas de calendario en formato ISO (AAAA-MM-DD), sin hora ni zona horaria.
// Se comparan como texto y se convierten a Date en UTC solo para XLSX.

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function esFechaValida(texto) {
  const m = ISO.exec(texto ?? "");
  if (!m) return false;
  const [, a, mes, d] = m.map(Number);
  const f = new Date(Date.UTC(a, mes - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === mes - 1 && f.getUTCDate() === d;
}

export function aDateUTC(iso) {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}

// "2026-11-13" → "13 de noviembre de 2026"
export function fechaLarga(iso) {
  const [a, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

export function diasEntre(desdeIso, hastaIso) {
  return Math.round((aDateUTC(hastaIso) - aDateUTC(desdeIso)) / 86_400_000);
}

export function hoyIso(ahora = new Date()) {
  // Fecha local de la Ciudad de México, para que el corte no cambie de día por UTC.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(ahora);
}
