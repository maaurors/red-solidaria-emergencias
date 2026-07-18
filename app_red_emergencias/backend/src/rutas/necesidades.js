// Necesidades: publicar (COORDINADOR), listar por albergue, actualizar prioridad.
const express = require("express");
const pool = require("../db");
const { requiereAuth, requiereRol } = require("../auth");

const router = express.Router();

// POST /api/necesidades  { id_albergue, id_item, cantidad_solicitada, prioridad }
router.post("/", requiereAuth, requiereRol("COORDINADOR"), async (req, res) => {
  const { id_albergue, id_item, prioridad } = req.body || {};
  const cantidad = Number(req.body?.cantidad_solicitada);
  if (!id_albergue || !id_item || !Number.isInteger(cantidad) || cantidad <= 0) {
    return res.status(400).json({ error: "Albergue, item y cantidad entera positiva requeridos" });
  }
  if (!["ALTA", "MEDIA", "BAJA"].includes(prioridad)) {
    return res.status(400).json({ error: "Prioridad debe ser ALTA, MEDIA o BAJA" });
  }
  try {
    const [[albergue]] = await pool.execute(
      "SELECT id_coordinador FROM albergue WHERE id_albergue = ?",
      [id_albergue]
    );
    if (!albergue) return res.status(404).json({ error: "Albergue inexistente" });
    if (albergue.id_coordinador !== req.usuario.id) {
      return res.status(403).json({ error: "Solo el coordinador a cargo puede publicar necesidades de este albergue" });
    }

    const [result] = await pool.execute(
      `INSERT INTO necesidad (id_albergue, id_item, cantidad_solicitada, prioridad, estado, fecha_solicitud)
       VALUES (?, ?, ?, ?, 'PENDIENTE', CURDATE())`,
      [id_albergue, id_item, cantidad, prioridad]
    );
    res.status(201).json({ mensaje: "Necesidad publicada", id_necesidad: result.insertId });
  } catch (e) {
    if (e.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ error: "Item inexistente" });
    }
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

// GET /api/necesidades?id_albergue=1 — listar necesidades de un albergue
router.get("/", requiereAuth, async (req, res) => {
  try {
    const { id_albergue } = req.query;
    let sql = `
      SELECT n.id_necesidad, n.id_albergue, a.nombre AS albergue,
             i.nombre AS item, i.unidad_medida,
             n.cantidad_solicitada, n.prioridad, n.estado, n.fecha_solicitud,
             COALESCE(SUM(asg.cantidad_asignada), 0) AS recibido,
             n.cantidad_solicitada - COALESCE(SUM(asg.cantidad_asignada), 0) AS pendiente
      FROM necesidad n
      JOIN albergue a ON a.id_albergue = n.id_albergue
      JOIN item i ON i.id_item = n.id_item
      LEFT JOIN asignacion asg ON asg.id_necesidad = n.id_necesidad`;
    const params = [];

    if (id_albergue) {
      sql += ` WHERE n.id_albergue = ?`;
      params.push(Number(id_albergue));
    }

    sql += ` GROUP BY n.id_necesidad, n.id_albergue, a.nombre, i.nombre, i.unidad_medida,
                      n.cantidad_solicitada, n.prioridad, n.estado, n.fecha_solicitud
             ORDER BY FIELD(n.prioridad, 'ALTA','MEDIA','BAJA'), n.fecha_solicitud DESC`;

    const [filas] = await pool.execute(sql, params);
    res.json(filas);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

// PATCH /api/necesidades/:id — actualizar prioridad (solo coordinador del albergue)
router.patch("/:id", requiereAuth, requiereRol("COORDINADOR"), async (req, res) => {
  const idNecesidad = Number(req.params.id);
  const { prioridad } = req.body || {};
  if (!["ALTA", "MEDIA", "BAJA"].includes(prioridad)) {
    return res.status(400).json({ error: "Prioridad debe ser ALTA, MEDIA o BAJA" });
  }
  try {
    const [[necesidad]] = await pool.execute(
      `SELECT n.id_necesidad, a.id_coordinador
       FROM necesidad n JOIN albergue a ON a.id_albergue = n.id_albergue
       WHERE n.id_necesidad = ?`,
      [idNecesidad]
    );
    if (!necesidad) return res.status(404).json({ error: "Necesidad no encontrada" });
    if (necesidad.id_coordinador !== req.usuario.id) {
      return res.status(403).json({ error: "Solo el coordinador del albergue puede modificar esta necesidad" });
    }

    await pool.execute(
      "UPDATE necesidad SET prioridad = ? WHERE id_necesidad = ?",
      [prioridad, idNecesidad]
    );
    res.json({ mensaje: "Prioridad actualizada", prioridad });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
