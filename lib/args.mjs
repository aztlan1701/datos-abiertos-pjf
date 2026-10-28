// Argumentos de línea de comandos en la forma --clave valor o --bandera.
export function leerArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const clave = a.slice(2);
    const siguiente = argv[i + 1];
    if (siguiente === undefined || siguiente.startsWith("--")) args[clave] = true;
    else args[clave] = argv[++i];
  }
  return args;
}

export function salirConErrores(errores) {
  for (const e of errores) console.error(`✗ ${e}`);
  process.exit(1);
}
