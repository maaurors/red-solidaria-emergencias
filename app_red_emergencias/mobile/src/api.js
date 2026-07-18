// Cliente HTTP profesional: retry automático, cache, detección de
// expiración de sesión, timeout configurable.
export const API_URL = "http://192.168.1.109:3000";

const TIMEOUT_MS = 8000;
const CACHE_MS = 4000;
const MAX_REINTENTOS = 1;

let token = null;
let alExpirar = null;
const cacheLecturas = new Map();

export function guardarToken(t) { token = t; cacheLecturas.clear(); }
export function cerrarSesion() { token = null; cacheLecturas.clear(); }
export function registrarExpiracion(fn) { alExpirar = fn; }
export function obtenerToken() { return token; }

// Parsear info del token JWT sin libreria (solo payload)
export function infoToken() {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch { return null; }
}

// Tiempo restante de sesion en minutos
export function minutosRestantes() {
  const info = infoToken();
  if (!info?.exp) return 0;
  return Math.max(0, Math.round((info.exp * 1000 - Date.now()) / 60000));
}

async function fetchConTimeout(url, opciones) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS);

  try {
    const respuesta = await fetch(url, { ...opciones, signal: controlador.signal });
    return respuesta;
  } finally {
    clearTimeout(temporizador);
  }
}

export async function api(ruta, opciones = {}) {
  const esLectura = !opciones.method || opciones.method === "GET";

  // Cache: evita repetir la misma consulta al cambiar rapido de pestana
  if (esLectura && !opciones.sinCache) {
    const enCache = cacheLecturas.get(ruta);
    if (enCache && Date.now() - enCache.hora < CACHE_MS) return enCache.datos;
  }

  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let respuesta;
  let intentos = 0;
  const maxIntentos = esLectura ? MAX_REINTENTOS + 1 : 1;

  while (intentos < maxIntentos) {
    intentos++;
    try {
      respuesta = await fetchConTimeout(API_URL + "/api" + ruta, {
        ...opciones,
        headers,
      });
      break; // exito: salir del loop
    } catch (e) {
      if (intentos >= maxIntentos) {
        throw new Error(
          e.name === "AbortError"
            ? "El servidor no responde. Revisa tu conexión"
            : "Sin conexión con el servidor"
        );
      }
      // Esperar un poco antes de reintentar
      await new Promise(r => setTimeout(r, 500 * intentos));
    }
  }

  let cuerpo = null;
  try { cuerpo = await respuesta.json(); } catch { cuerpo = null; }

  // Sesion expirada: limpiar y avisar a la App
  if (respuesta.status === 401 && token && !ruta.startsWith("/auth/")) {
    cerrarSesion();
    if (alExpirar) alExpirar();
    throw new Error("Tu sesión expiró. Vuelve a entrar");
  }

  if (!respuesta.ok) {
    throw new Error(cuerpo?.error || `Error ${respuesta.status}`);
  }

  if (esLectura) cacheLecturas.set(ruta, { hora: Date.now(), datos: cuerpo });
  return cuerpo;
}

// Utilidad: timestamp relativo ("hace 2 min", "hace 1 hora")
export function tiempoRelativo(fecha) {
  const ahora = new Date();
  const entonces = new Date(fecha);
  const diff = Math.floor((ahora - entonces) / 1000);

  if (diff < 60) return "Justo ahora";
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  return `Hace ${Math.floor(diff / 86400)} d`;
}
