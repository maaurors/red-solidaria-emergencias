// Servidor principal — Red Solidaria de Emergencias API (profesional).
// Logger, compresion, seguridad, rate limiting, graceful shutdown.
const express = require("express");
const cors = require("cors");
const compression = require("compression");
require("dotenv").config();

const { log, middlewareLogger } = require("./middleware/logger");
const pool = require("./db");
const { verificarConexion } = require("./db");

const app = express();

// ─── Seguridad y performance ───────────────────────────────────

// CORS configurado (permite desarrollo local y Expo)
app.use(cors({
  origin: "*", // En produccion: lista blanca de origenes
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(compression());                     // Compresion gzip para respuestas
// Fondo y transporte reciben fotografias en base64: limite mayor solo ahi
app.use("/api/fondo", express.json({ limit: "3mb" }));
app.use("/api/transporte", express.json({ limit: "3mb" }));
app.use(express.json({ limit: "100kb" }));   // Cuerpos acotados
app.disable("x-powered-by");                // No anunciar el framework

// Cabeceras de seguridad profesionales
app.use((_req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "0",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cache-Control": "no-store",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  });
  next();
});

// ─── Logger de peticiones ──────────────────────────────────────
app.use(middlewareLogger);

// ─── Rate limiting ─────────────────────────────────────────────

// Rate limiting general: maximo 100 peticiones por IP por minuto
const ventanas = new Map();
const LIMITE_POR_MINUTO = 100;
app.use((req, res, next) => {
  const ahora = Date.now();
  const clave = req.ip;
  const registro = ventanas.get(clave) || { inicio: ahora, cuenta: 0 };
  if (ahora - registro.inicio > 60_000) { registro.inicio = ahora; registro.cuenta = 0; }
  registro.cuenta += 1;
  ventanas.set(clave, registro);
  if (registro.cuenta > LIMITE_POR_MINUTO) {
    return res.status(429).json({ error: "Demasiadas peticiones, intenta en un minuto" });
  }
  next();
});

// Rate limit estricto para login: 10 intentos por minuto
const ventanasLogin = new Map();
app.use("/api/auth/login", (req, res, next) => {
  const ahora = Date.now();
  const registro = ventanasLogin.get(req.ip) || { inicio: ahora, cuenta: 0 };
  if (ahora - registro.inicio > 60_000) { registro.inicio = ahora; registro.cuenta = 0; }
  registro.cuenta += 1;
  ventanasLogin.set(req.ip, registro);
  if (registro.cuenta > 10) {
    return res.status(429).json({ error: "Demasiados intentos de acceso, espera un minuto" });
  }
  next();
});

// Limpiar rate-limit maps cada 5 minutos para evitar memory leak
setInterval(() => {
  const ahora = Date.now();
  for (const [clave, reg] of ventanas) {
    if (ahora - reg.inicio > 120_000) ventanas.delete(clave);
  }
  for (const [clave, reg] of ventanasLogin) {
    if (ahora - reg.inicio > 120_000) ventanasLogin.delete(clave);
  }
}, 300_000);

// ─── Health check ──────────────────────────────────────────────

app.get("/api/salud", async (_req, res) => {
  try {
    const [[r]] = await pool.execute("SELECT 1 AS ok");
    res.json({
      ok: true,
      servicio: "red-emergencias-api",
      version: "2.0.0",
      timestamp: new Date().toISOString(),
      db: r.ok === 1 ? "conectada" : "error",
    });
  } catch {
    res.status(503).json({ ok: false, servicio: "red-emergencias-api", db: "desconectada" });
  }
});

// ─── Rutas de la API ───────────────────────────────────────────

app.use("/api/auth", require("./rutas/autenticacion"));
app.use("/api", require("./rutas/consultas"));
app.use("/api/donaciones", require("./rutas/donaciones"));
app.use("/api/turnos", require("./rutas/turnos"));
app.use("/api/necesidades", require("./rutas/necesidades"));
app.use("/api/estadisticas", require("./rutas/estadisticas"));
app.use("/api/auditoria", require("./rutas/auditoria"));
app.use("/api/fondo", require("./rutas/fondo"));
app.use("/api/transporte", require("./rutas/transporte"));

// ─── Manejo de errores ────────────────────────────────────────

// 404
app.use((_req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

// Error handler global: sin stack traces hacia el cliente
app.use((err, req, res, _next) => {
  log.error(`${err.message}`, `[${req.requestId || "?"}] ${err.stack?.split("\n")[1]?.trim() || ""}`);
  res.status(500).json({ error: "Error interno" });
});

// ─── Arranque y shutdown ───────────────────────────────────────

const PORT = Number(process.env.PORT || 3000);

async function arrancar() {
  // Verificar DB antes de aceptar trafico
  const dbOk = await verificarConexion();
  if (!dbOk) {
    log.warn("⚠ Arrancando sin conexión a DB verificada");
  }

  const servidor = app.listen(PORT, "0.0.0.0", () => {
    log.info(`API escuchando en puerto ${PORT}`, `http://0.0.0.0:${PORT}`);
    log.info(`   Entorno: ${process.env.NODE_ENV || "development"}`);
  });

  // Graceful shutdown: cerrar conexiones limpiamente
  const cerrar = async (signal) => {
    log.info(`${signal} recibido, cerrando servidor...`);
    servidor.close(async () => {
      try {
        await pool.end();
        log.info("✓ Pool de MySQL cerrado");
      } catch (e) {
        log.error("Error cerrando pool", e.message);
      }
      process.exit(0);
    });
    // Forzar cierre si tarda mas de 10s
    setTimeout(() => {
      log.warn("Forzando cierre despues de 10s");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => cerrar("SIGTERM"));
  process.on("SIGINT", () => cerrar("SIGINT"));
}

arrancar();
