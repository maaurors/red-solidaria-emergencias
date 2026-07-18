const express = require("express");
const pool = require("../db");
const { requiereAuth, requiereRol } = require("../auth");

const router = express.Router();

router.get("/", requiereAuth, requiereRol("COORDINADOR"), async (req, res) => {
  const limite = Math.min(100, Math.max(1, Number(req.query.limite) || 60));
  try {
    const [filas] = await pool.query(
      `SELECT id_auditoria, tabla_afectada, id_registro, accion, detalle,
              usuario_app, fecha_hora
       FROM auditoria
       ORDER BY id_auditoria DESC
       LIMIT ${limite}`
    );
    res.json(filas);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
