// Fondo Transparente: libro mayor con cadena de integridad SHA-256.
const express = require("express");
const crypto = require("crypto");
const pool = require("../db");
const { requiereAuth, requiereRol } = require("../auth");

const router = express.Router();
const HASH_GENESIS = "0".repeat(64);
const MAX_FOTO = 2_000_000; // ~1.5 MB de imagen en base64

function sha256(texto) {
  return crypto.createHash("sha256").update(texto).digest("hex");
}

// Hash del movimiento: encadena el anterior con los campos inmutables.
// Todos los campos estan en la fila, por lo que la verificacion puede
// recomputar cada hash: alterar monto, tipo o foto rompe la cadena.
function hashMovimiento(previo, tipo, monto, idCampana, hashFoto, idUsuario) {
  return sha256(`${previo}|${tipo}|${monto}|${idCampana}|${hashFoto || ""}|${idUsuario}`);
}

async function ultimoHash(conexion) {
  const [[fila]] = await conexion.query(
    "SELECT hash_actual FROM movimiento_fondo ORDER BY id_movimiento DESC LIMIT 1 FOR UPDATE"
  );
  return fila ? fila.hash_actual : HASH_GENESIS;
}

async function saldoCampana(conexion, idCampana) {
  const [[fila]] = await conexion.execute(
    `SELECT COALESCE(SUM(CASE WHEN tipo = 'APORTE' THEN monto ELSE -monto END), 0) AS saldo
     FROM movimiento_fondo WHERE id_campana = ?`,
    [idCampana]
  );
  return Number(fila.saldo);
}

// GET /api/fondo/campanas — resumen publico de cada campana
router.get("/campanas", requiereAuth, async (_req, res) => {
  try {
    const [filas] = await pool.execute(
      `SELECT c.id_campana, c.nombre, c.descripcion, c.meta_monto, c.estado,
              c.fecha_inicio, e.nombre AS emergencia,
              COALESCE(SUM(CASE WHEN m.tipo = 'APORTE' THEN m.monto END), 0) AS recaudado,
              COALESCE(SUM(CASE WHEN m.tipo = 'EGRESO' THEN m.monto END), 0) AS gastado
       FROM campana c
       JOIN emergencia e ON e.id_emergencia = c.id_emergencia
       LEFT JOIN movimiento_fondo m ON m.id_campana = c.id_campana
       GROUP BY c.id_campana, c.nombre, c.descripcion, c.meta_monto, c.estado,
                c.fecha_inicio, e.nombre
       ORDER BY c.fecha_inicio DESC`
    );
    res.json(filas.map((f) => ({
      ...f,
      saldo: Number(f.recaudado) - Number(f.gastado),
      porcentaje: Math.min(100, Math.round((Number(f.recaudado) / f.meta_monto) * 100)),
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

// POST /api/fondo/campanas — crear campana (COORDINADOR)
router.post("/campanas", requiereAuth, requiereRol("COORDINADOR"), async (req, res) => {
  const { nombre, descripcion, id_emergencia } = req.body || {};
  const meta = Number(req.body?.meta_monto);
  if (!nombre || !id_emergencia || !Number.isInteger(meta) || meta <= 0) {
    return res.status(400).json({ error: "Nombre, emergencia y meta entera positiva requeridos" });
  }
  try {
    const [r] = await pool.execute(
      `INSERT INTO campana (nombre, descripcion, meta_monto, id_emergencia, fecha_inicio)
       VALUES (?, ?, ?, ?, CURDATE())`,
      [nombre.trim(), descripcion || null, meta, id_emergencia]
    );
    res.status(201).json({ id_campana: r.insertId, mensaje: "Campana creada" });
  } catch (e) {
    if (e.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ error: "Emergencia inexistente" });
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

// GET /api/fondo/campanas/:id — libro mayor de la campana (sin fotos)
router.get("/campanas/:id", requiereAuth, async (req, res) => {
  try {
    const [movimientos] = await pool.execute(
      `SELECT m.id_movimiento, m.tipo, m.monto, m.descripcion, m.proveedor,
              m.hash_actual, m.fecha, u.nombre AS usuario,
              m.foto IS NOT NULL AS tiene_foto, m.id_donacion
       FROM movimiento_fondo m
       JOIN usuario u ON u.id_usuario = m.id_usuario
       WHERE m.id_campana = ?
       ORDER BY m.id_movimiento DESC`,
      [Number(req.params.id)]
    );
    res.json(movimientos);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

// GET /api/fondo/movimientos/:id/foto — comprobante o boleta
router.get("/movimientos/:id/foto", requiereAuth, async (req, res) => {
  try {
    const [[fila]] = await pool.execute(
      "SELECT foto, hash_foto FROM movimiento_fondo WHERE id_movimiento = ?",
      [Number(req.params.id)]
    );
    if (!fila || !fila.foto) return res.status(404).json({ error: "Sin fotografia" });
    res.json({ foto: fila.foto, hash_foto: fila.hash_foto });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

// POST /api/fondo/aportes — registrar un aporte con comprobante
router.post("/aportes", requiereAuth, async (req, res) => {
  const { id_campana, foto } = req.body || {};
  const monto = Number(req.body?.monto);
  if (!id_campana || !Number.isInteger(monto) || monto <= 0) {
    return res.status(400).json({ error: "Campana y monto entero positivo requeridos" });
  }
  if (foto && String(foto).length > MAX_FOTO) {
    return res.status(400).json({ error: "La fotografia es demasiado grande" });
  }
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    await conexion.query("SET @usuario_app = ?", [req.usuario.nombre]);

    const [[campana]] = await conexion.execute(
      "SELECT estado FROM campana WHERE id_campana = ?", [id_campana]
    );
    if (!campana) { await conexion.rollback(); return res.status(404).json({ error: "Campana inexistente" }); }
    if (campana.estado !== "ACTIVA") { await conexion.rollback(); return res.status(409).json({ error: "La campana esta cerrada" }); }

    const previo = await ultimoHash(conexion);
    const hashFoto = foto ? sha256(String(foto)) : null;
    const hashActual = hashMovimiento(previo, "APORTE", monto, id_campana, hashFoto, req.usuario.id);

    await conexion.execute(
      `INSERT INTO movimiento_fondo
        (id_campana, tipo, monto, descripcion, foto, hash_foto, hash_previo, hash_actual, id_usuario)
       VALUES (?, 'APORTE', ?, ?, ?, ?, ?, ?, ?)`,
      [id_campana, monto, req.body?.descripcion || "Aporte via transferencia",
       foto || null, hashFoto, previo, hashActual, req.usuario.id]
    );
    await conexion.commit();
    res.status(201).json({ mensaje: "Aporte registrado en el libro publico", hash: hashActual });
  } catch (e) {
    await conexion.rollback();
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  } finally {
    conexion.release();
  }
});

// POST /api/fondo/egresos — compra con boleta; el stock entra a bodega
router.post("/egresos", requiereAuth, requiereRol("COORDINADOR"), async (req, res) => {
  const { id_campana, proveedor, descripcion, foto } = req.body || {};
  const monto = Number(req.body?.monto);
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!id_campana || !Number.isInteger(monto) || monto <= 0 || !proveedor || !foto) {
    return res.status(400).json({ error: "Campana, monto, proveedor y foto de boleta son obligatorios" });
  }
  if (String(foto).length > MAX_FOTO) {
    return res.status(400).json({ error: "La fotografia es demasiado grande" });
  }
  for (const it of items) {
    if (!it.id_item || !Number.isInteger(Number(it.cantidad)) || Number(it.cantidad) <= 0) {
      return res.status(400).json({ error: "Items de la compra invalidos" });
    }
  }
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    await conexion.query("SET @usuario_app = ?", [req.usuario.nombre]);

    // Invariante financiero: no se puede gastar mas de lo recaudado
    const saldo = await saldoCampana(conexion, id_campana);
    if (monto > saldo) {
      await conexion.rollback();
      return res.status(409).json({ error: `Saldo insuficiente: la campana tiene $${saldo} disponibles` });
    }

    // La compra ingresa a bodega como donacion del fondo, lista para asignar
    let idDonacion = null;
    if (items.length > 0) {
      const [d] = await conexion.execute(
        "INSERT INTO donacion (id_donante, fecha, estado) VALUES (?, CURDATE(), 'EN_BODEGA')",
        [req.usuario.id]
      );
      idDonacion = d.insertId;
      for (const it of items) {
        await conexion.execute(
          "INSERT INTO donacion_detalle (id_donacion, id_item, cantidad) VALUES (?, ?, ?)",
          [idDonacion, it.id_item, Number(it.cantidad)]
        );
      }
    }

    const previo = await ultimoHash(conexion);
    const hashFoto = sha256(String(foto));
    const hashActual = hashMovimiento(previo, "EGRESO", monto, id_campana, hashFoto, req.usuario.id);

    await conexion.execute(
      `INSERT INTO movimiento_fondo
        (id_campana, tipo, monto, descripcion, proveedor, foto, hash_foto,
         hash_previo, hash_actual, id_usuario, id_donacion)
       VALUES (?, 'EGRESO', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id_campana, monto, descripcion || null, proveedor.trim(), foto, hashFoto,
       previo, hashActual, req.usuario.id, idDonacion]
    );
    await conexion.commit();
    res.status(201).json({
      mensaje: idDonacion
        ? "Compra registrada con boleta; los items ya estan en bodega"
        : "Egreso registrado con boleta",
      hash: hashActual,
      id_donacion: idDonacion,
    });
  } catch (e) {
    await conexion.rollback();
    if (e.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ error: "Campana o item inexistente" });
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  } finally {
    conexion.release();
  }
});

// GET /api/fondo/verificar — recorre la cadena completa y detecta alteraciones
router.get("/verificar", requiereAuth, async (_req, res) => {
  try {
    const [movimientos] = await pool.query(
      `SELECT id_movimiento, id_campana, tipo, monto, foto, hash_foto,
              hash_previo, hash_actual, id_usuario
       FROM movimiento_fondo ORDER BY id_movimiento ASC`
    );
    let previo = HASH_GENESIS;
    for (const m of movimientos) {
      if (m.hash_previo !== previo) {
        return res.json({ integra: false, movimiento_alterado: m.id_movimiento, motivo: "cadena rota" });
      }
      if (m.foto && sha256(m.foto) !== m.hash_foto) {
        return res.json({ integra: false, movimiento_alterado: m.id_movimiento, motivo: "fotografia alterada" });
      }
      // Recomputo completo: detecta alteracion de monto, tipo o autor
      const esperado = hashMovimiento(previo, m.tipo, m.monto, m.id_campana, m.hash_foto, m.id_usuario);
      if (esperado !== m.hash_actual) {
        return res.json({ integra: false, movimiento_alterado: m.id_movimiento, motivo: "datos alterados" });
      }
      previo = m.hash_actual;
    }
    res.json({ integra: true, movimientos_verificados: movimientos.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
