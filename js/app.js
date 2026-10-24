"use strict";

/* =====================================================================
   SEGURIDAD: plantillas HTML con escape por defecto.

   html`...${valor}...` escapa cada valor interpolado salvo que ya sea un
   SafeHTML (otra plantilla html``). Asi un dato malicioso como
   <img src=x onerror=alert(1)> se muestra como texto y nunca se ejecuta.

   setHTML() es el UNICO punto que escribe innerHTML y solo acepta SafeHTML.
   Con Trusted Types activo en la CSP, el navegador rechaza cualquier otra
   asignacion de innerHTML que no pase por la politica "sinvisto".
   ===================================================================== */
class SafeHTML {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderValue(v) {
  if (v instanceof SafeHTML) return v.value;
  if (Array.isArray(v)) return v.map(renderValue).join("");
  if (v === null || v === undefined || v === false) return "";
  return esc(v);
}

function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += renderValue(values[i]) + strings[i + 1];
  return new SafeHTML(out);
}

// La politica solo deja pasar texto que ya fue construido por html``.
const ttPolicy = window.trustedTypes && window.trustedTypes.createPolicy
  ? window.trustedTypes.createPolicy("sinvisto", { createHTML: (s) => s })
  : null;

function setHTML(el, safe) {
  if (!(safe instanceof SafeHTML)) throw new TypeError("setHTML solo acepta contenido creado con html``");
  el.innerHTML = ttPolicy ? ttPolicy.createHTML(safe.value) : safe.value;
}

/* =====================================================================
   Datos de ejemplo. En produccion vienen de una API; se tratan igual que
   datos no confiables: todo pasa por html`` al mostrarse.
   ===================================================================== */
const COMPANIES = [
  { id: "andes", name: "Logística Andes Norte", industry: "Logística y transporte", region: "Antofagasta", color: "#2B54E0",
    rating: 4.1, reviews: 318, ir: 91, medianDays: 4, feedback: 72, pledge: true,
    review: { title: "Procesos claros y te avisan siempre", body: "Tres entrevistas en dos semanas. Al final no quedé, pero me llamaron para explicarme el motivo.", role: "Postulante a analista de rutas", stars: 5 },
    reply: "Gracias por tu comentario. Intentamos cerrar cada proceso con una llamada." },
  { id: "pacifico", name: "Financiera Pacífico Sur", industry: "Servicios financieros", region: "Metropolitana", color: "#7A3FC4",
    rating: 3.2, reviews: 541, ir: 38, medianDays: 0, feedback: 9, pledge: false,
    review: { title: "Buen ambiente, pero desaparecen después de la final", body: "Llegué a entrevista final con gerencia. Nunca más supe nada. Escribí dos veces y no hubo respuesta.", role: "Postulante a ejecutivo comercial", stars: 2 },
    reply: null },
  { id: "austral", name: "Salmones del Fiordo", industry: "Acuicultura", region: "Los Lagos", color: "#0F8A7A",
    rating: 3.7, reviews: 204, ir: 64, medianDays: 12, feedback: 31, pledge: true,
    review: { title: "Responden, pero tarde", body: "Me dieron la respuesta un mes después de la última entrevista. Al menos respondieron.", role: "Postulante a técnico de planta", stars: 3 },
    reply: "Estamos ajustando nuestros tiempos para cumplir el plazo de 10 días hábiles." },
  { id: "valpo", name: "Puerto Digital Valparaíso", industry: "Tecnología", region: "Valparaíso", color: "#C2410C",
    rating: 4.4, reviews: 129, ir: 86, medianDays: 6, feedback: 64, pledge: true,
    review: { title: "La mejor experiencia de postulación que he tenido", body: "Prueba técnica corta y pagada. Feedback por escrito aunque no avancé.", role: "Postulante a desarrolladora backend", stars: 5 },
    reply: null },
  { id: "retail", name: "Tiendas Cordillera", industry: "Retail", region: "Biobío", color: "#B3261E",
    rating: 2.9, reviews: 892, ir: 22, medianDays: 0, feedback: 4, pledge: false,
    review: { title: "Nunca contestan", body: "Hice tres procesos distintos en dos años. Nunca me respondieron, ni siquiera un correo automático.", role: "Postulante a jefe de tienda", stars: 1 },
    reply: null }
];

const SALARIES = [
  { role: "Analista de datos", p25: 1400000, p50: 1750000, p75: 2200000, n: 412 },
  { role: "Desarrollador/a backend", p25: 1800000, p50: 2400000, p75: 3100000, n: 655 },
  { role: "Ejecutivo/a comercial", p25: 850000, p50: 1100000, p75: 1500000, n: 980 },
  { role: "Técnico/a en mantención", p25: 900000, p50: 1150000, p75: 1450000, n: 377 },
  { role: "Enfermero/a clínico/a", p25: 1300000, p50: 1550000, p75: 1850000, n: 289 },
  { role: "Jefe/a de tienda", p25: 1000000, p50: 1250000, p75: 1600000, n: 341 },
  { role: "Contador/a auditor/a", p25: 1200000, p50: 1600000, p75: 2100000, n: 503 }
];

const INTERVIEWS = [
  { company: "Puerto Digital Valparaíso", role: "Desarrolladora backend", difficulty: "Media", outcome: "ok", outcomeText: "Respondió en 6 días",
    steps: [["Día 0", "Postulación por el sitio"], ["Día 3", "Llamada de RR.HH., 20 minutos"], ["Día 8", "Prueba técnica pagada, 2 horas"], ["Día 12", "Entrevista con el equipo"], ["Día 18", "Correo con feedback y respuesta negativa"]] },
  { company: "Financiera Pacífico Sur", role: "Ejecutivo comercial", difficulty: "Fácil", outcome: "bad", outcomeText: "Sin respuesta",
    steps: [["Día 0", "Postulación por portal"], ["Día 5", "Entrevista grupal"], ["Día 9", "Entrevista con gerencia"], ["Día 16", "Correo de seguimiento enviado"], ["Día 45+", "Sin respuesta", true]] },
  { company: "Salmones del Fiordo", role: "Técnico de planta", difficulty: "Media", outcome: "warn", outcomeText: "Respondió en 22 días",
    steps: [["Día 0", "Postulación presencial"], ["Día 6", "Evaluación psicolaboral"], ["Día 10", "Entrevista con jefatura"], ["Día 32", "Llamada con oferta"]] },
  { company: "Logística Andes Norte", role: "Analista de rutas", difficulty: "Difícil", outcome: "ok", outcomeText: "Respondió en 4 días",
    steps: [["Día 0", "Postulación"], ["Día 2", "Acuso de recibo automático"], ["Día 7", "Caso práctico"], ["Día 11", "Entrevista final"], ["Día 15", "Llamada explicando el resultado"]] }
];

/* ---------- Utilidades ---------- */
const $ = (sel) => document.querySelector(sel);
const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

/* Lista blanca: solo clases conocidas llegan al atributo class. */
const PILL_CLASSES = new Set(["ok", "warn", "bad", "info"]);
const pillClass = (c) => (PILL_CLASSES.has(c) ? c : "info");

/* Un color que no sea hexadecimal de 6 digitos se descarta: evita inyeccion de CSS desde datos externos. */
const safeColor = (c) => (/^#[0-9a-fA-F]{6}$/.test(c) ? c : "#56607A");

function irLevel(ir) {
  if (ir >= 80) return { cls: "ok", label: "Responde", color: "var(--ok)" };
  if (ir >= 50) return { cls: "warn", label: "Irregular", color: "var(--warn)" };
  return { cls: "bad", label: "Deja en visto", color: "var(--bad)" };
}

function showToast(text) {
  const t = $("#toast");
  t.textContent = text;
  t.hidden = false;
  clearTimeout(showToast._id);
  showToast._id = setTimeout(() => { t.hidden = true; }, 2600);
}

/* Acceso a localStorage protegido: puede fallar en ventanas privadas o con el almacenamiento bloqueado. */
const store = {
  get(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* Sin almacenamiento la app sigue en memoria. */ } },
  remove(key) { try { localStorage.removeItem(key); } catch (e) { /* Nada que borrar. */ } }
};

/* =====================================================================
   Navegacion por hash: cada seccion tiene un token simple (#sueldos).
   Solo se aceptan tokens de la lista; cualquier otro valor cae en inicio.
   ===================================================================== */
const VIEWS = ["inicio", "empresas", "sueldos", "entrevistas", "postulaciones", "compromiso", "legal"];

function showView(name) {
  if (!VIEWS.includes(name)) name = "inicio";
  document.querySelectorAll("[data-view]").forEach((s) => { s.hidden = s.dataset.view !== name; });
  document.querySelectorAll(".nav a").forEach((a) => {
    if (a.getAttribute("href") === "#" + name) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", () => showView(location.hash.slice(1)));

/* =====================================================================
   Empresas
   ===================================================================== */
function ring(ir) {
  // Anillo SVG: la longitud del arco es proporcional al porcentaje (circunferencia = 2*pi*30).
  const pct = Math.min(100, Math.max(0, Number(ir) || 0));
  const lvl = irLevel(pct);
  const c = 2 * Math.PI * 30;
  return html`<svg class="ir-ring" viewBox="0 0 76 76" role="img" aria-label="Índice de Respuesta ${pct} por ciento">
    <circle cx="38" cy="38" r="30" fill="none" stroke="var(--line)" stroke-width="7"/>
    <circle cx="38" cy="38" r="30" fill="none" stroke="${lvl.color}" stroke-width="7" stroke-linecap="round"
      stroke-dasharray="${(c * pct / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 38 38)"/>
    <text x="38" y="43" text-anchor="middle" font-size="15" fill="var(--ink)">${pct}%</text>
  </svg>`;
}

function starStr(n) {
  const k = Math.min(5, Math.max(0, Math.round(n)));
  return "★".repeat(k) + "☆".repeat(5 - k);
}

function renderCompanies() {
  const q = $("#coQ").value.trim().toLowerCase();
  const region = $("#coRegion").value;
  const sort = ["ir", "rating", "reviews"].includes($("#coSort").value) ? $("#coSort").value : "ir";
  const list = COMPANIES
    .filter((c) => (!region || c.region === region) && (!q || (c.name + " " + c.industry + " " + c.region).toLowerCase().includes(q)))
    .sort((a, b) => b[sort] - a[sort]);

  if (!list.length) {
    setHTML($("#coList"), html`<div class="card empty">No encontramos empresas con ese criterio. Prueba con otra región o palabra.</div>`);
    return;
  }

  setHTML($("#coList"), html`${list.map((c) => {
    const lvl = irLevel(c.ir);
    const initials = c.name.split(" ").filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]).join("");
    return html`<article class="card">
      <div class="company">
        <div class="mono-logo" data-color="${safeColor(c.color)}" aria-hidden="true">${initials}</div>
        <div class="minw-0">
          <h3>${c.name}</h3>
          <p class="small">${c.industry} · Región ${c.region}</p>
          <div class="chips-row">
            <span class="pill ${lvl.cls}">${lvl.label}</span>
            ${c.pledge ? html`<span class="pill info">Firmó el Compromiso SinVisto</span>` : ""}
          </div>
          <div class="metrics">
            <div class="metric"><b>${Number(c.rating).toFixed(1)}</b><span>Calificación de 5</span></div>
            <div class="metric"><b>${c.medianDays ? c.medianDays + " días" : "Sin dato"}</b><span>Mediana de respuesta</span></div>
            <div class="metric"><b>${c.feedback}%</b><span>Recibe feedback</span></div>
            <div class="metric"><b>${c.reviews}</b><span>Reseñas</span></div>
          </div>
        </div>
        ${ring(c.ir)}
      </div>
      <div class="review">
        <p><span class="stars" aria-label="${c.review.stars} de 5 estrellas">${starStr(c.review.stars)}</span> <b>${c.review.title}</b></p>
        <q class="mt-3xs">${c.review.body}</q>
        <p class="small mt-3xs">${c.review.role} · reseña verificada</p>
        ${c.reply
          ? html`<div class="reply"><b>Respuesta de la empresa:</b> ${c.reply}</div>`
          : html`<p class="small mt-xs">La empresa no ha usado su derecho a réplica.</p>`}
      </div>
    </article>`;
  })}`);

  // El color se aplica por CSSOM (permitido por la CSP), nunca como atributo style en el HTML.
  document.querySelectorAll(".mono-logo[data-color]").forEach((el) => { el.style.background = el.dataset.color; });
}

/* =====================================================================
   Calculadora de sueldo liquido.
   Impuesto Unico de Segunda Categoria: tabla mensual expresada en UTM.
   Cada tramo: [limite superior, tasa, cantidad a rebajar en UTM].
   impuesto = base * tasa - rebaja * UTM
   ===================================================================== */
const TRAMOS = [
  [13.5, 0, 0], [30, 0.04, 0.54], [50, 0.08, 1.74], [70, 0.135, 4.49],
  [90, 0.23, 11.14], [120, 0.304, 17.80], [310, 0.35, 23.32], [Infinity, 0.40, 38.82]
];

function impuestoUnico(base, utm) {
  const enUtm = base / utm;
  const tramo = TRAMOS.find(([lim]) => enUtm <= lim);
  return Math.max(0, base * tramo[1] - tramo[2] * utm);
}

/* Lee un numero de un input y lo acota a un rango: evita NaN, negativos y valores absurdos. */
function numIn(sel, min, max, fallback) {
  const v = Number($(sel).value);
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
}

function calcular() {
  const bruto = numIn("#cBruto", 0, 100000000, 0);
  const afp = bruto * numIn("#cAfp", 0, 20, 11.27) / 100;
  const salud = bruto * numIn("#cSalud", 0, 30, 7) / 100;
  const ces = bruto * ($("#cContrato").value === "0" ? 0 : 0.6) / 100;
  const utm = numIn("#cUtm", 1, 10000000, 69000);
  // La base tributable descuenta las cotizaciones previsionales antes de aplicar la tabla.
  const base = Math.max(0, bruto - afp - salud - ces);
  const imp = impuestoUnico(base, utm);
  const liquido = base - imp;

  const rows = [["Sueldo bruto", bruto], ["AFP", -afp], ["Salud", -salud], ["Seguro de cesantía", -ces], ["Impuesto único", -imp]];
  setHTML($("#calcTable"), html`${rows.map(([k, v]) => html`<tr><td>${k}</td><td>${v < 0 ? "−" : ""}${clp.format(Math.abs(v))}</td></tr>`)}
    <tr class="total"><td>Sueldo líquido</td><td>${clp.format(liquido)}</td></tr>`);

  // La barra se arma con nodos y el ancho se fija por CSSOM: sin estilos en linea en el HTML.
  const bar = $("#calcBar");
  bar.replaceChildren(...[[liquido, "sw-ok"], [afp, "sw-accent"], [salud, "sw-warn"], [ces, "sw-muted"], [imp, "sw-bad"]].map(([v, cls]) => {
    const seg = document.createElement("span");
    seg.className = cls;
    seg.style.width = bruto ? (v / bruto * 100).toFixed(2) + "%" : "0%";
    return seg;
  }));
}

function renderSalaries() {
  const q = $("#salQ").value.trim().toLowerCase();
  const rows = SALARIES.filter((s) => s.role.toLowerCase().includes(q));
  setHTML($("#salBody"), rows.length
    ? html`${rows.map((s) => html`<tr><td>${s.role}</td><td class="num">${clp.format(s.p25)}</td><td class="num"><b>${clp.format(s.p50)}</b></td><td class="num">${clp.format(s.p75)}</td><td class="num">${s.n}</td></tr>`)}`
    : html`<tr><td colspan="5" class="empty">Aún no hay reportes para ese cargo.</td></tr>`);
}

/* ---------- Entrevistas ---------- */
function renderInterviews() {
  setHTML($("#ivList"), html`${INTERVIEWS.map((iv) => html`<article class="card">
    <div class="row-between start">
      <div><h3>${iv.role}</h3><p class="small">${iv.company} · Dificultad ${iv.difficulty.toLowerCase()}</p></div>
      <span class="pill ${pillClass(iv.outcome)}">${iv.outcomeText}</span>
    </div>
    <ol class="timeline">${iv.steps.map(([d, t, silence]) => html`<li class="${silence ? "silence" : ""}"><span>${d}</span><span>${t}</span></li>`)}</ol>
  </article>`)}`);
}

/* =====================================================================
   Mis postulaciones: cuenta dias habiles (lunes a viernes) desde la
   ultima entrevista. Dia 7: sugerir seguimiento. Dia 10: plazo vencido.
   ===================================================================== */
const TR_KEY = "sinvisto.postulaciones.v1";
const STAGES = ["Entrevista RR.HH.", "Entrevista técnica", "Entrevista final", "Prueba psicolaboral"];
const STATUSES = ["open", "answered", "ghosted"];
const MAX_APPS = 200;

function businessDaysSince(isoDate) {
  const start = new Date(isoDate + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let days = 0;
  for (let d = new Date(start); d < today; d.setDate(d.getDate() + 1)) {
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const wd = next.getDay();
    if (wd !== 0 && wd !== 6) days++;
  }
  return days;
}

/* Fecha ISO local de N dias corridos atras. */
function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* Valida cada registro leido de localStorage. Lo guardado en el navegador puede haber sido
   alterado por otra extension o a mano, asi que se trata como entrada no confiable:
   tipos exactos, longitudes maximas y valores de una lista cerrada. */
function cleanText(v, max) { return typeof v === "string" ? v.trim().slice(0, max) : ""; }

function sanitizeApp(o) {
  if (!o || typeof o !== "object") return null;
  const id = Number(o.id);
  const date = typeof o.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.date) && !Number.isNaN(Date.parse(o.date)) ? o.date : null;
  const co = cleanText(o.co, 80);
  const role = cleanText(o.role, 80);
  if (!Number.isSafeInteger(id) || !date || !co || !role) return null;
  return {
    id, co, role, date,
    stage: STAGES.includes(o.stage) ? o.stage : STAGES[0],
    status: STATUSES.includes(o.status) ? o.status : "open",
    example: o.example === true
  };
}

function exampleApps() {
  return [
    { id: 1, co: "Financiera Pacífico Sur", role: "Ejecutivo comercial", date: daysAgo(18), stage: "Entrevista final", status: "open", example: true },
    { id: 2, co: "Puerto Digital Valparaíso", role: "Desarrolladora backend", date: daysAgo(10), stage: "Entrevista técnica", status: "open", example: true },
    { id: 3, co: "Logística Andes Norte", role: "Analista de rutas", date: daysAgo(3), stage: "Entrevista RR.HH.", status: "open", example: true }
  ];
}

const saved = store.get(TR_KEY, null);
let apps = Array.isArray(saved) ? saved.slice(0, MAX_APPS).map(sanitizeApp).filter(Boolean) : exampleApps();

function appState(a) {
  if (a.status === "answered") return { cls: "ok", label: "Respondieron" };
  if (a.status === "ghosted") return { cls: "bad", label: "Reportado sin respuesta" };
  const d = businessDaysSince(a.date);
  if (d >= 10) return { cls: "bad", label: "Plazo vencido" };
  if (d >= 7) return { cls: "warn", label: "Haz seguimiento" };
  return { cls: "info", label: "Dentro del plazo" };
}

function renderApps() {
  if (!apps.length) {
    setHTML($("#trList"), html`<div class="card empty">Aún no registras postulaciones. Agrega la primera con el formulario de arriba.</div>`);
    return;
  }
  setHTML($("#trList"), html`${apps.map((a) => {
    const st = appState(a);
    const d = businessDaysSince(a.date);
    const open = a.status === "open";
    return html`<div class="card app">
      <div class="minw-0"><b>${a.co}</b>${a.example ? html` <span class="sample-tag">ejemplo</span>` : ""}<p class="small">${a.role} · ${a.stage}</p></div>
      <div><span class="days">${d}</span> <span class="small">días hábiles</span></div>
      <div><span class="pill ${st.cls}">${st.label}</span></div>
      <div class="app-actions">
        ${open ? html`<button class="btn sm ghost" data-act="msg" data-id="${a.id}" type="button">Seguimiento</button>
        <button class="btn sm ghost" data-act="answered" data-id="${a.id}" type="button">Respondieron</button>
        ${d >= 10 ? html`<button class="btn sm" data-act="ghosted" data-id="${a.id}" type="button">Reportar silencio</button>` : ""}` : ""}
        <button class="btn sm link" data-act="del" data-id="${a.id}" type="button" aria-label="Eliminar postulación de ${a.co}">Eliminar</button>
      </div>
    </div>`;
  })}`);
}

/* El mensaje va a un textarea con .value: el navegador lo trata siempre como texto plano. */
function followUpMessage(a) {
  return `Estimado equipo de ${a.co}:

Junto con saludar, les escribo para consultar por el estado del proceso de selección para el cargo de ${a.role}. Mi última instancia fue la ${a.stage.toLowerCase()}, el ${new Date(a.date + "T00:00:00").toLocaleDateString("es-CL")}.

Sigo muy interesado/a en la posición. Cualquiera sea el resultado, les agradecería mucho una respuesta para poder organizar mis otros procesos.

Quedo atento/a. Saludos cordiales.`;
}

$("#trList").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const a = apps.find((x) => x.id === Number(btn.dataset.id));
  if (!a) return;
  const act = btn.dataset.act;
  if (act === "msg") {
    $("#msgText").value = followUpMessage(a);
    $("#msgBox").hidden = false;
    $("#msgText").focus();
    return;
  }
  if (act === "answered") { a.status = "answered"; showToast("Marcada como respondida. Suma al índice de la empresa."); }
  if (act === "ghosted") { a.status = "ghosted"; showToast("Reporte registrado. Se publica en forma anónima y agregada."); }
  if (act === "del") { apps = apps.filter((x) => x !== a); showToast("Postulación eliminada."); }
  store.set(TR_KEY, apps);
  renderApps();
});

$("#trForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (apps.length >= MAX_APPS) { showToast(`Llegaste al máximo de ${MAX_APPS} postulaciones. Elimina alguna para agregar otra.`); return; }
  const nueva = sanitizeApp({
    id: Date.now(), co: $("#trCo").value, role: $("#trRole").value,
    date: $("#trDate").value, stage: $("#trStage").value, status: "open"
  });
  if (!nueva) { showToast("Revisa los datos: empresa, cargo y una fecha válida son obligatorios."); return; }
  if (nueva.date > daysAgo(0)) { showToast("La fecha de la entrevista no puede estar en el futuro."); return; }
  apps.unshift(nueva);
  store.set(TR_KEY, apps);
  e.target.reset();
  $("#trDate").value = daysAgo(0);
  renderApps();
  showToast("Postulación agregada.");
});

$("#copyMsg").addEventListener("click", () => {
  const ta = $("#msgText");
  // El portapapeles puede estar bloqueado; en ese caso se deja el texto seleccionado para copiarlo a mano.
  navigator.clipboard.writeText(ta.value)
    .then(() => showToast("Mensaje copiado."))
    .catch(() => { ta.select(); showToast("Texto seleccionado. Cópialo con Ctrl+C."); });
});

/* Derecho de supresion (Ley 21.719): borra todo lo que SinVisto guardo en este navegador.
   Se confirma con un segundo clic dentro de la pagina, sin dialogos del navegador. */
const wipeBtn = $("#wipeAll");
wipeBtn.addEventListener("click", () => {
  if (wipeBtn.dataset.armed !== "1") {
    wipeBtn.dataset.armed = "1";
    wipeBtn.textContent = "Confirmar: borrar todo";
    wipeBtn.classList.add("danger");
    setTimeout(() => {
      wipeBtn.dataset.armed = "";
      wipeBtn.textContent = "Borrar todos mis datos";
      wipeBtn.classList.remove("danger");
    }, 5000);
    return;
  }
  store.remove(TR_KEY);
  apps = [];
  $("#msgBox").hidden = true;
  $("#msgText").value = "";
  wipeBtn.dataset.armed = "";
  wipeBtn.textContent = "Borrar todos mis datos";
  wipeBtn.classList.remove("danger");
  renderApps();
  showToast("Tus datos fueron borrados de este navegador.");
});

/* =====================================================================
   Validacion de RUT chileno con el algoritmo modulo 11.
   El digito verificador se calcula multiplicando los digitos de derecha
   a izquierda por la serie 2,3,4,5,6,7 y aplicando 11 - (suma % 11).
   ===================================================================== */
function validarRut(rut) {
  const limpio = String(rut).replace(/[.\s-]/g, "").toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(limpio)) return false;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  let suma = 0, mult = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const res = 11 - (suma % 11);
  const esperado = res === 11 ? "0" : res === 10 ? "K" : String(res);
  return dv === esperado;
}

$("#pledgeForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = $("#pledgeMsg");
  const ok = validarRut($("#pRut").value);
  msg.textContent = ok
    ? "RUT válido. En la versión final se verifica la razón social con el SII y se envía el acuerdo para firma."
    : "El RUT no es válido. Revisa el dígito verificador, por ejemplo 76.086.428-5.";
  msg.classList.toggle("status-ok", ok);
  msg.classList.toggle("status-bad", !ok);
});

/* ---------- Busqueda de la portada: lleva a Empresas con el texto aplicado ---------- */
$("#heroSearch").addEventListener("submit", (e) => {
  e.preventDefault();
  $("#coQ").value = $("#heroQ").value;
  location.hash = "empresas";
  renderCompanies();
});

/* ---------- Arranque ---------- */
const regionSelect = $("#coRegion");
[...new Set(COMPANIES.map((c) => c.region))].sort().forEach((r) => regionSelect.add(new Option(r, r)));
["#coQ", "#coSort", "#coRegion"].forEach((s) => $(s).addEventListener("input", renderCompanies));
$("#calcForm").addEventListener("input", calcular);
$("#calcForm").addEventListener("submit", (e) => e.preventDefault());
$("#salQ").addEventListener("input", renderSalaries);
$("#trDate").value = daysAgo(0);
$("#trDate").max = daysAgo(0);

renderCompanies();
calcular();
renderSalaries();
renderInterviews();
renderApps();
showView(location.hash.slice(1));
