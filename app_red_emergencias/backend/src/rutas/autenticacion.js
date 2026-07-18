// Registro e inicio de sesion.
const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db");
const { firmarToken } = require("../auth");

const router = express.Router();

const FORMATO_RUT = /^[0-9]{7,8}-[0-9K]$/;
const FORMATO_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// POST /api/auth/registro
// Solo permite crear DONANTE o VOLUNTARIO. Los COORDINADOR se crean
// por administracion: nadie puede autoasignarse un rol privilegiado.
router.post("/registro", async (req, res) => {
  const { rut, nombre, email, telefono, rol, password } = req.body || {};

  if (!rut || !nombre || !email || !rol || !password) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }
  if (!["DONANTE", "VOLUNTARIO"].includes(rol)) {
    return res.status(400).json({ error: "Rol no permitido en el registro" });
  }
  if (!FORMATO_RUT.test(rut)) {
    return res.status(400).json({ error: "RUT invalido. Formato: 12345678-9, sin puntos" });
  }
  if (!FORMATO_EMAIL.test(email)) {
    return res.status(400).json({ error: "Email invalido" });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: "La contrasena debe tener al menos 8 caracteres" });
  }

  try {
    const hash = await bcrypt.hash(String(password), 10);
    const [resultado] = await pool.execute(
      `INSERT INTO usuario (rut, nombre, email, telefono, rol, fecha_registro, password_hash)
       VALUES (?, ?, ?, ?, ?, CURDATE(), ?)`,
      [rut, nombre.trim(), email.toLowerCase().trim(), telefono || null, rol, hash]
    );
    const usuario = { id_usuario: resultado.insertId, rol, nombre: nombre.trim() };
    return res.status(201).json({ token: firmarToken(usuario), rol, nombre: usuario.nombre });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "El RUT o email ya esta registrado" });
    }
    if (e.code === "ER_CHECK_CONSTRAINT_VIOLATED" || e.errno === 4025) {
      return res.status(400).json({ error: "Datos rechazados por validacion de la base de datos" });
    }
    console.error(e);
    return res.status(500).json({ error: "Error interno" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email y contrasena requeridos" });
  }
  try {
    const [filas] = await pool.execute(
      "SELECT id_usuario, nombre, rol, password_hash, avatar FROM usuario WHERE email = ?",
      [email.toLowerCase().trim()]
    );
    // Mensaje identico exista o no el usuario: no revelar cuales
    // emails estan registrados (evita enumeracion de cuentas).
    const generico = { error: "Credenciales incorrectas" };
    if (filas.length === 0) return res.status(401).json(generico);

    const usuario = filas[0];
    if (!usuario.password_hash) return res.status(401).json(generico);

    const ok = await bcrypt.compare(String(password), usuario.password_hash);
    if (!ok) return res.status(401).json(generico);

    return res.json({ token: firmarToken(usuario), rol: usuario.rol, nombre: usuario.nombre, avatar: usuario.avatar });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error interno" });
  }
});

const { requiereAuth } = require("../auth");

// POST /api/auth/perfil
router.post("/perfil", requiereAuth, async (req, res) => {
  const { avatar } = req.body || {};
  try {
    await pool.execute("UPDATE usuario SET avatar = ? WHERE id_usuario = ?", [
      avatar || null,
      req.usuario.id
    ]);
    res.json({ mensaje: "Perfil actualizado correctamente", avatar });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error interno al actualizar perfil" });
  }
});

// POST /api/auth/google  { id_token }
// El cliente obtiene el id_token de Google; el servidor lo verifica
// contra Google y valida que fue emitido para ESTA aplicacion (aud).
// Nunca se confia en datos que declare el cliente.
router.post("/google", async (req, res) => {
  const idToken = String(req.body?.id_token || "");
  if (!idToken) {
    return res.status(400).json({ error: "id_token requerido" });
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({ error: "Acceso con Google no configurado en el servidor" });
  }
  try {
    const verificacion = await fetch(
      "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken)
    );
    if (!verificacion.ok) {
      return res.status(401).json({ error: "Token de Google invalido" });
    }
    const datos = await verificacion.json();

    if (datos.aud !== clientId) {
      return res.status(401).json({ error: "Token emitido para otra aplicacion" });
    }
    if (datos.email_verified !== "true" && datos.email_verified !== true) {
      return res.status(401).json({ error: "El email de Google no esta verificado" });
    }

    const [existentes] = await pool.execute(
      "SELECT id_usuario, nombre, rol, avatar FROM usuario WHERE google_sub = ? OR email = ?",
      [datos.sub, datos.email.toLowerCase()]
    );

    let usuario;
    if (existentes.length > 0) {
      usuario = existentes[0];
      await pool.execute(
        "UPDATE usuario SET google_sub = ? WHERE id_usuario = ?",
        [datos.sub, usuario.id_usuario]
      );
    } else {
      const [resultado] = await pool.execute(
        `INSERT INTO usuario (nombre, email, rol, fecha_registro, google_sub)
         VALUES (?, ?, 'DONANTE', CURDATE(), ?)`,
        [datos.name || datos.email.split("@")[0], datos.email.toLowerCase(), datos.sub]
      );
      usuario = { id_usuario: resultado.insertId, nombre: datos.name || datos.email, rol: "DONANTE" };
    }

    return res.json({
      token: firmarToken(usuario),
      rol: usuario.rol,
      nombre: usuario.nombre,
      avatar: usuario.avatar || datos.picture || null,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
