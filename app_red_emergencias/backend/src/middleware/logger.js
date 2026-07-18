// Logger profesional: timestamps, colores, duracion de cada request.
// Cada peticion recibe un ID unico para trazabilidad end-to-end.
const crypto = require("crypto");

// Colores ANSI para la consola
const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  verde: "\x1b[32m",
  amarillo: "\x1b[33m",
  rojo: "\x1b[31m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  blanco: "\x1b[37m",
};

// Niveles de log
const log = {
  info: (msg, meta = "") =>
    console.log(`${C.dim}${timestamp()}${C.reset} ${C.verde}INFO${C.reset}  ${msg} ${C.dim}${meta}${C.reset}`),
  warn: (msg, meta = "") =>
    console.warn(`${C.dim}${timestamp()}${C.reset} ${C.amarillo}WARN${C.reset}  ${msg} ${C.dim}${meta}${C.reset}`),
  error: (msg, meta = "") =>
    console.error(`${C.dim}${timestamp()}${C.reset} ${C.rojo}ERROR${C.reset} ${msg} ${C.dim}${meta}${C.reset}`),
};

function timestamp() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

// Color del status HTTP
function colorStatus(status) {
  if (status >= 500) return C.rojo;
  if (status >= 400) return C.amarillo;
  if (status >= 300) return C.cyan;
  return C.verde;
}

// Middleware: loguea cada request con metodo, ruta, status y duracion
function middlewareLogger(req, res, next) {
  // Generar ID unico para esta peticion
  req.requestId = crypto.randomBytes(4).toString("hex");
  res.setHeader("X-Request-Id", req.requestId);

  const inicio = process.hrtime.bigint();

  // Interceptar el final de la respuesta
  const finOriginal = res.end;
  res.end = function (...args) {
    const duracion = Number(process.hrtime.bigint() - inicio) / 1e6; // ms
    const ms = duracion.toFixed(1);
    const color = colorStatus(res.statusCode);
    const metodo = req.method.padEnd(6);

    log.info(
      `${C.magenta}${metodo}${C.reset} ${req.originalUrl || req.url} ${color}${res.statusCode}${C.reset}`,
      `${ms}ms [${req.requestId}]`
    );

    finOriginal.apply(res, args);
  };

  next();
}

module.exports = { log, middlewareLogger };
