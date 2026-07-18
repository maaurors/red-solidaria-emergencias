// Donaciones: registrar (DONANTE), consultar las propias con trazabilidad,
// asignar a necesidades (COORDINADOR), escanear QR, listar pendientes.
// Respuestas enriquecidas con detalle completo.
const express = require("express");
const pool = require("../db");
const { requiereAuth, requiereRol } = require("../auth");

const router = express.Router();

// POST /api/donaciones  { id_albergue_destino, items: [{ id_item, cantidad }, ...] }
// Cabecera + detalle en UNA transaccion: o se inserta todo, o nada.
router.post("/", requiereAuth, requiereRol("DONANTE"), async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const id_albergue_destino = req.body?.id_albergue_destino ? Number(req.body.id_albergue_destino) : null;
  if (items.length === 0) {
    return res.status(400).json({ error: "La donación debe incluir al menos un ítem" });
  }
  for (const it of items) {
    const cantidad = Number(it.cantidad);
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      return res.status(400).json({ error: "Cantidades inválidas: deben ser enteros positivos" });
    }
  }

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [cab] = await conexion.execute(
      "INSERT INTO donacion (id_donante, fecha, estado, id_albergue_destino) VALUES (?, CURDATE(), 'RECIBIDA', ?)",
      [req.usuario.id, id_albergue_destino]
    );
    const detalleInsertado = [];
    for (const it of items) {
      const [detResult] = await conexion.execute(
        "INSERT INTO donacion_detalle (id_donacion, id_item, cantidad) VALUES (?, ?, ?)",
        [cab.insertId, it.id_item, Number(it.cantidad)]
      );
      detalleInsertado.push({ id_detalle: detResult.insertId, id_item: it.id_item, cantidad: Number(it.cantidad) });
    }
    await conexion.commit();

    // Respuesta enriquecida con detalle completo
    res.status(201).json({
      id_donacion: cab.insertId,
      codigo_qr: `RSE-DON-${cab.insertId}`,
      estado: "RECIBIDA",
      fecha: new Date().toISOString().slice(0, 10),
      items: detalleInsertado,
      id_albergue_destino,
      mensaje: "¡Donación registrada! Gracias por tu aporte solidario",
    });
  } catch (e) {
    await conexion.rollback();
    if (e.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ error: "Ítem inexistente" });
    }
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  } finally {
    conexion.release();
  }
});

// GET /api/donaciones/mias — trazabilidad completa con estadisticas personales.
router.get("/mias", requiereAuth, requiereRol("DONANTE"), async (req, res) => {
  try {
    const [filas] = await pool.execute(
      `SELECT d.id_donacion, d.fecha, d.estado,
              i.nombre AS item, i.unidad_medida,
              dd.cantidad AS donado, dd.id_detalle,
              COALESCE(SUM(asg.cantidad_asignada), 0) AS asignado
       FROM donacion d
       JOIN donacion_detalle dd ON dd.id_donacion = d.id_donacion
       JOIN item i              ON i.id_item = dd.id_item
       LEFT JOIN asignacion asg ON asg.id_detalle = dd.id_detalle
       WHERE d.id_donante = ?
       GROUP BY d.id_donacion, d.fecha, d.estado, i.nombre, i.unidad_medida, dd.cantidad, dd.id_detalle
       ORDER BY d.fecha DESC, d.id_donacion DESC`,
      [req.usuario.id]
    );

    // Destinos por detalle: a que albergue fue cada asignacion
    const [destinos] = await pool.execute(
      `SELECT dd.id_donacion, dd.id_detalle, a.nombre AS albergue, asg.cantidad_asignada,
              asg.fecha_asignacion
       FROM asignacion asg
       JOIN donacion_detalle dd ON dd.id_detalle = asg.id_detalle
       JOIN donacion d          ON d.id_donacion = dd.id_donacion
       JOIN necesidad n         ON n.id_necesidad = asg.id_necesidad
       JOIN albergue a          ON a.id_albergue = n.id_albergue
       WHERE d.id_donante = ?
       ORDER BY asg.fecha_asignacion DESC`,
      [req.usuario.id]
    );

    // Estadisticas personales del donante
    const [[stats]] = await pool.execute(
      `SELECT COUNT(DISTINCT d.id_donacion) AS total_donaciones,
              COALESCE(SUM(dd.cantidad), 0) AS total_unidades,
              COUNT(DISTINCT a.id_albergue) AS albergues_impactados
       FROM donacion d
       JOIN donacion_detalle dd ON dd.id_donacion = d.id_donacion
       LEFT JOIN asignacion asg ON asg.id_detalle = dd.id_detalle
       LEFT JOIN necesidad n ON n.id_necesidad = asg.id_necesidad
       LEFT JOIN albergue a ON a.id_albergue = n.id_albergue
       WHERE d.id_donante = ?`,
      [req.usuario.id]
    );

    res.json({ donaciones: filas, destinos, estadisticas: stats });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

// POST /api/donaciones/asignar  { id_detalle, id_necesidad, cantidad }
router.post("/asignar", requiereAuth, requiereRol("COORDINADOR"), async (req, res) => {
  const { id_detalle, id_necesidad } = req.body || {};
  const cantidad = Number(req.body?.cantidad);
  if (!id_detalle || !id_necesidad || !Number.isInteger(cantidad) || cantidad <= 0) {
    return res.status(400).json({ error: "Datos de asignación inválidos" });
  }

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();

    const [[detalle]] = await conexion.execute(
      `SELECT dd.cantidad - COALESCE((
         SELECT SUM(a.cantidad_asignada) FROM asignacion a WHERE a.id_detalle = dd.id_detalle
       ), 0) AS disponible
       FROM donacion_detalle dd WHERE dd.id_detalle = ? FOR UPDATE`,
      [id_detalle]
    );
    if (!detalle) { await conexion.rollback(); return res.status(404).json({ error: "Detalle inexistente" }); }
    if (cantidad > detalle.disponible) {
      await conexion.rollback();
      return res.status(409).json({ error: `Solo quedan ${detalle.disponible} unidades disponibles en esa donación` });
    }

    const [[nec]] = await conexion.execute(
      `SELECT n.cantidad_solicitada - COALESCE((
         SELECT SUM(a.cantidad_asignada) FROM asignacion a WHERE a.id_necesidad = n.id_necesidad
       ), 0) AS pendiente
       FROM necesidad n WHERE n.id_necesidad = ? FOR UPDATE`,
      [id_necesidad]
    );
    if (!nec) { await conexion.rollback(); return res.status(404).json({ error: "Necesidad inexistente" }); }
    if (cantidad > nec.pendiente) {
      await conexion.rollback();
      return res.status(409).json({ error: `La necesidad solo tiene ${nec.pendiente} unidades pendientes` });
    }

    await conexion.execute(
      "INSERT INTO asignacion (id_detalle, id_necesidad, cantidad_asignada, fecha_asignacion) VALUES (?, ?, ?, CURDATE())",
      [id_detalle, id_necesidad, cantidad]
    );

    const nuevoEstado = cantidad === nec.pendiente ? "CUBIERTA" : "PARCIAL";
    await conexion.execute(
      "UPDATE necesidad SET estado = ? WHERE id_necesidad = ?",
      [nuevoEstado, id_necesidad]
    );

    await conexion.commit();
    res.status(201).json({
      mensaje: "Asignación registrada exitosamente",
      estado_necesidad: nuevoEstado,
      cantidad_asignada: cantidad,
      disponible_restante: detalle.disponible - cantidad,
      pendiente_restante: nec.pendiente - cantidad,
    });
  } catch (e) {
    await conexion.rollback();
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  } finally {
    conexion.release();
  }
});

// POST /api/donaciones/escanear  { codigo }
router.post("/escanear", requiereAuth, requiereRol("COORDINADOR"), async (req, res) => {
  const codigo = String(req.body?.codigo || "");
  const match = codigo.match(/^RSE-DON-(\d+)$/);
  if (!match) {
    return res.status(400).json({ error: "Código QR no reconocido" });
  }
  const idDonacion = Number(match[1]);
  try {
    const [[donacion]] = await pool.execute(
      `SELECT d.id_donacion, d.estado, d.fecha, u.nombre AS donante
       FROM donacion d JOIN usuario u ON u.id_usuario = d.id_donante
       WHERE d.id_donacion = ?`,
      [idDonacion]
    );
    if (!donacion) return res.status(404).json({ error: "Donación inexistente" });

    const [items] = await pool.execute(
      `SELECT i.nombre AS item, dd.cantidad, i.unidad_medida
       FROM donacion_detalle dd JOIN item i ON i.id_item = dd.id_item
       WHERE dd.id_donacion = ?`,
      [idDonacion]
    );

    if (donacion.estado === "RECIBIDA") {
      await pool.execute(
        "UPDATE donacion SET estado = 'EN_BODEGA' WHERE id_donacion = ?",
        [idDonacion]
      );
      return res.json({
        mensaje: "✓ Donación ingresada a bodega exitosamente",
        donacion: { ...donacion, estado: "EN_BODEGA" },
        items,
        accion: "INGRESADA",
      });
    }
    return res.json({
      mensaje: `Esta donación ya estaba ${donacion.estado === "EN_BODEGA" ? "en bodega" : "distribuida"}`,
      donacion,
      items,
      accion: "YA_PROCESADA",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

// GET /api/donaciones/sugerencias — plan de distribucion propuesto.
// Estrategia greedy documentable: para cada item con stock disponible,
// se cubren primero las necesidades ALTA, luego por antiguedad.
router.get("/sugerencias", requiereAuth, requiereRol("COORDINADOR"), async (_req, res) => {
  try {
    const [disponibles] = await pool.execute(
      `SELECT dd.id_detalle, dd.id_item, i.nombre AS item, i.unidad_medida,
              u.nombre AS donante,
              dd.cantidad - COALESCE(SUM(asg.cantidad_asignada), 0) AS disponible
       FROM donacion_detalle dd
       JOIN donacion d ON d.id_donacion = dd.id_donacion
       JOIN usuario u  ON u.id_usuario = d.id_donante
       JOIN item i     ON i.id_item = dd.id_item
       LEFT JOIN asignacion asg ON asg.id_detalle = dd.id_detalle
       GROUP BY dd.id_detalle, dd.id_item, i.nombre, i.unidad_medida, u.nombre, dd.cantidad
       HAVING disponible > 0
       ORDER BY dd.id_detalle`
    );

    const [pendientes] = await pool.execute(
      `SELECT n.id_necesidad, n.id_item, n.prioridad, n.fecha_solicitud,
              a.nombre AS albergue,
              DATEDIFF(CURDATE(), n.fecha_solicitud) AS dias_espera,
              n.cantidad_solicitada - COALESCE(SUM(asg.cantidad_asignada), 0) AS pendiente
       FROM necesidad n
       JOIN albergue a ON a.id_albergue = n.id_albergue
       LEFT JOIN asignacion asg ON asg.id_necesidad = n.id_necesidad
       WHERE n.estado <> 'CUBIERTA'
       GROUP BY n.id_necesidad, n.id_item, n.prioridad, n.fecha_solicitud, a.nombre, n.cantidad_solicitada
       HAVING pendiente > 0
       ORDER BY FIELD(n.prioridad, 'ALTA','MEDIA','BAJA'), n.fecha_solicitud`
    );

    const plan = [];
    const saldoNecesidad = new Map(pendientes.map((n) => [n.id_necesidad, n.pendiente]));

    for (const det of disponibles) {
      let saldoDetalle = det.disponible;
      for (const nec of pendientes) {
        if (saldoDetalle <= 0) break;
        if (nec.id_item !== det.id_item) continue;
        const faltante = saldoNecesidad.get(nec.id_necesidad);
        if (faltante <= 0) continue;
        const cantidad = Math.min(saldoDetalle, faltante);
        saldoDetalle -= cantidad;
        saldoNecesidad.set(nec.id_necesidad, faltante - cantidad);
        plan.push({
          id_detalle: det.id_detalle,
          id_necesidad: nec.id_necesidad,
          item: det.item,
          unidad_medida: det.unidad_medida,
          donante: det.donante,
          albergue: nec.albergue,
          cantidad,
          prioridad: nec.prioridad,
          motivo: `Prioridad ${nec.prioridad}, ${nec.dias_espera} dias en espera`,
        });
      }
    }

    res.json({ plan, total_movimientos: plan.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

// POST /api/donaciones/asignar-lote  { asignaciones: [{ id_detalle, id_necesidad, cantidad }] }
// Aplica un plan completo en una transaccion: o entra todo, o nada.
// Revalida los invariantes por fila; no confia en el plan recibido.
router.post("/asignar-lote", requiereAuth, requiereRol("COORDINADOR"), async (req, res) => {
  const asignaciones = Array.isArray(req.body?.asignaciones) ? req.body.asignaciones : [];
  if (asignaciones.length === 0 || asignaciones.length > 100) {
    return res.status(400).json({ error: "El lote debe traer entre 1 y 100 asignaciones" });
  }
  for (const a of asignaciones) {
    if (!a.id_detalle || !a.id_necesidad || !Number.isInteger(Number(a.cantidad)) || Number(a.cantidad) <= 0) {
      return res.status(400).json({ error: "Asignacion invalida en el lote" });
    }
  }

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    await conexion.query("SET @usuario_app = ?", [req.usuario.nombre]);

    for (const a of asignaciones) {
      const [[detalle]] = await conexion.execute(
        `SELECT dd.cantidad - COALESCE((
           SELECT SUM(x.cantidad_asignada) FROM asignacion x WHERE x.id_detalle = dd.id_detalle
         ), 0) AS disponible
         FROM donacion_detalle dd WHERE dd.id_detalle = ? FOR UPDATE`,
        [a.id_detalle]
      );
      const [[nec]] = await conexion.execute(
        `SELECT n.cantidad_solicitada - COALESCE((
           SELECT SUM(x.cantidad_asignada) FROM asignacion x WHERE x.id_necesidad = n.id_necesidad
         ), 0) AS pendiente
         FROM necesidad n WHERE n.id_necesidad = ? FOR UPDATE`,
        [a.id_necesidad]
      );
      const cantidad = Number(a.cantidad);
      if (!detalle || !nec || cantidad > detalle.disponible || cantidad > nec.pendiente) {
        await conexion.rollback();
        return res.status(409).json({
          error: `El plan quedo obsoleto (detalle ${a.id_detalle}); genera la sugerencia de nuevo`,
        });
      }
      await conexion.execute(
        "INSERT INTO asignacion (id_detalle, id_necesidad, cantidad_asignada, fecha_asignacion) VALUES (?, ?, ?, CURDATE())",
        [a.id_detalle, a.id_necesidad, cantidad]
      );
      await conexion.execute(
        "UPDATE necesidad SET estado = ? WHERE id_necesidad = ?",
        [cantidad === nec.pendiente ? "CUBIERTA" : "PARCIAL", a.id_necesidad]
      );
    }

    await conexion.commit();
    res.status(201).json({ mensaje: `${asignaciones.length} asignaciones aplicadas`, aplicadas: asignaciones.length });
  } catch (e) {
    await conexion.rollback();
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  } finally {
    conexion.release();
  }
});

// GET /api/donaciones/pendientes — detalles con saldo por asignar (COORDINADOR)
router.get("/pendientes", requiereAuth, requiereRol("COORDINADOR"), async (_req, res) => {
  try {
    const [filas] = await pool.execute(
      `SELECT dd.id_detalle, i.nombre AS item, i.unidad_medida, u.nombre AS donante,
              c.nombre AS categoria,
              dd.cantidad AS total_donado,
              dd.cantidad - COALESCE(SUM(asg.cantidad_asignada), 0) AS disponible
       FROM donacion_detalle dd
       JOIN donacion d ON d.id_donacion = dd.id_donacion
       JOIN usuario u  ON u.id_usuario = d.id_donante
       JOIN item i     ON i.id_item = dd.id_item
       JOIN categoria_item c ON c.id_categoria = i.id_categoria
       LEFT JOIN asignacion asg ON asg.id_detalle = dd.id_detalle
       GROUP BY dd.id_detalle, i.nombre, i.unidad_medida, u.nombre, c.nombre, dd.cantidad
       HAVING disponible > 0
       ORDER BY dd.id_detalle`
    );
    res.json(filas);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
