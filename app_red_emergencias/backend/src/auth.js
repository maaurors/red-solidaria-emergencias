// Autenticacion JWT y autorizacion por rol.
const jwt = require("jsonwebtoken");
require("dotenv").config();

const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET === "cambiar_por_una_clave_larga_y_aleatoria") {
  // Falla al arrancar si la clave no fue configurada: mejor un error
  // temprano que tokens firmados con una clave publica conocida.
  throw new Error("JWT_SECRET no configurado. Ver .env.example");
}

function firmarToken(usuario) {
  // Solo lo minimo necesario dentro del token; expira en 12 horas
  return jwt.sign(
    { id: usuario.id_usuario, rol: usuario.rol, nombre: usuario.nombre },
    SECRET,
    { expiresIn: "12h" }
  );
}

// Middleware: exige un token valido en Authorization: Bearer <token>
function requiereAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Token requerido" });
  try {
    req.usuario = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token invalido o expirado" });
  }
}

// Middleware: exige ademas uno de los roles indicados
function requiereRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario) return res.status(401).json({ error: "No autenticado" });
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: "No autorizado para esta operacion" });
    }
    next();
  };
}

module.exports = { firmarToken, requiereAuth, requiereRol };
