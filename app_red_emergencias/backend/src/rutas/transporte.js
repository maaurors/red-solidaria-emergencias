// Transporte: despachos de bodega a albergue, con confirmacion de entrega.
const express = require("express");
const pool = require("../db");
const { requiereAuth, requiereRol } = require("../auth");

const router = express.Router();
const MAX_FOTO = 2_000_000;

// GET /api/transporte/pendientes — asignaciones listas para despachar,
// agrupadas por albergue (lo que espera salir de bodega hacia terreno).
router.get("/pendientes", requiereAuth, async (_req, res) => {
  try {
    const [filas] = await pool.execute(
      `SELECT asg.id_asignacion, asg.cantidad_asignada,
              a.id_albergue, a.nombre AS albergue, a.comuna,
              i.nombre AS item, i.unidad_medida
       FROM asignacion asg
       JOIN necesidad n        ON n.id_necesidad = asg.id_necesidad
       JOIN albergue a         ON a.id_albergue = n.id_albergue
       JOIN donacion_detalle dd ON dd.id_detalle = asg.id_detalle
       JOIN item i             ON i.id_item = dd.id_item
       LEFT JOIN despacho_carga dc ON dc.id_asignacion = asg.id_asignacion
       WHERE asg.entregado = 0 AND dc.id_carga IS NULL
       ORDER BY a.nombre, i.nombre`
    );
    res.json(filas);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

// GET /api/transporte — despachos activos con su carga
router.get("/", requiereAuth, async (_req, res) => {
  try {
    const [despachos] = await pool.execute(
      `SELECT d.id_despacho, d.vehiculo, d.capacidad_kg, d.estado,
              d.fecha_ofrecido, d.fecha_entrega,
              a.nombre AS albergue, a.comuna,
              u.nombre AS transportista,
              d.foto_entrega IS NOT NULL AS tiene_foto,
              COUNT(dc.id_carga) AS bultos
       FROM despacho d
       JOIN albergue a ON a.id_albergue = d.id_albergue
       JOIN usuario u  ON u.id_usuario = d.id_transportista
       LEFT JOIN despacho_carga dc ON dc.id_despacho = d.id_despacho
       WHERE d.estado <> 'CANCELADO'
       GROUP BY d.id_despacho, d.vehiculo, d.capacidad_kg, d.estado,
                d.fecha_ofrecido, d.fecha_entrega, a.nombre, a.comuna, u.nombre
       ORDER BY FIELD(d.estado,'EN_RUTA','OFRECIDO','ENTREGADO'), d.fecha_ofrecido DESC`
    );
    res.json(despachos);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

// POST /api/transporte — ofrecer un vehiculo y tomar carga de un albergue.
// { id_albergue, vehiculo, capacidad_kg, id_asignaciones: [] }
router.post("/", requiereAuth, requiereRol("VOLUNTARIO"), async (req, res) => {
  const { id_albergue, vehiculo, capacidad_kg } = req.body || {};
  const asignaciones = Array.isArray(req.body?.id_asignaciones) ? req.body.id_asignaciones : [];
  if (!id_albergue || !vehiculo || asignaciones.length === 0) {
    return res.status(400).json({ error: "Albergue, vehiculo y al menos una carga requeridos" });
  }

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    await conexion.query("SET @usuario_app = ?", [req.usuario.nombre]);

    // Todas las asignaciones deben ser del mismo albergue, no entregadas
    // y no estar ya en otro despacho (el UNIQUE lo refuerza, pero validamos
    // para dar un mensaje claro).
    const [validas] = await conexion.query(
      `SELECT asg.id_asignacion
       FROM asignacion asg
       JOIN necesidad n ON n.id_necesidad = asg.id_necesidad
       LEFT JOIN despacho_carga dc ON dc.id_asignacion = asg.id_asignacion
       WHERE n.id_albergue = ? AND asg.entregado = 0 AND dc.id_carga IS NULL
         AND asg.id_asignacion IN (?)`,
      [id_albergue, asignaciones]
    );
    if (validas.length !== asignaciones.length) {
      await conexion.rollback();
      return res.status(409).json({ error: "Alguna carga ya fue tomada o no corresponde a este albergue" });
    }

    const [d] = await conexion.execute(
      `INSERT INTO despacho (id_transportista, id_albergue, vehiculo, capacidad_kg, estado)
       VALUES (?, ?, ?, ?, 'OFRECIDO')`,
      [req.usuario.id, id_albergue, vehiculo.trim(), capacidad_kg || null]
    );
    for (const idAsig of asignaciones) {
      await conexion.execute(
        "INSERT INTO despacho_carga (id_despacho, id_asignacion) VALUES (?, ?)",
        [d.insertId, idAsig]
      );
    }
    await conexion.commit();
    res.status(201).json({ id_despacho: d.insertId, mensaje: "Despacho creado. Gracias por transportar la ayuda" });
  } catch (e) {
    await conexion.rollback();
    if (e.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Una de las cargas ya esta en otro despacho" });
    if (e.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ error: "Albergue inexistente" });
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  } finally {
    conexion.release();
  }
});

// POST /api/transporte/:id/en-ruta — el transportista parte
router.post("/:id/en-ruta", requiereAuth, requiereRol("VOLUNTARIO"), async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [[d]] = await pool.execute(
      "SELECT id_transportista, estado FROM despacho WHERE id_despacho = ?", [id]
    );
    if (!d) return res.status(404).json({ error: "Despacho inexistente" });
    if (d.id_transportista !== req.usuario.id) return res.status(403).json({ error: "No es tu despacho" });
    if (d.estado !== "OFRECIDO") return res.status(409).json({ error: "El despacho no esta disponible para salir" });

    await pool.query("SET @usuario_app = ?", [req.usuario.nombre]);
    await pool.execute("UPDATE despacho SET estado = 'EN_RUTA' WHERE id_despacho = ?", [id]);
    res.json({ mensaje: "En ruta hacia el albergue" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

// POST /api/transporte/:id/entregar  { foto }
// Confirma la entrega: marca las asignaciones como entregadas y, si con
// eso una necesidad queda completamente entregada, la cierra.
router.post("/:id/entregar", requiereAuth, requiereRol("VOLUNTARIO"), async (req, res) => {
  const id = Number(req.params.id);
  const foto = req.body?.foto;
  if (!foto) return res.status(400).json({ error: "Foto de entrega requerida" });
  if (String(foto).length > MAX_FOTO) return res.status(400).json({ error: "La fotografia es demasiado grande" });

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    await conexion.query("SET @usuario_app = ?", [req.usuario.nombre]);

    const [[d]] = await conexion.execute(
      "SELECT id_transportista, estado FROM despacho WHERE id_despacho = ? FOR UPDATE", [id]
    );
    if (!d) { await conexion.rollback(); return res.status(404).json({ error: "Despacho inexistente" }); }
    if (d.id_transportista !== req.usuario.id) { await conexion.rollback(); return res.status(403).json({ error: "No es tu despacho" }); }
    if (d.estado !== "EN_RUTA") { await conexion.rollback(); return res.status(409).json({ error: "El despacho debe estar en ruta para entregar" }); }

    // Marcar las asignaciones de este despacho como entregadas
    await conexion.execute(
      `UPDATE asignacion SET entregado = 1
       WHERE id_asignacion IN (SELECT id_asignacion FROM despacho_carga WHERE id_despacho = ?)`,
      [id]
    );

    // Cerrar las necesidades cuyo total solicitado ya fue entregado
    await conexion.execute(
      `UPDATE necesidad n SET n.estado = 'CUBIERTA'
       WHERE n.id_necesidad IN (
         SELECT id_necesidad FROM despacho_carga dc
         JOIN asignacion a ON a.id_asignacion = dc.id_asignacion
         WHERE dc.id_despacho = ?
       )
       AND n.cantidad_solicitada <= (
         SELECT COALESCE(SUM(a2.cantidad_asignada), 0) FROM asignacion a2
         WHERE a2.id_necesidad = n.id_necesidad AND a2.entregado = 1
       )`,
      [id]
    );

    await conexion.execute(
      "UPDATE despacho SET estado = 'ENTREGADO', foto_entrega = ?, fecha_entrega = NOW() WHERE id_despacho = ?",
      [foto, id]
    );
    await conexion.commit();
    res.json({ mensaje: "Entrega confirmada. La ayuda llego al albergue" });
  } catch (e) {
    await conexion.rollback();
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  } finally {
    conexion.release();
  }
});

// GET /api/transporte/:id/foto — comprobante de entrega
router.get("/:id/foto", requiereAuth, async (req, res) => {
  try {
    const [[fila]] = await pool.execute(
      "SELECT foto_entrega FROM despacho WHERE id_despacho = ?", [Number(req.params.id)]
    );
    if (!fila || !fila.foto_entrega) return res.status(404).json({ error: "Sin foto de entrega" });
    res.json({ foto: fila.foto_entrega });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
