// Panel en vivo: KPIs, historial de 7 dias, metricas de cobertura,
// voluntarios activos, velocidad de respuesta.
const express = require("express");
const pool = require("../db");
const { requiereAuth } = require("../auth");

const router = express.Router();

// GET /api/estadisticas/kpi — solo las 4 cifras principales (polling rapido)
router.get("/kpi", requiereAuth, async (_req, res) => {
  try {
    const [[hoy]] = await pool.execute(
      `SELECT COUNT(DISTINCT d.id_donacion) AS donaciones_hoy,
              COALESCE(SUM(dd.cantidad), 0) AS unidades_hoy
       FROM donacion d
       JOIN donacion_detalle dd ON dd.id_donacion = d.id_donacion
       WHERE d.fecha = CURDATE()`
    );

    const [[urgentes]] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM necesidad n
       LEFT JOIN (SELECT id_necesidad, SUM(cantidad_asignada) AS total FROM asignacion GROUP BY id_necesidad) a
       ON a.id_necesidad = n.id_necesidad
       WHERE n.estado <> 'CUBIERTA' AND n.prioridad = 'ALTA'
         AND n.cantidad_solicitada > COALESCE(a.total, 0)`
    );

    const [[voluntarios]] = await pool.execute(
      `SELECT COUNT(DISTINCT t.id_voluntario) AS activos
       FROM turno t WHERE t.fecha = CURDATE() AND t.estado <> 'CANCELADO'`
    );

    const [[coberturaGlobal]] = await pool.execute(
      `SELECT COALESCE(ROUND(SUM(COALESCE(a.total, 0)) * 100.0 / NULLIF(SUM(n.cantidad_solicitada), 0), 1), 100) AS porcentaje
       FROM necesidad n
       LEFT JOIN (SELECT id_necesidad, SUM(cantidad_asignada) AS total FROM asignacion GROUP BY id_necesidad) a
       ON a.id_necesidad = n.id_necesidad`
    );

    res.json({
      donaciones_hoy: hoy.donaciones_hoy,
      unidades_hoy: hoy.unidades_hoy,
      urgentes_sin_cubrir: urgentes.total,
      voluntarios_hoy: voluntarios.activos,
      cobertura_global: Number(coberturaGlobal.porcentaje) || 100,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

// GET /api/estadisticas — dashboard completo
router.get("/", requiereAuth, async (_req, res) => {
  try {
    const [[hoy]] = await pool.execute(
      `SELECT COUNT(DISTINCT d.id_donacion) AS donaciones_hoy,
              COALESCE(SUM(dd.cantidad), 0) AS unidades_hoy
       FROM donacion d
       JOIN donacion_detalle dd ON dd.id_donacion = d.id_donacion
       WHERE d.fecha = CURDATE()`
    );

    const [[totales]] = await pool.execute(
      `SELECT COUNT(DISTINCT d.id_donacion) AS donaciones_total,
              COALESCE(SUM(dd.cantidad), 0) AS unidades_total
       FROM donacion d
       JOIN donacion_detalle dd ON dd.id_donacion = d.id_donacion`
    );

    const [porCategoria] = await pool.execute(
      `SELECT c.nombre AS categoria,
              COALESCE(SUM(dd.cantidad), 0) AS donado
       FROM categoria_item c
       JOIN item i ON i.id_categoria = c.id_categoria
       LEFT JOIN donacion_detalle dd ON dd.id_item = i.id_item
       GROUP BY c.id_categoria, c.nombre
       ORDER BY donado DESC`
    );

    // Cobertura por albergue
    const [cobertura] = await pool.execute(
      `SELECT a.nombre AS albergue,
              a.id_albergue,
              SUM(n.cantidad_solicitada) AS solicitado,
              COALESCE(SUM(asignado.total), 0) AS asignado,
              ROUND(COALESCE(SUM(asignado.total), 0) * 100.0 / SUM(n.cantidad_solicitada), 1) AS porcentaje
       FROM necesidad n
       JOIN albergue a ON a.id_albergue = n.id_albergue
       LEFT JOIN (
         SELECT id_necesidad, SUM(cantidad_asignada) AS total
         FROM asignacion GROUP BY id_necesidad
       ) asignado ON asignado.id_necesidad = n.id_necesidad
       GROUP BY a.id_albergue, a.nombre
       ORDER BY porcentaje DESC`
    );

    const [topDonantes] = await pool.execute(
      `SELECT u.nombre AS donante, SUM(dd.cantidad) AS unidades,
              COUNT(DISTINCT d.id_donacion) AS total_donaciones
       FROM usuario u
       JOIN donacion d ON d.id_donante = u.id_usuario
       JOIN donacion_detalle dd ON dd.id_donacion = d.id_donacion
       GROUP BY u.id_usuario, u.nombre
       ORDER BY unidades DESC
       LIMIT 5`
    );

    const [ultimos] = await pool.execute(
      `SELECT d.id_donacion, d.fecha, d.estado, u.nombre AS donante,
              i.nombre AS item, dd.cantidad, i.unidad_medida
       FROM donacion d
       JOIN usuario u ON u.id_usuario = d.id_donante
       JOIN donacion_detalle dd ON dd.id_donacion = d.id_donacion
       JOIN item i ON i.id_item = dd.id_item
       ORDER BY d.id_donacion DESC
       LIMIT 10`
    );

    // Historial de donaciones de los ultimos 7 dias
    const [historial7d] = await pool.execute(
      `SELECT d.fecha, COUNT(DISTINCT d.id_donacion) AS donaciones,
              COALESCE(SUM(dd.cantidad), 0) AS unidades
       FROM donacion d
       JOIN donacion_detalle dd ON dd.id_donacion = d.id_donacion
       WHERE d.fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY d.fecha
       ORDER BY d.fecha ASC`
    );

    // Metricas adicionales
    const [[urgentes]] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM necesidad n
       LEFT JOIN (SELECT id_necesidad, SUM(cantidad_asignada) AS total FROM asignacion GROUP BY id_necesidad) a
       ON a.id_necesidad = n.id_necesidad
       WHERE n.estado <> 'CUBIERTA' AND n.prioridad = 'ALTA'
         AND n.cantidad_solicitada > COALESCE(a.total, 0)`
    );

    const [[voluntarios]] = await pool.execute(
      `SELECT COUNT(DISTINCT t.id_voluntario) AS activos
       FROM turno t WHERE t.fecha = CURDATE() AND t.estado <> 'CANCELADO'`
    );

    const [[coberturaGlobal]] = await pool.execute(
      `SELECT COALESCE(ROUND(SUM(COALESCE(a.total, 0)) * 100.0 / NULLIF(SUM(n.cantidad_solicitada), 0), 1), 100) AS porcentaje
       FROM necesidad n
       LEFT JOIN (SELECT id_necesidad, SUM(cantidad_asignada) AS total FROM asignacion GROUP BY id_necesidad) a
       ON a.id_necesidad = n.id_necesidad`
    );

    res.json({
      hoy,
      totales,
      porCategoria,
      cobertura,
      topDonantes,
      ultimos,
      historial7d,
      urgentes_sin_cubrir: urgentes.total,
      voluntarios_hoy: voluntarios.activos,
      cobertura_global: Number(coberturaGlobal.porcentaje) || 100,
    });
  } catch (e) {
    console.error(e);
  }
});

// GET /api/estadisticas/ranking — Ranking completo con avatar para gamificacion
router.get("/ranking", requiereAuth, async (_req, res) => {
  try {
    const [ranking] = await pool.execute(
      `SELECT u.id_usuario, u.nombre, u.avatar,
              COUNT(DISTINCT d.id_donacion) AS num_donaciones,
              COALESCE(SUM(dd.cantidad), 0) AS total_unidades
       FROM usuario u
       LEFT JOIN donacion d ON d.id_donante = u.id_usuario
       LEFT JOIN donacion_detalle dd ON dd.id_donacion = d.id_donacion
       WHERE u.rol = 'DONANTE'
       GROUP BY u.id_usuario, u.nombre, u.avatar
       ORDER BY total_unidades DESC, num_donaciones DESC`
    );

    // Calcular las estrellas en el backend: 1 estrella cada 10 unidades
    const rankingConEstrellas = ranking.map((donante) => {
      const total = Number(donante.total_unidades) || 0;
      const estrellas = Math.floor(total / 10);
      return {
        ...donante,
        total_unidades: total,
        estrellas: estrellas
      };
    });

    res.json(rankingConEstrellas);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno al obtener ranking" });
  }
});

module.exports = router;
