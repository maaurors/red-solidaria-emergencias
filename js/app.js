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
   CATALOGOS. Todo reporte se arma con estas listas cerradas: no hay
   texto libre salvo el nombre de la empresa. Asi nadie puede publicar
   nombres de personas ni acusaciones, y los datos se pueden agregar.
   ===================================================================== */
const REGIONS = ["Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo", "Valparaíso", "Metropolitana",
  "O'Higgins", "Maule", "Ñuble", "Biobío", "La Araucanía", "Los Ríos", "Los Lagos", "Aysén", "Magallanes"];

const AREAS = ["Administración", "Atención a clientes", "Comercial y ventas", "Construcción", "Educación", "Finanzas y contabilidad",
  "Ingeniería", "Logística y operaciones", "Marketing", "Minería y energía", "Recursos humanos", "Retail", "Salud", "Tecnología", "Otra área"];

const CHANNELS = ["Portal de empleo", "Sitio web de la empresa", "LinkedIn", "Consultora o headhunter", "Referido", "Otro canal"];

// Clave corta guardada en la base de datos -> texto mostrado. Cambiar un texto no rompe los datos ya guardados.
const STAGES = {
  cv: "Después de enviar mi CV",
  rrhh: "Después de la entrevista con RR.HH.",
  prueba: "Después de una prueba técnica o psicolaboral",
  jefatura: "Después de la entrevista con la jefatura",
  final: "Después de la entrevista final",
  oferta: "Después de una oferta o negociación de sueldo",
  examenes: "Después de exámenes o entrega de papeles"
};

const OUTCOMES = {
  nunca: { label: "Nunca me respondieron", help: "Dejaron de contestar y no supe el resultado." },
  tarde: { label: "Me respondieron, pero tarde", help: "Más de 10 días hábiles después del último contacto." },
  atiempo: { label: "Me respondieron a tiempo", help: "Recibí una respuesta final en 10 días hábiles o menos." }
};

const K_ANON = 3;        // Reportes minimos para mostrar el detalle de una empresa.
const PRELIMINAR = 15;   // Bajo esta cantidad la metrica se marca como preliminar.
const DAILY_LIMIT = 5;   // Reportes por persona cada 24 horas.

/* ---------- Utilidades ---------- */
const $ = (sel) => document.querySelector(sel);
const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
const pct = (x) => Math.round(x * 100) + "%";

function showToast(text) {
  const t = $("#toast");
  t.textContent = text;
  t.hidden = false;
  clearTimeout(showToast._id);
  showToast._id = setTimeout(() => { t.hidden = true; }, 3200);
}

/* Acceso a localStorage protegido: puede fallar en ventanas privadas o con el almacenamiento bloqueado. */
const local = {
  get(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* Sin almacenamiento la app sigue en memoria. */ } },
  remove(key) { try { localStorage.removeItem(key); } catch (e) { /* Nada que borrar. */ } }
};

/* Mes actual en formato AAAA-MM, en hora local. */
function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(m) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("es-CL", { month: "long", year: "numeric" });
}

/* =====================================================================
   EMPRESAS: nombre visible y clave de agrupacion.
   "Banco Ejemplo S.A.", "banco ejemplo" y "BANCO EJEMPLO SpA" deben sumar
   a la misma empresa, asi que se agrupan por una clave normalizada.
   ===================================================================== */
const LEGAL_SUFFIXES = new Set(["sa", "spa", "ltda", "limitada", "eirl", "sociedad", "anonima", "cia", "y"]);

function companyKey(name) {
  return name
    .normalize("NFD").replace(/[̀-ͯ]/g, "")  // Quita tildes: "Logística" -> "Logistica".
    .toLowerCase()
    .replace(/\b(s\.?\s?a|s\.?p\.?a|ltda|e\.?i\.?r\.?l)\.?\b/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && !LEGAL_SUFFIXES.has(w))
    .join("-")
    .slice(0, 80);
}

// Solo letras (con tildes y enie), numeros, espacios y puntuacion comun en razones sociales.
const COMPANY_RE = /^[\p{L}\p{N}][\p{L}\p{N} .,&'()\-/]{1,79}$/u;

function cleanCompanyName(raw) {
  const name = String(raw || "").replace(/\s+/g, " ").trim();
  return COMPANY_RE.test(name) && companyKey(name).length >= 2 ? name : null;
}

/* =====================================================================
   VALIDACION DE REPORTES. Todo lo que viene de la base de datos lo
   escribio otra persona: se trata como entrada no confiable y cada campo
   se revisa contra su lista cerrada. Lo que no calza se descarta.
   ===================================================================== */
function sanitizeReport(id, o) {
  if (!o || typeof o !== "object") return null;
  const company = cleanCompanyName(o.company);
  if (!company) return null;
  if (!REGIONS.includes(o.region) || !AREAS.includes(o.area) || !CHANNELS.includes(o.channel)) return null;
  if (!Object.hasOwn(OUTCOMES, o.outcome)) return null;
  // La etapa solo aplica cuando no hubo respuesta a tiempo.
  const stage = o.outcome === "atiempo" ? null : (Object.hasOwn(STAGES, o.stage) ? o.stage : null);
  if (o.outcome !== "atiempo" && !stage) return null;
  if (typeof o.month !== "string" || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(o.month) || o.month > thisMonth()) return null;
  const createdAt = Number(o.createdAt);
  if (!Number.isFinite(createdAt)) return null;
  return { id: String(id), company, key: companyKey(company), region: o.region, area: o.area, channel: o.channel,
    outcome: o.outcome, stage, month: o.month, createdAt, example: o.example === true };
}

/* =====================================================================
   CAPA DE DATOS. Dos implementaciones con la misma interfaz:
     subscribe(cb)  entrega la lista completa de reportes cada vez que cambia
     add(report)    guarda un reporte y devuelve su id
     remove(id)     borra un reporte propio
     loadMine() / saveMine(perfil)  espacio privado de la persona
   El resto de la app no sabe cual esta usando. Para produccion se agrega
   una tercera (por ejemplo Firestore) sin tocar el resto del codigo.
   ===================================================================== */

/* Base de datos compartida del visor de claude.ai.
   - reports/<id aleatorio>: reporte publico, SIN correo ni id de persona.
   - data/users/<uid>/perfil: correo y lista de reportes propios. Privado
     por la plataforma: nadie mas lo lee, ni siquiera el duenio. */
class SharedStore {
  constructor(db, uid) {
    this.db = db;
    this.uid = uid;
    this.mode = "shared";
  }
  subscribe(cb, onError) {
    return this.db.collection("reports").orderBy("createdAt", "desc").limit(1000).onSnapshot(
      (snap) => cb(snap.docs.map((d) => sanitizeReport(d.id, d.data())).filter(Boolean)),
      onError
    );
  }
  async add(report) {
    const ref = this.db.collection("reports").doc();
    await withRetry(() => ref.set(report));
    return ref.id;
  }
  async remove(id) { await withRetry(() => this.db.doc("reports/" + id).delete()); }
  async loadMine() {
    if (!this.uid) return { email: "", items: [] };
    const snap = await this.db.doc(`data/users/${this.uid}/perfil`).get();
    return sanitizeProfile(snap.exists ? snap.data() : null);
  }
  async saveMine(profile) {
    if (!this.uid) return;
    await withRetry(() => this.db.doc(`data/users/${this.uid}/perfil`).set(profile));
  }
}

/* Modo demostracion: todo queda en este navegador. Trae reportes de ejemplo,
   marcados como tales, para que se vea como funciona la metrica. */
const DEMO_KEY = "sinvisto.demo.reportes.v1";
const DEMO_MINE_KEY = "sinvisto.demo.misreportes.v1";

class LocalStore {
  constructor() {
    this.mode = "demo";
    this.listeners = [];
    const saved = local.get(DEMO_KEY, null);
    this.reports = Array.isArray(saved) ? saved : demoReports();
  }
  emit() {
    local.set(DEMO_KEY, this.reports);
    const clean = this.reports.map((r) => sanitizeReport(r.id, r)).filter(Boolean).sort((a, b) => b.createdAt - a.createdAt);
    this.listeners.forEach((cb) => cb(clean));
  }
  subscribe(cb) {
    this.listeners.push(cb);
    setTimeout(() => this.emit(), 0);
    return () => { this.listeners = this.listeners.filter((x) => x !== cb); };
  }
  async add(report) {
    const id = "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    this.reports.push({ id, ...report });
    this.emit();
    return id;
  }
  async remove(id) {
    this.reports = this.reports.filter((r) => r.id !== id);
    this.emit();
  }
  async loadMine() { return sanitizeProfile(local.get(DEMO_MINE_KEY, null)); }
  async saveMine(profile) {
    // En modo demostracion el correo no se guarda: no hay servidor que lo proteja.
    local.set(DEMO_MINE_KEY, { email: "", items: profile.items });
  }
}

function demoReports() {
  // Empresas ficticias. Solo existen en el modo demostracion y se muestran con la etiqueta "ejemplo".
  const m = (n) => { const d = new Date(); d.setMonth(d.getMonth() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
  const base = Date.now() - 86400000;
  const rows = [
    ["Financiera Pacífico Sur", "Metropolitana", "Comercial y ventas", "nunca", "final", 1], ["Financiera Pacífico Sur", "Metropolitana", "Finanzas y contabilidad", "nunca", "final", 2],
    ["Financiera Pacífico Sur", "Valparaíso", "Comercial y ventas", "nunca", "jefatura", 1], ["Financiera Pacífico Sur", "Metropolitana", "Atención a clientes", "tarde", "rrhh", 3],
    ["Financiera Pacífico Sur", "Metropolitana", "Comercial y ventas", "atiempo", null, 2],
    ["Logística Andes Norte", "Antofagasta", "Logística y operaciones", "atiempo", null, 1], ["Logística Andes Norte", "Antofagasta", "Ingeniería", "atiempo", null, 2],
    ["Logística Andes Norte", "Atacama", "Logística y operaciones", "atiempo", null, 4], ["Logística Andes Norte", "Antofagasta", "Administración", "tarde", "prueba", 3],
    ["Tiendas Cordillera", "Biobío", "Retail", "nunca", "rrhh", 1], ["Tiendas Cordillera", "Biobío", "Retail", "nunca", "cv", 2],
    ["Tiendas Cordillera", "Maule", "Retail", "nunca", "examenes", 2], ["Tiendas Cordillera", "Biobío", "Atención a clientes", "nunca", "rrhh", 5],
    ["Puerto Digital Valparaíso", "Valparaíso", "Tecnología", "atiempo", null, 1]
  ];
  return rows.map(([company, region, area, outcome, stage, ago], i) => ({
    id: "demo" + i, company, region, area, channel: CHANNELS[i % CHANNELS.length], outcome, stage, month: m(ago),
    createdAt: base - i * 3600000, example: true
  }));
}

/* Espacio privado: correo y referencias a los reportes propios, validados igual que todo lo demas. */
function sanitizeProfile(o) {
  const items = o && Array.isArray(o.items) ? o.items : [];
  return {
    email: o && typeof o.email === "string" && EMAIL_RE.test(o.email) ? o.email : "",
    items: items.slice(0, 200).map((it) => it && typeof it.id === "string" && typeof it.key === "string" ? {
      id: it.id.slice(0, 64), key: it.key.slice(0, 80), company: cleanCompanyName(it.company) || "Empresa",
      month: typeof it.month === "string" ? it.month.slice(0, 7) : "", at: Number(it.at) || 0
    } : null).filter(Boolean)
  };
}

/* Reintenta una vez ante una falla transitoria de la plataforma. */
async function withRetry(fn) {
  try { return await fn(); } catch (e) {
    if (e && e.code === "unavailable") {
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
      return fn();
    }
    throw e;
  }
}

/* =====================================================================
   METRICAS. Se calculan en el navegador a partir de los reportes.
   ===================================================================== */
function aggregate(list) {
  const byKey = new Map();
  for (const r of list) {
    let c = byKey.get(r.key);
    if (!c) {
      c = { key: r.key, names: new Map(), n: 0, nunca: 0, tarde: 0, atiempo: 0, stages: {}, regions: new Set(), lastMonth: "", example: true };
      byKey.set(r.key, c);
    }
    c.names.set(r.company, (c.names.get(r.company) || 0) + 1);
    c.n++;
    c[r.outcome]++;
    if (r.outcome === "nunca") c.stages[r.stage] = (c.stages[r.stage] || 0) + 1;
    c.regions.add(r.region);
    if (r.month > c.lastMonth) c.lastMonth = r.month;
    if (!r.example) c.example = false;
  }
  return [...byKey.values()].map((c) => ({
    ...c,
    // El nombre que mas personas escribieron representa a la empresa.
    name: [...c.names.entries()].sort((a, b) => b[1] - a[1])[0][0],
    ir: c.atiempo / c.n,
    ghost: c.nunca / c.n
  }));
}

function irLevel(ir) {
  if (ir >= 0.8) return { cls: "ok", label: "Responde", color: "var(--ok)" };
  if (ir >= 0.5) return { cls: "warn", label: "Irregular", color: "var(--warn)" };
  return { cls: "bad", label: "Deja en visto", color: "var(--bad)" };
}

function ring(ratio) {
  // Anillo SVG: la longitud del arco es proporcional al porcentaje (circunferencia = 2*pi*30).
  const p = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  const lvl = irLevel(ratio);
  const c = 2 * Math.PI * 30;
  return html`<svg class="ir-ring" viewBox="0 0 76 76" role="img" aria-label="Índice de Respuesta ${p} por ciento">
    <circle cx="38" cy="38" r="30" fill="none" stroke="var(--line)" stroke-width="7"/>
    <circle cx="38" cy="38" r="30" fill="none" stroke="${lvl.color}" stroke-width="7" stroke-linecap="round"
      stroke-dasharray="${(c * p / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 38 38)"/>
    <text x="38" y="43" text-anchor="middle" font-size="15" fill="var(--ink)">${p}%</text>
  </svg>`;
}

/* =====================================================================
   ESTADO DE LA APP
   ===================================================================== */
let dataStore = null;   // SharedStore o LocalStore.
let reports = [];       // Ultima lista validada de reportes.
let companies = [];     // Agregados por empresa.
let mine = { email: "", items: [] };
let canWrite = true;

/* ---------- Navegacion por hash: solo tokens de la lista; cualquier otro valor cae en inicio. ---------- */
const VIEWS = ["inicio", "empresas", "reportar", "postulaciones", "sueldos", "compromiso", "legal"];

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
   RENDER: portada, buscador y "mis reportes"
   ===================================================================== */
function renderStats() {
  $("#statReports").textContent = reports.length.toLocaleString("es-CL");
  $("#statCompanies").textContent = companies.length.toLocaleString("es-CL");
  const nunca = reports.filter((r) => r.outcome === "nunca").length;
  $("#statGhost").textContent = reports.length >= K_ANON ? pct(nunca / reports.length) : "—";
  $("#statNote").textContent = reports.length
    ? "Cifras calculadas en vivo con los reportes de la comunidad."
    : "Aún no hay reportes. El tuyo puede ser el primero.";
}

function stageBars(c) {
  const total = c.nunca;
  if (!total) return html`<p class="small">Ninguna persona reportó quedar sin respuesta.</p>`;
  const rows = Object.entries(c.stages).sort((a, b) => b[1] - a[1]);
  return html`<div class="stage-bars">${rows.map(([k, v]) => html`<div class="stage-row">
      <span>${STAGES[k]}</span>
      <span class="stage-track"><span class="stage-fill" data-w="${(v / total * 100).toFixed(1)}"></span></span>
      <span class="mono">${v} de ${total}</span>
    </div>`)}</div>`;
}

function companyCard(c) {
  const initials = c.name.split(" ").filter((w) => w.length > 2).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || c.name[0].toUpperCase();
  const regions = [...c.regions].slice(0, 3).join(", ") + (c.regions.size > 3 ? ` y ${c.regions.size - 3} más` : "");
  const head = html`<div class="co-head">
      <div class="mono-logo" aria-hidden="true">${initials}</div>
      <div class="minw-0">
        <h3>${c.name}${c.example ? html` <span class="sample-tag">ejemplo</span>` : ""}</h3>
        <p class="small">${c.n} ${c.n === 1 ? "reporte" : "reportes"} · ${regions} · último en ${monthLabel(c.lastMonth)}</p>
      </div>
      ${c.n >= K_ANON ? ring(c.ir) : ""}
    </div>`;

  if (c.n < K_ANON) {
    return html`<article class="card co-card">${head}
      <p class="locked">Esta empresa tiene ${c.n} ${c.n === 1 ? "reporte" : "reportes"}. El detalle se publica desde ${K_ANON}, para que nadie pueda saber quién reportó.</p>
      <a class="btn sm ghost" href="#reportar" data-report="${c.name}">¿Te pasó con esta empresa? Reporta</a>
    </article>`;
  }
  const lvl = irLevel(c.ir);
  return html`<article class="card co-card">${head}
    <div class="chips-row">
      <span class="pill ${lvl.cls}">${lvl.label}</span>
      ${c.n < PRELIMINAR ? html`<span class="pill info">Preliminar: menos de ${PRELIMINAR} reportes</span>` : ""}
    </div>
    <div class="kpis">
      <div class="metric"><b>${pct(c.ir)}</b><span>Respondió a tiempo</span></div>
      <div class="metric"><b>${pct(c.tarde / c.n)}</b><span>Respondió tarde</span></div>
      <div class="metric"><b>${pct(c.ghost)}</b><span>Nunca respondió</span></div>
    </div>
    <div class="stack-xs">
      <h4 class="eyebrow">Dónde dejan de responder</h4>
      ${stageBars(c)}
    </div>
    <a class="btn sm ghost" href="#reportar" data-report="${c.name}">Reportar mi experiencia con esta empresa</a>
  </article>`;
}

function renderCompanies() {
  const q = companyKey($("#coQ").value);
  const region = $("#coRegion").value;
  const sort = $("#coSort").value;
  const sorters = {
    n: (a, b) => b.n - a.n,
    // Las empresas sin detalle publico van al final al ordenar por porcentajes.
    ghost: (a, b) => (b.n >= K_ANON) - (a.n >= K_ANON) || b.ghost - a.ghost,
    ir: (a, b) => (b.n >= K_ANON) - (a.n >= K_ANON) || b.ir - a.ir
  };
  const list = companies
    .filter((c) => (!q || c.key.includes(q)) && (!region || c.regions.has(region)))
    .sort(sorters[sort] || sorters.n);

  const box = $("#coList");
  if (!list.length) {
    const typed = $("#coQ").value.trim();
    setHTML(box, html`<div class="card empty">
      ${typed
        ? html`<p>Nadie ha reportado a <b>${typed}</b> todavía.</p><p class="small">Si te dejaron sin respuesta en esta empresa, tu reporte será el primero.</p>
               <a class="btn" href="#reportar" data-report="${typed}">Reportar a ${typed}</a>`
        : html`<p>Aún no hay reportes en esta región.</p><a class="btn" href="#reportar">Hacer el primer reporte</a>`}
    </div>`);
    return;
  }
  setHTML(box, html`${list.slice(0, 60).map(companyCard)}`);
  // Anchos de las barras por CSSOM (permitido por la CSP), nunca como atributo style en el HTML.
  box.querySelectorAll(".stage-fill[data-w]").forEach((el) => { el.style.width = el.dataset.w + "%"; });
}

function renderCompanyOptions() {
  setHTML($("#rpCompanyList"), html`${companies.slice(0, 300).map((c) => html`<option value="${c.name}"></option>`)}`);
}

function renderMine() {
  const box = $("#myReports");
  if (!mine.items.length) {
    setHTML(box, html`<p class="small">Aún no has enviado reportes${dataStore && dataStore.mode === "demo" ? " desde este navegador" : ""}.</p>`);
    return;
  }
  setHTML(box, html`${mine.items.map((it) => html`<div class="my-report">
    <span><b>${it.company}</b><br><span class="small">${it.month ? monthLabel(it.month) : ""}</span></span>
    <button class="btn sm link" type="button" data-del="${it.id}">Borrar</button>
  </div>`)}`);
}

function renderAll() {
  companies = aggregate(reports);
  renderStats();
  renderCompanies();
  renderCompanyOptions();
}

/* =====================================================================
   FORMULARIO DE REPORTE
   ===================================================================== */
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]{1,64}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

function fillSelect(sel, items) {
  const el = $(sel);
  items.forEach((v) => el.add(new Option(v, v)));
}

function buildChoices(boxSel, name, entries) {
  setHTML($(boxSel), html`${entries.map(([value, label, help]) => html`<label class="choice">
      <input type="radio" name="${name}" value="${value}" required>
      <span>${label}${help ? html`<small>${help}</small>` : ""}</span>
    </label>`)}`);
}

function selected(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : "";
}

/* Si respondieron a tiempo no hay "etapa del silencio": la pregunta se oculta. */
function syncStageVisibility() {
  const hide = selected("outcome") === "atiempo";
  $("#rpStageGroup").hidden = hide;
  document.querySelectorAll('input[name="stage"]').forEach((i) => { i.required = !hide; });
}

function formError(msg) {
  const el = $("#rpError");
  el.textContent = msg;
  el.hidden = !msg;
  if (msg) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function prefillReport(company, stage) {
  if (company) $("#rpCompany").value = company;
  if (stage) {
    const r = document.querySelector(`input[name="stage"][value="${stage}"]`);
    if (r) r.checked = true;
  }
}

async function submitReport(e) {
  e.preventDefault();
  formError("");
  if (!dataStore) return formError("Todavía estamos conectando con la base de datos. Intenta en unos segundos.");
  if (!canWrite) return formError("Tu nivel de acceso permite ver los reportes, pero no enviar uno nuevo.");

  const email = $("#rpEmail").value.trim().toLowerCase();
  const company = cleanCompanyName($("#rpCompany").value);
  const outcome = selected("outcome");
  const report = {
    company, region: $("#rpRegion").value, area: $("#rpArea").value, channel: $("#rpChannel").value,
    outcome, stage: outcome === "atiempo" ? null : selected("stage"), month: $("#rpMonth").value,
    // Fecha de creacion redondeada al dia: una hora exacta ayudaria a identificar a quien reporta.
    createdAt: Math.floor(Date.now() / 86400000) * 86400000, v: 1
  };

  // Validacion con mensajes concretos: que esta mal y como arreglarlo.
  if (!EMAIL_RE.test(email) || email.length > 254) return formError("Escribe un correo válido, por ejemplo nombre@correo.cl.");
  if (!company) return formError("Escribe el nombre de la empresa usando letras, números y puntuación común.");
  if (!report.region || !report.area || !report.channel) return formError("Elige la región, el área y cómo postulaste.");
  if (!report.month) return formError("Indica el mes del último contacto.");
  if (report.month > thisMonth()) return formError("El mes del último contacto no puede estar en el futuro.");
  if (!outcome) return formError("Indica si te respondieron.");
  if (outcome !== "atiempo" && !report.stage) return formError("Indica en qué parte del proceso dejaron de hablarte.");
  if (!$("#rpTruth").checked) return formError("Confirma que es tu experiencia real para enviar el reporte.");
  if (!sanitizeReport("nuevo", report)) return formError("Revisa los datos del reporte.");

  // Controles de abuso del lado del cliente. En produccion se repiten en el servidor.
  const key = companyKey(company);
  if (mine.items.some((it) => it.key === key && it.month === report.month)) {
    return formError(`Ya reportaste a ${company} en ${monthLabel(report.month)}. Puedes borrar ese reporte desde "Mis reportes" si quieres corregirlo.`);
  }
  const lastDay = mine.items.filter((it) => Date.now() - it.at < 86400000).length;
  if (lastDay >= DAILY_LIMIT) return formError(`Puedes enviar hasta ${DAILY_LIMIT} reportes cada 24 horas.`);

  const btn = $("#rpSubmit");
  btn.disabled = true;
  btn.textContent = "Enviando...";
  try {
    const id = await dataStore.add(report);
    mine = { email, items: [{ id, key, company, month: report.month, at: Date.now() }, ...mine.items] };
    await dataStore.saveMine(mine);
    renderMine();
    e.target.reset();
    $("#rpEmail").value = email;
    $("#rpMonth").value = thisMonth();
    syncStageVisibility();
    showToast(`Reporte enviado. Gracias: ahora ${company} suma un dato más.`);
    $("#coQ").value = company;
    location.hash = "empresas";
    renderCompanies();
  } catch (err) {
    const code = err && err.code;
    if (code === "quota_exceeded") formError("La base de datos llegó a su límite de reportes. Avisa al equipo de SinVisto.");
    else if (code === "invalid_argument" || code === "not_granted") { canWrite = false; formError("Tu nivel de acceso permite ver los reportes, pero no enviar uno nuevo."); }
    else if (code === "resource_exhausted") formError("Se enviaron muchos datos seguidos. Espera un minuto e inténtalo de nuevo.");
    else formError("No pudimos guardar el reporte. Revisa tu conexión e inténtalo de nuevo.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Enviar reporte anónimo";
  }
}

/* Borrar un reporte propio (derecho de supresion). Se confirma con un segundo clic dentro de la pagina. */
$("#myReports").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-del]");
  if (!btn) return;
  if (btn.dataset.armed !== "1") {
    btn.dataset.armed = "1";
    btn.textContent = "Confirmar";
    btn.classList.add("danger");
    setTimeout(() => { if (btn.isConnected) { btn.dataset.armed = ""; btn.textContent = "Borrar"; btn.classList.remove("danger"); } }, 5000);
    return;
  }
  const id = btn.dataset.del;
  try {
    await dataStore.remove(id);
    mine = { ...mine, items: mine.items.filter((it) => it.id !== id) };
    await dataStore.saveMine(mine);
    renderMine();
    showToast("Reporte borrado. Ya no cuenta en la métrica.");
  } catch (err) {
    showToast("No pudimos borrar el reporte. Inténtalo de nuevo.");
  }
});

/* Cualquier enlace con data-report lleva al formulario con la empresa ya escrita. */
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-report]");
  if (a) prefillReport(a.dataset.report);
});

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
  $("#calcBar").replaceChildren(...[[liquido, "sw-ok"], [afp, "sw-accent"], [salud, "sw-warn"], [ces, "sw-muted"], [imp, "sw-bad"]].map(([v, cls]) => {
    const seg = document.createElement("span");
    seg.className = cls;
    seg.style.width = bruto ? (v / bruto * 100).toFixed(2) + "%" : "0%";
    return seg;
  }));
}

/* =====================================================================
   Mis postulaciones: cuenta dias habiles (lunes a viernes) desde la
   ultima entrevista. Dia 7: sugerir seguimiento. Dia 10: reportar.
   ===================================================================== */
const TR_KEY = "sinvisto.postulaciones.v2";
const TR_STAGES = ["rrhh", "prueba", "jefatura", "final", "oferta"];
const STATUSES = ["open", "answered", "reported"];
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

function cleanText(v, max) { return typeof v === "string" ? v.trim().slice(0, max) : ""; }

/* Lo guardado en el navegador puede haber sido alterado: tipos exactos, longitudes y listas cerradas. */
function sanitizeApp(o) {
  if (!o || typeof o !== "object") return null;
  const id = Number(o.id);
  const date = typeof o.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.date) && !Number.isNaN(Date.parse(o.date)) ? o.date : null;
  const co = cleanText(o.co, 80);
  const role = cleanText(o.role, 80);
  if (!Number.isSafeInteger(id) || !date || !co || !role) return null;
  return { id, co, role, date, stage: TR_STAGES.includes(o.stage) ? o.stage : "rrhh", status: STATUSES.includes(o.status) ? o.status : "open" };
}

const savedApps = local.get(TR_KEY, null);
let apps = Array.isArray(savedApps) ? savedApps.slice(0, MAX_APPS).map(sanitizeApp).filter(Boolean) : [];

function appState(a) {
  if (a.status === "answered") return { cls: "ok", label: "Respondieron" };
  if (a.status === "reported") return { cls: "bad", label: "Reportado" };
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
      <div class="minw-0"><b>${a.co}</b><p class="small">${a.role} · ${STAGES[a.stage].replace("Después de ", "")}</p></div>
      <div><span class="days">${d}</span> <span class="small">días hábiles</span></div>
      <div><span class="pill ${st.cls}">${st.label}</span></div>
      <div class="app-actions">
        ${open ? html`<button class="btn sm ghost" data-act="msg" data-id="${a.id}" type="button">Seguimiento</button>
        <button class="btn sm ghost" data-act="answered" data-id="${a.id}" type="button">Respondieron</button>
        ${d >= 10 ? html`<button class="btn sm" data-act="report" data-id="${a.id}" type="button">Reportar silencio</button>` : ""}` : ""}
        <button class="btn sm link" data-act="del" data-id="${a.id}" type="button" aria-label="Eliminar postulación de ${a.co}">Eliminar</button>
      </div>
    </div>`;
  })}`);
}

/* El mensaje va a un textarea con .value: el navegador lo trata siempre como texto plano. */
function followUpMessage(a) {
  return `Estimado equipo de ${a.co}:

Junto con saludar, les escribo para consultar por el estado del proceso de selección para el cargo de ${a.role}. Mi última instancia fue ${STAGES[a.stage].replace("Después de ", "").toLowerCase()}, el ${new Date(a.date + "T00:00:00").toLocaleDateString("es-CL")}.

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
  if (act === "report") {
    // Lleva al formulario con la empresa, la etapa y el mes ya completados.
    a.status = "reported";
    local.set(TR_KEY, apps);
    renderApps();
    location.hash = "reportar";
    prefillReport(a.co, a.stage);
    const nunca = document.querySelector('input[name="outcome"][value="nunca"]');
    if (nunca) { nunca.checked = true; syncStageVisibility(); }
    $("#rpMonth").value = a.date.slice(0, 7);
    showToast("Completa tu correo, la región y el área para enviar el reporte.");
    return;
  }
  if (act === "answered") { a.status = "answered"; showToast("Marcada como respondida. Si quieres, repórtalo: también cuenta."); }
  if (act === "del") { apps = apps.filter((x) => x !== a); showToast("Postulación eliminada."); }
  local.set(TR_KEY, apps);
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
  local.set(TR_KEY, apps);
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

/* Borra las postulaciones guardadas en este navegador. Se confirma con un segundo clic. */
const wipeBtn = $("#wipeAll");
wipeBtn.addEventListener("click", () => {
  if (wipeBtn.dataset.armed !== "1") {
    wipeBtn.dataset.armed = "1";
    wipeBtn.textContent = "Confirmar: borrar todo";
    wipeBtn.classList.add("danger");
    setTimeout(() => { wipeBtn.dataset.armed = ""; wipeBtn.textContent = "Borrar mis postulaciones"; wipeBtn.classList.remove("danger"); }, 5000);
    return;
  }
  local.remove(TR_KEY);
  apps = [];
  $("#msgBox").hidden = true;
  $("#msgText").value = "";
  wipeBtn.dataset.armed = "";
  wipeBtn.textContent = "Borrar mis postulaciones";
  wipeBtn.classList.remove("danger");
  renderApps();
  showToast("Tus postulaciones fueron borradas de este navegador.");
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

/* ---------- Busqueda de la portada: lleva al buscador con el texto aplicado ---------- */
$("#heroSearch").addEventListener("submit", (e) => {
  e.preventDefault();
  $("#coQ").value = $("#heroQ").value;
  location.hash = "empresas";
  renderCompanies();
});

/* =====================================================================
   CONEXION CON LA BASE DE DATOS
   Dentro del visor de claude.ai existe window.claude.use(); fuera de el
   (archivo local, GitHub Pages) no, y se usa el modo demostracion.
   ===================================================================== */
function setMode(text, shared) {
  $("#modeText").textContent = text;
  $("#modeBanner").classList.toggle("shared", shared);
  $("#modeBanner").hidden = false;
}

function start(store) {
  dataStore = store;
  store.subscribe((list) => { reports = list; renderAll(); }, () => {
    setMode("Se perdió la conexión con la base de datos. Recarga la página para ver los reportes nuevos.", false);
  });
  store.loadMine().then((m) => {
    mine = m;
    if (m.email && !$("#rpEmail").value) $("#rpEmail").value = m.email;
    renderMine();
  }).catch(() => renderMine());
}

async function connect() {
  const use = window.claude && typeof window.claude.use === "function" ? window.claude.use.bind(window.claude) : null;
  if (use) {
    const [db, user] = await Promise.all([use("db"), use("user")]);
    if (db) {
      const uid = user ? await user.id() : null;
      const may = user ? await user.can("data.write") : null;
      canWrite = may !== false && Boolean(uid);
      start(new SharedStore(db, uid));
      setMode(canWrite
        ? "Base de datos compartida: tu reporte lo verán todas las personas que consulten la empresa."
        : "Puedes consultar los reportes. Para enviar uno, pide acceso de colaborador a quien te compartió esta página.", true);
      return;
    }
  }
  start(new LocalStore());
  setMode("Modo demostración: los reportes se guardan solo en este navegador y las empresas marcadas como ejemplo son ficticias.", false);
}

/* ---------- Arranque ---------- */
fillSelect("#rpRegion", REGIONS);
fillSelect("#rpArea", AREAS);
fillSelect("#rpChannel", CHANNELS);
fillSelect("#coRegion", REGIONS);
TR_STAGES.forEach((k) => $("#trStage").add(new Option(STAGES[k].replace("Después de ", "").replace(/^\w/, (c) => c.toUpperCase()), k)));
buildChoices("#rpOutcome", "outcome", Object.entries(OUTCOMES).map(([k, o]) => [k, o.label, o.help]));
buildChoices("#rpStage", "stage", Object.entries(STAGES).map(([k, label]) => [k, label, ""]));
$("#rpOutcome").addEventListener("change", syncStageVisibility);
$("#rpForm").addEventListener("submit", submitReport);
$("#rpMonth").value = thisMonth();
$("#rpMonth").max = thisMonth();
["#coQ", "#coSort", "#coRegion"].forEach((s) => $(s).addEventListener("input", renderCompanies));
$("#calcForm").addEventListener("input", calcular);
$("#calcForm").addEventListener("submit", (e) => e.preventDefault());
$("#trDate").value = daysAgo(0);
$("#trDate").max = daysAgo(0);

calcular();
renderApps();
renderAll();
renderMine();
showView(location.hash.slice(1));
connect();
