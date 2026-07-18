// Turnos de voluntariado — version profesional.
// Agendar, cancelar, mis turnos, y consultar disponibilidad.
const express = require("express");
const pool = require("../db");
const { requiereAuth, requiereRol } = require("../auth");

const router = express.Router();

const BLOQUES = ["MANANA", "TARDE", "NOCHE"];

// POST /api/turnos  { id_albergue, fecha, bloque }
router.post("/", requiereAuth, requiereRol("VOLUNTARIO"), async (req, res) => {
  const { id_albergue, fecha, bloque } = req.body || {};
  if (!id_albergue || !fecha || !BLOQUES.includes(bloque)) {
    return res.status(400).json({ error: "Albergue, fecha y bloque (MANANA/TARDE/NOCHE) requeridos" });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return res.status(400).json({ error: "Fecha invalida. Formato: AAAA-MM-DD" });
  }
  // No permitir agendar turnos en el pasado
  if (new Date(fecha) < new Date(new Date().toISOString().slice(0, 10))) {
    return res.status(400).json({ error: "No puedes agendar turnos en fechas pasadas" });
  }
  try {
    const [result] = await pool.execute(
      "INSERT INTO turno (id_voluntario, id_albergue, fecha, bloque) VALUES (?, ?, ?, ?)",
      [req.usuario.id, id_albergue, fecha, bloque]
    );
    res.status(201).json({
      mensaje: "Turno agendado",
      id_turno: result.insertId,
      fecha,
      bloque,
    });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Ya tienes un turno agendado en ese bloque y fecha" });
    }
    if (e.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ error: "Albergue inexistente" });
    }
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

// DELETE /api/turnos/:id — cancelar un turno propio (solo futuros)
router.delete("/:id", requiereAuth, requiereRol("VOLUNTARIO"), async (req, res) => {
  const idTurno = Number(req.params.id);
  try {
    const [[turno]] = await pool.execute(
      "SELECT id_turno, id_voluntario, fecha, estado FROM turno WHERE id_turno = ?",
      [idTurno]
    );
    if (!turno) return res.status(404).json({ error: "Turno no encontrado" });
    if (turno.id_voluntario !== req.usuario.id) {
      return res.status(403).json({ error: "Solo puedes cancelar tus propios turnos" });
    }
    if (new Date(turno.fecha) < new Date(new Date().toISOString().slice(0, 10))) {
      return res.status(400).json({ error: "No puedes cancelar turnos pasados" });
    }
    if (turno.estado === "CANCELADO") {
      return res.status(400).json({ error: "Este turno ya fue cancelado" });
    }

    await pool.execute(
      "UPDATE turno SET estado = 'CANCELADO' WHERE id_turno = ?",
      [idTurno]
    );
    res.json({ mensaje: "Turno cancelado exitosamente" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

// GET /api/turnos/mios
router.get("/mios", requiereAuth, requiereRol("VOLUNTARIO"), async (req, res) => {
  try {
    const [filas] = await pool.execute(
      `SELECT t.id_turno, t.fecha, t.bloque, t.estado, a.nombre AS albergue, a.comuna
       FROM turno t JOIN albergue a ON a.id_albergue = t.id_albergue
       WHERE t.id_voluntario = ?
       ORDER BY t.fecha DESC, FIELD(t.bloque, 'MANANA','TARDE','NOCHE')`,
      [req.usuario.id]
    );

    // Separar en proximos y pasados
    const hoy = new Date().toISOString().slice(0, 10);
    const proximos = filas.filter(t => t.fecha >= hoy && t.estado !== "CANCELADO");
    const pasados = filas.filter(t => t.fecha < hoy || t.estado === "CANCELADO");

    res.json({ proximos, pasados, total: filas.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

// GET /api/turnos/disponibilidad?id_albergue=1&fecha=2026-07-25
router.get("/disponibilidad", requiereAuth, async (req, res) => {
  const { id_albergue, fecha } = req.query;
  if (!id_albergue || !fecha) {
    return res.status(400).json({ error: "id_albergue y fecha requeridos" });
  }
  try {
    const [filas] = await pool.execute(
      `SELECT bloque, COUNT(*) AS voluntarios
       FROM turno
       WHERE id_albergue = ? AND fecha = ? AND estado <> 'CANCELADO'
       GROUP BY bloque
       ORDER BY FIELD(bloque, 'MANANA','TARDE','NOCHE')`,
      [Number(id_albergue), fecha]
    );

    // Devolver los 3 bloques siempre, con 0 si no hay nadie
    const disponibilidad = BLOQUES.map(b => ({
      bloque: b,
      voluntarios: filas.find(f => f.bloque === b)?.voluntarios || 0,
    }));

    res.json(disponibilidad);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
