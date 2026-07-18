// Consultas de lectura: emergencias, albergues, items, deficit.
// Version profesional: filtros, paginacion, detalle, try-catch completo.
const express = require("express");
const pool = require("../db");
const { requiereAuth } = require("../auth");
const { parsearPaginacion } = require("../middleware/validar");
const { requiereRol } = require("../auth");

const router = express.Router();

// GET /api/emergencias — emergencias activas
router.get("/emergencias", requiereAuth, async (_req, res) => {
  try {
    const [filas] = await pool.execute(
      `SELECT id_emergencia, nombre, tipo, region, fecha_inicio
       FROM emergencia WHERE estado = 'ACTIVA' ORDER BY fecha_inicio DESC`
    );
    res.json(filas);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

// POST /api/emergencias — crear nueva emergencia
// Solo COORDINADOR: declarar una emergencia es una accion privilegiada
router.post("/emergencias", requiereAuth, requiereRol("COORDINADOR"), async (req, res) => {
  try {
    const { nombre, tipo, region } = req.body;
    
    if (!nombre || !tipo || !region) {
      return res.status(400).json({ error: "Faltan datos obligatorios (nombre, tipo, region)" });
    }

    const tiposValidos = ['INCENDIO', 'TERREMOTO', 'ALUVION', 'INUNDACION', 'OTRO'];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({ error: "Tipo de emergencia no válido" });
    }

    const [result] = await pool.execute(
      `INSERT INTO emergencia (nombre, tipo, region, fecha_inicio, estado)
       VALUES (?, ?, ?, CURDATE(), 'ACTIVA')`,
      [nombre, tipo, region]
    );

    res.json({ success: true, id_emergencia: result.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno al crear emergencia" });
  }
});

// GET /api/emergencias/:id/resumen — resumen ejecutivo de una emergencia
router.get("/emergencias/:id/resumen", requiereAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [[emergencia]] = await pool.execute(
      "SELECT * FROM emergencia WHERE id_emergencia = ?", [id]
    );
    if (!emergencia) return res.status(404).json({ error: "Emergencia no encontrada" });

    const [[stats]] = await pool.execute(
      `SELECT COUNT(DISTINCT a.id_albergue) AS total_albergues,
              COALESCE(SUM(n.cantidad_solicitada), 0) AS total_solicitado,
              COALESCE(SUM(asig.total), 0) AS total_asignado
       FROM albergue a
       LEFT JOIN necesidad n ON n.id_albergue = a.id_albergue
       LEFT JOIN (
         SELECT id_necesidad, SUM(cantidad_asignada) AS total
         FROM asignacion GROUP BY id_necesidad
       ) asig ON asig.id_necesidad = n.id_necesidad
       WHERE a.id_emergencia = ?`, [id]
    );

    const cobertura = stats.total_solicitado > 0
      ? Math.round((stats.total_asignado / stats.total_solicitado) * 100)
      : 100;

    res.json({ emergencia, ...stats, cobertura });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

// POST /api/albergues — crear un nuevo acopio comunitario
router.post("/albergues", requiereAuth, requiereRol("COORDINADOR"), async (req, res) => {
  try {
    const { nombre, direccion, comuna, capacidad, latitud, longitud, id_emergencia } = req.body;

    // Validaciones basicas
    if (!nombre || !comuna || !capacidad || !latitud || !longitud) {
      return res.status(400).json({ error: "Faltan datos requeridos (nombre, comuna, capacidad, latitud, longitud)" });
    }

    // El id viene del token verificado, y el payload usa la clave "id"
    const id_coordinador = req.usuario.id;
    const emergencia_final = id_emergencia || 1; // Default a Incendio Cerro Cordillera
    const dir_final = direccion || comuna; // Si no hay direccion especifica, usar comuna

    const [result] = await pool.execute(
      `INSERT INTO albergue (nombre, direccion, comuna, capacidad, estado, id_emergencia, id_coordinador, latitud, longitud)
       VALUES (?, ?, ?, ?, 'ABIERTO', ?, ?, ?, ?)`,
      [nombre, dir_final, comuna, capacidad, emergencia_final, id_coordinador, latitud, longitud]
    );

    res.status(201).json({ 
      mensaje: "Acopio reportado exitosamente", 
      id_albergue: result.insertId 
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno al crear el acopio" });
  }
});

// GET /api/albergues — albergues abiertos con su emergencia
router.get("/albergues", requiereAuth, async (_req, res) => {
  try {
    const [filas] = await pool.execute(
      `SELECT a.id_albergue, a.nombre, a.comuna, a.capacidad,
              e.nombre AS emergencia, e.tipo
       FROM albergue a
       JOIN emergencia e ON e.id_emergencia = a.id_emergencia
       WHERE a.estado = 'ABIERTO'
       ORDER BY e.fecha_inicio DESC, a.nombre`
    );
    res.json(filas);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

// GET /api/albergues/mapa — albergues con coordenadas y semaforo
router.get("/albergues/mapa", requiereAuth, async (_req, res) => {
  try {
    const [filas] = await pool.execute(
      `SELECT a.id_albergue, a.nombre, a.comuna, a.latitud, a.longitud, a.capacidad,
              e.nombre AS emergencia, e.tipo AS tipo_emergencia,
              COALESCE(SUM(CASE WHEN pend.deficit > 0 AND pend.prioridad = 'ALTA' THEN 1 ELSE 0 END), 0) AS altas,
              COALESCE(SUM(CASE WHEN pend.deficit > 0 AND pend.prioridad = 'MEDIA' THEN 1 ELSE 0 END), 0) AS medias,
              COALESCE(SUM(CASE WHEN pend.deficit > 0 THEN 1 ELSE 0 END), 0) AS pendientes
       FROM albergue a
       JOIN emergencia e ON e.id_emergencia = a.id_emergencia
       LEFT JOIN (
         SELECT n.id_albergue, n.prioridad,
                n.cantidad_solicitada - COALESCE(SUM(asg.cantidad_asignada), 0) AS deficit
         FROM necesidad n
         LEFT JOIN asignacion asg ON asg.id_necesidad = n.id_necesidad
         GROUP BY n.id_necesidad, n.id_albergue, n.prioridad, n.cantidad_solicitada
       ) pend ON pend.id_albergue = a.id_albergue
       WHERE a.estado = 'ABIERTO' AND a.latitud IS NOT NULL
       GROUP BY a.id_albergue, a.nombre, a.comuna, a.latitud, a.longitud, a.capacidad, e.nombre, e.tipo`
    );

    // Detalle de lo que falta en cada albergue
    const [detalle] = await pool.execute(
      `SELECT n.id_albergue, i.nombre AS item, n.prioridad,
              c.nombre AS categoria,
              n.cantidad_solicitada,
              COALESCE(SUM(asg.cantidad_asignada), 0) AS recibido,
              n.cantidad_solicitada - COALESCE(SUM(asg.cantidad_asignada), 0) AS deficit
       FROM necesidad n
       JOIN item i ON i.id_item = n.id_item
       JOIN categoria_item c ON c.id_categoria = i.id_categoria
       LEFT JOIN asignacion asg ON asg.id_necesidad = n.id_necesidad
       GROUP BY n.id_necesidad, n.id_albergue, i.nombre, n.prioridad, c.nombre,
                n.cantidad_solicitada
       HAVING deficit > 0`
    );

    const conSemaforo = filas.map((a) => {
      const faltantes = detalle.filter((d) => d.id_albergue === a.id_albergue);
      const totalSolicitado = faltantes.reduce((s, f) => s + f.cantidad_solicitada, 0);
      const totalRecibido = faltantes.reduce((s, f) => s + f.recibido, 0);
      const cobertura = totalSolicitado > 0
        ? Math.round((totalRecibido / (totalRecibido + faltantes.reduce((s, f) => s + f.deficit, 0))) * 100)
        : 100;

      return {
        ...a,
        semaforo: a.altas > 0 ? "ROJO" : a.pendientes > 0 ? "AMARILLO" : "VERDE",
        cobertura,
        faltantes,
      };
    });

    res.json(conSemaforo);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});


// GET /api/albergues/:id — detalle completo de un albergue
router.get("/albergues/:id", requiereAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [[albergue]] = await pool.execute(
      `SELECT a.*, e.nombre AS emergencia, e.tipo AS tipo_emergencia,
              u.nombre AS coordinador_nombre
       FROM albergue a
       JOIN emergencia e ON e.id_emergencia = a.id_emergencia
       LEFT JOIN usuario u ON u.id_usuario = a.id_coordinador
       WHERE a.id_albergue = ?`, [id]
    );
    if (!albergue) return res.status(404).json({ error: "Albergue no encontrado" });

    // Necesidades con cobertura
    const [necesidades] = await pool.execute(
      `SELECT n.id_necesidad, i.nombre AS item, i.unidad_medida,
              n.cantidad_solicitada, n.prioridad, n.estado,
              COALESCE(SUM(asg.cantidad_asignada), 0) AS recibido
       FROM necesidad n
       JOIN item i ON i.id_item = n.id_item
       LEFT JOIN asignacion asg ON asg.id_necesidad = n.id_necesidad
       WHERE n.id_albergue = ?
       GROUP BY n.id_necesidad, i.nombre, i.unidad_medida,
                n.cantidad_solicitada, n.prioridad, n.estado
       ORDER BY FIELD(n.prioridad, 'ALTA','MEDIA','BAJA')`, [id]
    );

    // Voluntarios del dia
    const [voluntarios] = await pool.execute(
      `SELECT u.nombre, t.bloque
       FROM turno t JOIN usuario u ON u.id_usuario = t.id_voluntario
       WHERE t.id_albergue = ? AND t.fecha = CURDATE() AND t.estado <> 'CANCELADO'
       ORDER BY FIELD(t.bloque, 'MANANA','TARDE','NOCHE')`, [id]
    );

    const totalSolicitado = necesidades.reduce((s, n) => s + n.cantidad_solicitada, 0);
    const totalRecibido = necesidades.reduce((s, n) => s + n.recibido, 0);
    const cobertura = totalSolicitado > 0 ? Math.round((totalRecibido / totalSolicitado) * 100) : 100;

    res.json({ ...albergue, necesidades, voluntarios, cobertura });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

// GET /api/items — catalogo para el formulario de donacion
router.get("/items", requiereAuth, async (_req, res) => {
  try {
    const [filas] = await pool.execute(
      `SELECT i.id_item, i.nombre, i.unidad_medida, c.nombre AS categoria, c.id_categoria
       FROM item i JOIN categoria_item c ON c.id_categoria = i.id_categoria
       ORDER BY c.nombre, i.nombre`
    );
    res.json(filas);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

// GET /api/deficit — que falta y donde, con filtros opcionales
// Query params: ?prioridad=ALTA&id_albergue=1&categoria=Alimentos&q=agua
router.get("/deficit", requiereAuth, async (req, res) => {
  try {
    const { prioridad, id_albergue, categoria, q } = req.query;
    let sql = `
      SELECT a.id_albergue,
             a.nombre  AS albergue,
             a.comuna,
             e.nombre  AS emergencia,
             i.nombre  AS item,
             i.unidad_medida,
             c.nombre  AS categoria,
             n.id_necesidad,
             n.cantidad_solicitada,
             COALESCE(SUM(asg.cantidad_asignada), 0) AS recibido,
             n.cantidad_solicitada - COALESCE(SUM(asg.cantidad_asignada), 0) AS deficit,
             n.prioridad
      FROM necesidad n
      JOIN albergue a  ON a.id_albergue = n.id_albergue
      JOIN emergencia e ON e.id_emergencia = a.id_emergencia
      JOIN item i      ON i.id_item = n.id_item
      JOIN categoria_item c ON c.id_categoria = i.id_categoria
      LEFT JOIN asignacion asg ON asg.id_necesidad = n.id_necesidad
      WHERE n.estado <> 'CUBIERTA'`;

    const params = [];

    if (prioridad && ["ALTA", "MEDIA", "BAJA"].includes(prioridad)) {
      sql += ` AND n.prioridad = ?`;
      params.push(prioridad);
    }
    if (id_albergue && Number(id_albergue) > 0) {
      sql += ` AND n.id_albergue = ?`;
      params.push(Number(id_albergue));
    }
    if (categoria) {
      sql += ` AND c.nombre = ?`;
      params.push(categoria);
    }

    sql += ` GROUP BY n.id_necesidad, a.id_albergue, a.nombre, a.comuna, e.nombre,
                      i.nombre, i.unidad_medida, c.nombre, n.cantidad_solicitada, n.prioridad
             HAVING deficit > 0`;

    if (q) {
      sql += ` AND (i.nombre LIKE ? OR a.nombre LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`);
    }

    sql += ` ORDER BY FIELD(n.prioridad, 'ALTA', 'MEDIA', 'BAJA'), deficit DESC`;

    const [filas] = await pool.execute(sql, params);

    // Metadata util para los filtros del frontend
    const resumen = {
      total: filas.length,
      urgentes: filas.filter(f => f.prioridad === "ALTA").length,
      moderadas: filas.filter(f => f.prioridad === "MEDIA").length,
      bajas: filas.filter(f => f.prioridad === "BAJA").length,
    };

    res.json({ filas, resumen });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
