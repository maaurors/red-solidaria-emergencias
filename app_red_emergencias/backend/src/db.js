// Pool de conexiones MySQL — version profesional.
// Health check al arrancar, pool sizing configurable, reconexion automatica.
const mysql = require("mysql2/promise");
require("dotenv").config();
const { log } = require("./middleware/logger");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "red_emergencias",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
  maxIdle: Number(process.env.DB_POOL_IDLE || 5),
  idleTimeout: 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  // Fechas como string YYYY-MM-DD para evitar problemas de zona horaria
  dateStrings: true,
});

// Health check: verificar que la base de datos responde al arrancar
async function verificarConexion() {
  try {
    const [rows] = await pool.execute("SELECT 1 AS ok");
    if (rows[0]?.ok === 1) {
      log.info("✓ Conexión a MySQL verificada", `${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME || "red_emergencias"}`);
      return true;
    }
  } catch (e) {
    log.error("✗ No se pudo conectar a MySQL", e.message);
    return false;
  }
  return false;
}

// Monitoreo de errores del pool (conexiones perdidas, etc.)
pool.pool.on("connection", () => {
  log.info("✓ Nueva conexión al pool de MySQL");
});

module.exports = pool;
module.exports.verificarConexion = verificarConexion;
