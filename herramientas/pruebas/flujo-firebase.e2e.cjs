// Prueba de punta a punta del registro con enlace magico y los reportes, contra los emuladores de Firebase.
// Requiere Playwright. Ejecutar desde herramientas/ con el sitio servido en el puerto 8765:
//   python3 -m http.server 8765 --directory ..   (en otra terminal)
//   npx firebase emulators:exec --only auth,firestore --project demo-sinvisto --config ../firebase.json "node pruebas/flujo-firebase.e2e.cjs"
const { chromium } = require("playwright");
const assert = require("node:assert/strict");

const BASE = "http://127.0.0.1:8765/";
const PROJECT = "demo-sinvisto";
const CONFIG = `window.SINVISTO_FIREBASE = { apiKey: "fake-api-key", authDomain: "${PROJECT}.firebaseapp.com", projectId: "${PROJECT}", emulators: true };`;

let current = null;

async function lastSignInCode(email) {
  // El emulador guarda los enlaces que habria enviado por correo.
  const r = await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/oobCodes`);
  const { oobCodes } = await r.json();
  return oobCodes.filter((c) => c.email === email && c.requestType === "EMAIL_SIGNIN").pop().oobCode;
}

async function page(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  // Sirve la configuracion del emulador y quita la CSP solo en esta prueba (los emuladores usan http://127.0.0.1).
  await ctx.route("**/js/firebase-config.js", (r) => r.fulfill({ contentType: "text/javascript", body: CONFIG }));
  await ctx.route(BASE + "**", async (r) => {
    // fallback() cede a la ruta registrada antes (la de la configuracion); continue() iria directo a la red.
    if (r.request().resourceType() !== "document") return r.fallback();
    const res = await r.fetch();
    r.fulfill({ response: res, body: (await res.text()).replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, "") });
  });
  const p = await ctx.newPage();
  current = p;
  p.errors = [];
  p.on("console", (m) => { if (m.type() === "error") p.errors.push("console: " + m.text().slice(0, 700)); });
  p.on("pageerror", (e) => p.errors.push(e.message));
  return p;
}

async function signIn(p, email) {
  await p.goto(BASE + "#cuenta"); await p.waitForSelector("#acEmail");
  await p.fill("#acEmail", email); await p.click("#acForm button[type=submit]");
  await p.waitForSelector("text=Revisa tu correo");
  const code = await lastSignInCode(email);
  // Abrir el enlace del correo.
  await p.goto(`${BASE}?mode=signIn&oobCode=${code}&apiKey=fake-api-key&lang=es#cuenta`);
  // Al ingresar, la app lleva directo a reportar.
  await p.waitForFunction(() => document.querySelector("#accountBtn").textContent === "Mi cuenta" && location.hash === "#reportar", null, { timeout: 15000 });
}

async function report(p, extra = {}) {
  await p.goto(BASE + "#reportar"); await p.waitForTimeout(1200);
  if (await p.isVisible("#rpPicked")) await p.click("#rpPickedClear");
  await p.fill("#rpCompany", extra.company || "bci"); await p.waitForTimeout(150); await p.keyboard.press("Enter");
  await p.selectOption("#rpRegion", "Metropolitana"); await p.selectOption("#rpArea", "Tecnología"); await p.selectOption("#rpChannel", "LinkedIn");
  await p.check("input[name=outcome][value=nunca]"); await p.check("input[name=stage][value=cv]");
  await p.check("input[name=ask][value=aviso_cv]");
  await p.fill("#rpComment", extra.comment || "Solo pido que por último me digan si revisaron mi CV.");
  await p.check("#rpTruth"); await p.check("#rpTerms");
  await p.click("#rpSubmit"); await p.waitForTimeout(1500);
  return (await p.isVisible("#rpError")) ? await p.textContent("#rpError") : "ok";
}

(async () => {
  // Chromium bloquea por defecto las conexiones a direcciones locales (Local Network Access). Los emuladores viven
  // en 127.0.0.1, asi que en esta prueba se desactiva ese control; en produccion Firestore es una direccion publica.
  const browser = await chromium.launch({ args: ["--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessSendPreflights,PrivateNetworkAccessRespectPreflightResults"] });
  const ana = await page(browser);

  await ana.goto(BASE + "#reportar"); await ana.waitForTimeout(1500);
  assert.equal(await ana.textContent("#accountBtn"), "Ingresar");
  assert.ok((await ana.textContent("#rpAccountNote")).includes("ingresa con tu correo"));
  console.log("ok  sin sesión: el formulario pide ingresar y oculta el campo de correo");
  assert.match(await report(ana), /ingresa con tu correo/);
  console.log("ok  sin sesión: el reporte se rechaza");

  await signIn(ana, "ana@correo.cl");
  assert.equal(await ana.textContent("#accountBtn"), "Mi cuenta");
  assert.ok((await ana.textContent("#rpAccountNote")).includes("an*@correo.cl"));
  console.log("ok  ingreso con enlace mágico; el correo se muestra enmascarado");

  assert.equal(await report(ana), "ok");
  console.log("ok  reporte enviado con cuenta verificada");
  assert.match(await report(ana), /Ya reportaste/);
  console.log("ok  duplicado de empresa y mes rechazado");

  // Una segunda persona ve el reporte de Ana en vivo, sin su correo.
  const beto = await page(browser);
  await beto.goto(BASE + "#empresas"); await beto.waitForTimeout(2000);
  const card = (await beto.textContent("#coList")).replace(/\s+/g, " ");
  assert.ok(card.includes("BCI") && card.includes("1 reporte"));
  assert.ok(!card.includes("ana@"));
  console.log("ok  otra persona sin sesión ve la empresa con 1 reporte y sin el correo");

  // Ana borra su reporte y elimina su cuenta.
  await ana.goto(BASE + "#reportar"); await ana.waitForTimeout(1200);
  await ana.click("#myReports button[data-del]"); await ana.click("#myReports button[data-del]"); await ana.waitForTimeout(1500);
  assert.ok((await ana.textContent("#myReports")).includes("Aún no has enviado"));
  console.log("ok  la dueña borra su reporte");
  assert.equal(await report(ana), "ok");
  console.log("ok  tras borrarlo puede volver a reportar ese mes");
  await ana.goto(BASE + "#cuenta"); await ana.waitForSelector("#acDelete");
  await ana.click("#acDelete"); await ana.click("#acDelete"); await ana.waitForSelector("#acEmail", { timeout: 15000 });
  await beto.waitForTimeout(1500);
  assert.ok(!(await beto.textContent("#coList")).includes("BCI"));
  console.log("ok  eliminar la cuenta borra también sus reportes públicos");

  assert.deepEqual([...ana.errors, ...beto.errors], []);
  console.log("ok  sin errores de JavaScript");
  await browser.close();
})().catch(async (e) => {
  console.error("FALLA:", e.message);
  // Estado de la pagina al fallar, para diagnosticar sin adivinar.
  if (current) {
    const t = async (sel) => (await current.textContent(sel).catch(() => "(no existe)") || "").replace(/\s+/g, " ").trim().slice(0, 160);
    console.error("  url:", current.url());
    console.error("  boton cuenta:", await t("#accountBtn"), "| nota:", await t("#rpAccountNote"));
    console.error("  franja:", await t("#modeBanner"), "| error formulario:", await t("#rpError"));
    console.error("  errores JS:", current.errors);
  }
  process.exit(1);
});
