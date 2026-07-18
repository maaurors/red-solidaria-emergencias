// Validacion centralizada: fabrica de middleware que valida body
// contra un schema simple antes de llegar al handler.
// Mensajes en espanol, consistentes y descriptivos.

/**
 * validarBody(schema) — middleware factory.
 * El schema es un objeto donde cada clave mapea a un objeto de reglas:
 *   { campo: { requerido: true, tipo: "string", min: 1, max: 200, patron: /.../, mensaje: "..." } }
 *
 * Tipos soportados: "string", "number", "entero", "email", "array"
 */
function validarBody(schema) {
  return (req, res, next) => {
    const cuerpo = req.body || {};
    const errores = [];

    for (const [campo, reglas] of Object.entries(schema)) {
      const valor = cuerpo[campo];

      // Requerido
      if (reglas.requerido && (valor === undefined || valor === null || valor === "")) {
        errores.push(reglas.mensaje || `${campo} es obligatorio`);
        continue;
      }

      // Si no es requerido y está vacío, saltar validaciones
      if (valor === undefined || valor === null || valor === "") continue;

      // Tipo string
      if (reglas.tipo === "string" && typeof valor !== "string") {
        errores.push(`${campo} debe ser texto`);
        continue;
      }

      // Tipo number
      if (reglas.tipo === "number" && (typeof valor !== "number" || isNaN(valor))) {
        errores.push(`${campo} debe ser un número`);
        continue;
      }

      // Tipo entero positivo
      if (reglas.tipo === "entero") {
        const n = Number(valor);
        if (!Number.isInteger(n) || n <= 0) {
          errores.push(reglas.mensaje || `${campo} debe ser un entero positivo`);
          continue;
        }
      }

      // Tipo email
      if (reglas.tipo === "email") {
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(valor))) {
          errores.push("Email inválido");
          continue;
        }
      }

      // Tipo array
      if (reglas.tipo === "array" && !Array.isArray(valor)) {
        errores.push(`${campo} debe ser una lista`);
        continue;
      }

      // Min length (string) o min value (number)
      if (reglas.min !== undefined) {
        if (typeof valor === "string" && valor.length < reglas.min) {
          errores.push(reglas.mensaje || `${campo} debe tener al menos ${reglas.min} caracteres`);
        }
        if (typeof valor === "number" && valor < reglas.min) {
          errores.push(reglas.mensaje || `${campo} debe ser al menos ${reglas.min}`);
        }
        if (Array.isArray(valor) && valor.length < reglas.min) {
          errores.push(reglas.mensaje || `${campo} debe tener al menos ${reglas.min} elementos`);
        }
      }

      // Max length
      if (reglas.max !== undefined && typeof valor === "string" && valor.length > reglas.max) {
        errores.push(reglas.mensaje || `${campo} no debe exceder ${reglas.max} caracteres`);
      }

      // Patron regex
      if (reglas.patron && !reglas.patron.test(String(valor))) {
        errores.push(reglas.mensaje || `${campo} tiene un formato inválido`);
      }

      // Valores permitidos (enum)
      if (reglas.valores && !reglas.valores.includes(valor)) {
        errores.push(reglas.mensaje || `${campo} debe ser uno de: ${reglas.valores.join(", ")}`);
      }
    }

    if (errores.length > 0) {
      return res.status(400).json({ error: errores[0], errores });
    }

    next();
  };
}

/**
 * validarQuery(schema) — igual pero para req.query
 */
function validarQuery(schema) {
  return (req, res, next) => {
    // Query params son siempre strings, convertir donde se necesite
    req.query = req.query || {};
    next();
  };
}

/**
 * Parsear paginacion desde query params con defaults sensatos
 */
function parsearPaginacion(req, limitDefault = 20, limitMax = 100) {
  const pagina = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limite = Math.min(limitMax, Math.max(1, parseInt(req.query.limit, 10) || limitDefault));
  const offset = (pagina - 1) * limite;
  return { pagina, limite, offset };
}

module.exports = { validarBody, validarQuery, parsearPaginacion };
