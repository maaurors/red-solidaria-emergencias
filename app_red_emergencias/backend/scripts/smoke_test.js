// Prueba de humo de la API completa. Requiere el servidor corriendo
// y la base cargada con red_emergencias.sql + 01_auth.sql + seed.
// Uso: npm test
const BASE = process.env.API_URL || "http://localhost:3000";

let fallos = 0;
function verificar(nombre, condicion, extra = "") {
  if (condicion) { console.log(`OK   ${nombre}`); }
  else { fallos += 1; console.log(`FALLO ${nombre} ${extra}`); }
}

async function pedir(ruta, opciones = {}, token = null) {
  const headers = { "Content-Type": "application/json", ...(opciones.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(BASE + ruta, { ...opciones, headers });
  let cuerpo = null;
  try { cuerpo = await r.json(); } catch { /* respuesta sin JSON */ }
  return { status: r.status, cuerpo };
}

async function main() {
  // 1. Salud
  let r = await pedir("/api/salud");
  verificar("GET /api/salud responde 200", r.status === 200);

  // 2. Endpoints protegidos rechazan sin token
  r = await pedir("/api/deficit");
  verificar("GET /api/deficit sin token responde 401", r.status === 401);

  // 3. Login con credenciales invalidas
  r = await pedir("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "noexiste@mail.cl", password: "malamala" }) });
  verificar("Login invalido responde 401", r.status === 401);

  // 4. Login de cada rol (usuarios del script del curso, password demo1234)
  const tokens = {};
  for (const [email, rol] of [
    ["carla.soto@mail.cl", "COORDINADOR"],
    ["maria.f@mail.cl", "DONANTE"],
    ["ana.morales@mail.cl", "VOLUNTARIO"],
  ]) {
    r = await pedir("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password: "demo1234" }) });
    verificar(`Login ${rol} responde 200 con token`, r.status === 200 && r.cuerpo?.token, JSON.stringify(r.cuerpo));
    tokens[rol] = r.cuerpo?.token;
  }

  // 5. Deficit con token (acepta forma nueva {filas, resumen} o arreglo)
  const extraerFilas = (cuerpo) => Array.isArray(cuerpo) ? cuerpo : (cuerpo?.filas || []);
  r = await pedir("/api/deficit", {}, tokens.DONANTE);
  let filasDeficit = extraerFilas(r.cuerpo);
  verificar("GET /api/deficit responde 200 con filas", r.status === 200 && filasDeficit.length > 0);
  const deficitAntes = filasDeficit.find(f => f.id_necesidad === 2)?.deficit;

  // 6. Catalogo de items y albergues
  r = await pedir("/api/items", {}, tokens.DONANTE);
  verificar("GET /api/items responde 200", r.status === 200 && r.cuerpo.length >= 4);
  r = await pedir("/api/albergues", {}, tokens.VOLUNTARIO);
  verificar("GET /api/albergues responde 200", r.status === 200 && r.cuerpo.length >= 3);

  // 7. Control de acceso por rol: un donante no puede asignar
  r = await pedir("/api/donaciones/asignar", { method: "POST", body: JSON.stringify({ id_detalle: 1, id_necesidad: 1, cantidad: 1 }) }, tokens.DONANTE);
  verificar("DONANTE no puede asignar (403)", r.status === 403);

  // 8. Registrar una donacion como DONANTE (frazadas, id_item 3)
  r = await pedir("/api/donaciones", { method: "POST", body: JSON.stringify({ items: [{ id_item: 3, cantidad: 10 }] }) }, tokens.DONANTE);
  verificar("POST /api/donaciones responde 201", r.status === 201, JSON.stringify(r.cuerpo));

  // 9. Donacion invalida rechazada
  r = await pedir("/api/donaciones", { method: "POST", body: JSON.stringify({ items: [{ id_item: 3, cantidad: -5 }] }) }, tokens.DONANTE);
  verificar("Donacion con cantidad negativa rechazada (400)", r.status === 400);

  // 10. Coordinador ve pendientes y asigna respetando invariantes
  r = await pedir("/api/donaciones/pendientes", {}, tokens.COORDINADOR);
  verificar("GET pendientes responde 200", r.status === 200 && r.cuerpo.length > 0);
  const pendiente = r.cuerpo.find(p => p.item === "Frazadas" && p.disponible >= 10);
  verificar("Existe detalle de frazadas disponible", Boolean(pendiente));

  if (pendiente) {
    // Asignar 10 frazadas a la necesidad 2 (Gimnasio pide 150 frazadas)
    r = await pedir("/api/donaciones/asignar", { method: "POST", body: JSON.stringify({ id_detalle: pendiente.id_detalle, id_necesidad: 2, cantidad: 10 }) }, tokens.COORDINADOR);
    verificar("Asignacion valida responde 201", r.status === 201, JSON.stringify(r.cuerpo));

    // Sobreasignacion rechazada (invariante 1)
    r = await pedir("/api/donaciones/asignar", { method: "POST", body: JSON.stringify({ id_detalle: pendiente.id_detalle, id_necesidad: 2, cantidad: 99999 }) }, tokens.COORDINADOR);
    verificar("Sobreasignacion rechazada (409)", r.status === 409);
  }

  // 11. El deficit BAJO tras la asignacion: dato derivado en tiempo real
  r = await pedir("/api/deficit", {}, tokens.DONANTE);
  const deficitDespues = extraerFilas(r.cuerpo).find(f => f.id_necesidad === 2)?.deficit;
  verificar("Deficit de frazadas disminuyo en 10", deficitAntes - deficitDespues === 10,
    `antes=${deficitAntes} despues=${deficitDespues}`);

  // 12. Trazabilidad del donante
  r = await pedir("/api/donaciones/mias", {}, tokens.DONANTE);
  verificar("GET /api/donaciones/mias responde 200", r.status === 200 && Array.isArray(r.cuerpo?.donaciones));

  // 13. Turnos: agendar y duplicado rechazado por UNIQUE del modelo
  const fecha = "2026-08-01";
  r = await pedir("/api/turnos", { method: "POST", body: JSON.stringify({ id_albergue: 1, fecha, bloque: "TARDE" }) }, tokens.VOLUNTARIO);
  verificar("POST /api/turnos responde 201 (o 409 si ya existe)", r.status === 201 || r.status === 409);
  r = await pedir("/api/turnos", { method: "POST", body: JSON.stringify({ id_albergue: 2, fecha, bloque: "TARDE" }) }, tokens.VOLUNTARIO);
  verificar("Turno duplicado mismo bloque rechazado (409)", r.status === 409);

  // 14. Registro de usuario nuevo y login inmediato
  const rutAleatorio = `${Math.floor(10000000 + Math.random() * 9000000)}-1`;
  const emailNuevo = `test${Date.now()}@mail.cl`;
  r = await pedir("/api/auth/registro", { method: "POST", body: JSON.stringify({ rut: rutAleatorio, nombre: "Usuario Prueba", email: emailNuevo, rol: "DONANTE", password: "clave12345" }) });
  verificar("Registro de donante responde 201", r.status === 201, JSON.stringify(r.cuerpo));

  // 15. Nadie puede registrarse como COORDINADOR
  r = await pedir("/api/auth/registro", { method: "POST", body: JSON.stringify({ rut: "11111111-1", nombre: "Atacante", email: "hacker@mail.cl", rol: "COORDINADOR", password: "clave12345" }) });
  verificar("Registro como COORDINADOR rechazado (400)", r.status === 400);

  // 16. Mapa semaforo: albergues con coordenadas y estado calculado
  r = await pedir("/api/albergues/mapa", {}, tokens.DONANTE);
  verificar("GET /api/albergues/mapa responde 200 con coordenadas",
    r.status === 200 && r.cuerpo.length >= 3 && r.cuerpo.every(a => a.latitud && a.semaforo));
  const rojo = (r.cuerpo || []).find(a => a.semaforo === "ROJO");
  verificar("Existe al menos un albergue en ROJO (deficit ALTA)", Boolean(rojo));

  // 17. Estadisticas en vivo
  r = await pedir("/api/estadisticas", {}, tokens.VOLUNTARIO);
  verificar("GET /api/estadisticas responde 200 con secciones",
    r.status === 200 && r.cuerpo.totales && Array.isArray(r.cuerpo.cobertura) && Array.isArray(r.cuerpo.topDonantes));

  // 18. Escaneo QR: crear donacion nueva y escanearla
  r = await pedir("/api/donaciones", { method: "POST", body: JSON.stringify({ items: [{ id_item: 2, cantidad: 5 }] }) }, tokens.DONANTE);
  const idNueva = r.cuerpo?.id_donacion;
  verificar("Donacion para escanear creada", Boolean(idNueva));
  r = await pedir("/api/donaciones/escanear", { method: "POST", body: JSON.stringify({ codigo: `RSE-DON-${idNueva}` }) }, tokens.COORDINADOR);
  verificar("Escaneo QR valido responde 200 y pasa a EN_BODEGA",
    r.status === 200 && r.cuerpo?.donacion?.estado === "EN_BODEGA", JSON.stringify(r.cuerpo));
  r = await pedir("/api/donaciones/escanear", { method: "POST", body: JSON.stringify({ codigo: `RSE-DON-${idNueva}` }) }, tokens.COORDINADOR);
  verificar("Re-escaneo informa sin duplicar", r.status === 200 && /ya estaba/.test(r.cuerpo?.mensaje || ""));
  r = await pedir("/api/donaciones/escanear", { method: "POST", body: JSON.stringify({ codigo: "CODIGO-FALSO" }) }, tokens.COORDINADOR);
  verificar("Codigo QR invalido rechazado (400)", r.status === 400);
  r = await pedir("/api/donaciones/escanear", { method: "POST", body: JSON.stringify({ codigo: `RSE-DON-${idNueva}` }) }, tokens.DONANTE);
  verificar("DONANTE no puede escanear (403)", r.status === 403);

  // 19. Acciones privilegiadas bloqueadas para roles no autorizados
  r = await pedir("/api/emergencias", { method: "POST", body: JSON.stringify({ nombre: "Falsa", tipo: "OTRO", region: "RM" }) }, tokens.DONANTE);
  verificar("DONANTE no puede crear emergencias (403)", r.status === 403);
  r = await pedir("/api/albergues", { method: "POST", body: JSON.stringify({ nombre: "Falso", comuna: "X", capacidad: 10, latitud: -33, longitud: -70 }) }, tokens.VOLUNTARIO);
  verificar("VOLUNTARIO no puede crear albergues (403)", r.status === 403);

  // 20. Endpoints nuevos de estadisticas responden
  r = await pedir("/api/estadisticas/kpi", {}, tokens.DONANTE);
  verificar("GET /api/estadisticas/kpi responde 200", r.status === 200);
  r = await pedir("/api/estadisticas/ranking", {}, tokens.DONANTE);
  verificar("GET /api/estadisticas/ranking responde 200", r.status === 200);
  r = await pedir("/api/turnos/disponibilidad?id_albergue=1&fecha=2026-02-15", {}, tokens.VOLUNTARIO);
  verificar("GET /api/turnos/disponibilidad responde 200 con 3 bloques", r.status === 200 && r.cuerpo?.length === 3);

  // 21. Asignacion inteligente: sugerencias coherentes y aplicables
  r = await pedir("/api/donaciones/sugerencias", {}, tokens.COORDINADOR);
  verificar("GET sugerencias responde 200 con plan", r.status === 200 && Array.isArray(r.cuerpo?.plan));
  verificar("Cada sugerencia trae motivo y cantidad positiva",
    (r.cuerpo?.plan || []).every(p => p.cantidad > 0 && typeof p.motivo === "string"));
  const planPrevio = r.cuerpo?.plan || [];
  r = await pedir("/api/donaciones/sugerencias", {}, tokens.DONANTE);
  verificar("DONANTE no puede ver sugerencias (403)", r.status === 403);

  if (planPrevio.length > 0) {
    r = await pedir("/api/donaciones/asignar-lote", { method: "POST", body: JSON.stringify({ asignaciones: planPrevio.slice(0, 2).map(p => ({ id_detalle: p.id_detalle, id_necesidad: p.id_necesidad, cantidad: p.cantidad })) }) }, tokens.COORDINADOR);
    verificar("Asignar-lote aplica el plan (201)", r.status === 201, JSON.stringify(r.cuerpo));
  }
  r = await pedir("/api/donaciones/asignar-lote", { method: "POST", body: JSON.stringify({ asignaciones: [{ id_detalle: 1, id_necesidad: 1, cantidad: 999999 }] }) }, tokens.COORDINADOR);
  verificar("Asignar-lote rechaza plan obsoleto o excedido (409)", r.status === 409);
  r = await pedir("/api/donaciones/asignar-lote", { method: "POST", body: JSON.stringify({ asignaciones: [] }) }, tokens.COORDINADOR);
  verificar("Asignar-lote rechaza lote vacio (400)", r.status === 400);

  // 22. Auditoria: los triggers registraron las operaciones
  r = await pedir("/api/auditoria", {}, tokens.COORDINADOR);
  verificar("GET /api/auditoria responde 200 con registros", r.status === 200 && Array.isArray(r.cuerpo) && r.cuerpo.length > 0);
  verificar("La auditoria registro asignaciones via trigger",
    (r.cuerpo || []).some(a => a.tabla_afectada === "asignacion" && a.accion === "ASIGNADA"));
  verificar("La auditoria registro cambios de estado",
    (r.cuerpo || []).some(a => a.accion === "CAMBIO_ESTADO"));
  r = await pedir("/api/auditoria", {}, tokens.DONANTE);
  verificar("DONANTE no puede ver auditoria (403)", r.status === 403);

  // 22b. Fondo Transparente: campana, aportes, egresos y cadena de integridad
  r = await pedir("/api/fondo/campanas", { method: "POST", body: JSON.stringify({ nombre: "Frazadas Valparaiso", meta_monto: 500000, id_emergencia: 1 }) }, tokens.COORDINADOR);
  const idCampana = r.cuerpo?.id_campana;
  verificar("Campana creada (201)", r.status === 201 && idCampana);
  r = await pedir("/api/fondo/campanas", { method: "POST", body: JSON.stringify({ nombre: "X", meta_monto: 1000, id_emergencia: 1 }) }, tokens.DONANTE);
  verificar("DONANTE no puede crear campanas (403)", r.status === 403);

  r = await pedir("/api/fondo/aportes", { method: "POST", body: JSON.stringify({ id_campana: idCampana, monto: 100000, foto: "data:image/jpeg;base64,comprobante" }) }, tokens.DONANTE);
  verificar("Aporte registrado con hash (201)", r.status === 201 && /^[a-f0-9]{64}$/.test(r.cuerpo?.hash || ""));

  r = await pedir("/api/fondo/egresos", { method: "POST", body: JSON.stringify({ id_campana: idCampana, monto: 999999, proveedor: "Super", foto: "data:image/jpeg;base64,boleta" }) }, tokens.COORDINADOR);
  verificar("Egreso sobre el saldo rechazado (409)", r.status === 409);

  r = await pedir("/api/fondo/egresos", { method: "POST", body: JSON.stringify({ id_campana: idCampana, monto: 40000, proveedor: "Supermercado", descripcion: "20 frazadas", foto: "data:image/jpeg;base64,boleta", items: [{ id_item: 3, cantidad: 20 }] }) }, tokens.COORDINADOR);
  verificar("Egreso con boleta e items responde 201 con donacion", r.status === 201 && r.cuerpo?.id_donacion, JSON.stringify(r.cuerpo));
  r = await pedir("/api/fondo/egresos", { method: "POST", body: JSON.stringify({ id_campana: idCampana, monto: 1000, proveedor: "X", foto: "f" }) }, tokens.DONANTE);
  verificar("DONANTE no puede registrar egresos (403)", r.status === 403);

  r = await pedir("/api/fondo/campanas", {}, tokens.DONANTE);
  const campanaResumen = (r.cuerpo || []).find(c => c.id_campana === idCampana);
  verificar("Resumen de campana: recaudado 100000, gastado 40000, saldo 60000",
    campanaResumen && Number(campanaResumen.recaudado) === 100000 && Number(campanaResumen.gastado) === 40000 && Number(campanaResumen.saldo) === 60000,
    JSON.stringify(campanaResumen));

  r = await pedir(`/api/fondo/campanas/${idCampana}`, {}, tokens.DONANTE);
  verificar("Libro mayor de campana responde con movimientos", r.status === 200 && r.cuerpo.length >= 2);
  const movConFoto = (r.cuerpo || []).find(m => m.tiene_foto);
  r = await pedir(`/api/fondo/movimientos/${movConFoto?.id_movimiento}/foto`, {}, tokens.DONANTE);
  verificar("Foto de boleta recuperable con su hash", r.status === 200 && r.cuerpo?.hash_foto);

  r = await pedir("/api/fondo/verificar", {}, tokens.DONANTE);
  verificar("Cadena de integridad verificada", r.status === 200 && r.cuerpo?.integra === true, JSON.stringify(r.cuerpo));

  // 23. SSO de Google: validaciones del endpoint
  r = await pedir("/api/auth/google", { method: "POST", body: JSON.stringify({}) });
  verificar("Google sin id_token rechazado (400)", r.status === 400);
  r = await pedir("/api/auth/google", { method: "POST", body: JSON.stringify({ id_token: "token-falso" }) });
  verificar("Google con token invalido rechazado (401/503)", r.status === 401 || r.status === 503);

  console.log(fallos === 0 ? "\nTODAS LAS PRUEBAS PASARON" : `\n${fallos} PRUEBAS FALLARON`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
