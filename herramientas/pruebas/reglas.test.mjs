// Pruebas de las reglas de seguridad de Firestore (firestore.rules) contra el emulador oficial.
// Cada prueba es un caso legitimo que debe funcionar o un ataque que debe fallar.
// Ejecutar desde herramientas/: npm run test:reglas
import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc, writeBatch } from "firebase/firestore";

const DIA = 86400000;
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-sinvisto",
    firestore: { rules: readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8"), host: "127.0.0.1", port: 8080 }
  });
});
after(async () => env.cleanup());
beforeEach(async () => env.clearFirestore());

// Persona con correo verificado (como queda tras ingresar con enlace magico).
const persona = (uid, verificado = true) => env.authenticatedContext(uid, { email: `${uid}@correo.cl`, email_verified: verificado }).firestore();

function reporte(extra = {}) {
  return {
    rut: "97006000-6", region: "Metropolitana", area: "Tecnología", channel: "LinkedIn",
    outcome: "nunca", stage: "cv", month: "2026-09", asks: ["aviso_cv"],
    comment: "Solo pido que por último me digan si revisaron mi CV.",
    author: { type: "alias", alias: "Postulante Copihue 4821" },
    createdAt: Math.floor(Date.now() / DIA) * DIA, v: 2, ...extra
  };
}

// Lote que hace la app: reporte publico + prueba privada de propiedad + claim de empresa y mes.
function loteReporte(db, uid, id, datos = reporte()) {
  const b = writeBatch(db);
  b.set(doc(db, "reports", id), datos);
  b.set(doc(db, `users/${uid}/reportes/${id}`), { rut: datos.rut, month: datos.month, at: Date.now(), named: false });
  b.set(doc(db, `users/${uid}/claims/${datos.rut}_${datos.month}`), { reportId: id });
  return b.commit();
}

describe("Lectura", () => {
  test("cualquiera, incluso sin sesión, puede leer los reportes públicos", async () => {
    await assertSucceeds(loteReporte(persona("ana"), "ana", "r1"));
    await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), "reports/r1")));
  });
  test("nadie puede leer el espacio privado de otra persona", async () => {
    await assertSucceeds(loteReporte(persona("ana"), "ana", "r1"));
    await assertFails(getDoc(doc(persona("beto"), "users/ana/reportes/r1")));
    await assertFails(getDoc(doc(persona("beto"), "users/ana/claims/97006000-6_2026-09")));
  });
});

describe("Crear reportes", () => {
  test("una persona verificada crea un reporte válido", async () => {
    await assertSucceeds(loteReporte(persona("ana"), "ana", "r1"));
  });
  test("ATAQUE: sin sesión no se puede reportar", async () => {
    await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), "reports/r1"), reporte()));
  });
  test("ATAQUE: con correo sin verificar no se puede reportar", async () => {
    await assertFails(loteReporte(persona("ana", false), "ana", "r1"));
  });
  test("ATAQUE: escribir solo el reporte, sin prueba de propiedad ni claim", async () => {
    await assertFails(setDoc(doc(persona("ana"), "reports/r1"), reporte()));
  });
  test("ATAQUE: reportar dos veces la misma empresa en el mismo mes", async () => {
    await assertSucceeds(loteReporte(persona("ana"), "ana", "r1"));
    await assertFails(loteReporte(persona("ana"), "ana", "r2"));
  });
  test("la misma persona sí puede reportar otra empresa o la misma en otro mes", async () => {
    await assertSucceeds(loteReporte(persona("ana"), "ana", "r1"));
    await assertSucceeds(loteReporte(persona("ana"), "ana", "r2", reporte({ month: "2026-08" })));
    await assertSucceeds(loteReporte(persona("ana"), "ana", "r3", reporte({ rut: "97036000-K" })));
  });
  test("ATAQUE: crear el claim a nombre de otra persona", async () => {
    const db = persona("ana");
    const b = writeBatch(db);
    b.set(doc(db, "reports/r1"), reporte());
    b.set(doc(db, "users/beto/reportes/r1"), { rut: "97006000-6", month: "2026-09", at: Date.now(), named: false });
    b.set(doc(db, "users/beto/claims/97006000-6_2026-09"), { reportId: "r1" });
    await assertFails(b.commit());
  });
});

describe("Validación del contenido", () => {
  const casos = [
    ["campo extra para colar datos (uid o correo)", { email: "ana@correo.cl" }],
    ["RUT con formato inválido", { rut: "abc" }],
    ["región fuera de la lista", { region: "Mendoza" }],
    ["resultado inventado", { outcome: "excelente" }],
    ["etapa faltante cuando no respondieron", { stage: null }],
    ["mes en formato incorrecto", { month: "09-2026" }],
    ["fecha en el futuro", { createdAt: Math.floor(Date.now() / DIA) * DIA + 10 * DIA }],
    ["fecha con hora exacta (permitiría identificar a la persona)", { createdAt: Date.now() - 12345 }],
    ["petición fuera de la lista", { asks: ["dinero"] }],
    ["comentario con correo", { comment: "Escríbanme a ana@correo.cl" }],
    ["comentario con correo después de un salto de línea", { comment: "Hola\nescríbanme a ana@correo.cl" }],
    ["comentario con teléfono", { comment: "Llamen al +56 9 8765 4321" }],
    ["comentario con enlace", { comment: "Vean https://ejemplo.cl" }],
    ["comentario con HTML", { comment: "<img src=x onerror=alert(1)>" }],
    ["comentario de más de 200 caracteres", { comment: "a".repeat(201) }],
    ["seudónimo con formato falso", { author: { type: "alias", alias: "Gerente de RR.HH." } }],
    ["autor con campos extra", { author: { type: "alias", alias: "Postulante Copihue 4821", uid: "ana" } }],
    ["versión de esquema incorrecta", { v: 1 }],
  ];
  for (const [nombre, extra] of casos) {
    test(`ATAQUE: ${nombre}`, async () => {
      await assertFails(loteReporte(persona("ana"), "ana", "r1", reporte(extra)));
    });
  }
  test("si respondieron a tiempo, la etapa puede ir vacía", async () => {
    await assertSucceeds(loteReporte(persona("ana"), "ana", "r1", reporte({ outcome: "atiempo", stage: null, asks: [] })));
  });
  test("el nombre se acepta si la persona lo autorizó", async () => {
    await assertSucceeds(loteReporte(persona("ana"), "ana", "r1", reporte({ author: { type: "name", name: "Camila R." } })));
  });
});

describe("Modificar y borrar", () => {
  test("la dueña puede quitar su nombre (cambiar a seudónimo)", async () => {
    await assertSucceeds(loteReporte(persona("ana"), "ana", "r1", reporte({ author: { type: "name", name: "Camila R." } })));
    await assertSucceeds(updateDoc(doc(persona("ana"), "reports/r1"), { author: { type: "alias", alias: "Postulante Lenga 2840" } }));
  });
  test("ATAQUE: la dueña intenta cambiar el resultado del reporte después de publicado", async () => {
    await assertSucceeds(loteReporte(persona("ana"), "ana", "r1"));
    await assertFails(updateDoc(doc(persona("ana"), "reports/r1"), { outcome: "atiempo" }));
  });
  test("ATAQUE: otra persona intenta cambiar el autor o borrar el reporte", async () => {
    await assertSucceeds(loteReporte(persona("ana"), "ana", "r1"));
    await assertFails(updateDoc(doc(persona("beto"), "reports/r1"), { author: { type: "alias", alias: "Postulante Puma 1111" } }));
    await assertFails(deleteDoc(doc(persona("beto"), "reports/r1")));
  });
  test("la dueña borra su reporte y queda libre para volver a reportar ese mes", async () => {
    const db = persona("ana");
    await assertSucceeds(loteReporte(db, "ana", "r1"));
    const b = writeBatch(db);
    b.delete(doc(db, "reports/r1"));
    b.delete(doc(db, "users/ana/reportes/r1"));
    b.delete(doc(db, "users/ana/claims/97006000-6_2026-09"));
    await assertSucceeds(b.commit());
    await assertSucceeds(loteReporte(db, "ana", "r2"));
  });
  test("ATAQUE: soltar el claim sin borrar el reporte, para duplicar", async () => {
    const db = persona("ana");
    await assertSucceeds(loteReporte(db, "ana", "r1"));
    await assertFails(deleteDoc(doc(db, "users/ana/claims/97006000-6_2026-09")));
  });
  test("ATAQUE: una empresa (cualquier cuenta) intenta borrar reportes ajenos en masa", async () => {
    await assertSucceeds(loteReporte(persona("ana"), "ana", "r1"));
    await assertSucceeds(loteReporte(persona("beto"), "beto", "r2"));
    await assertFails(deleteDoc(doc(persona("empresa"), "reports/r1")));
    await assertFails(deleteDoc(doc(persona("empresa"), "reports/r2")));
  });
});

describe("Consentimientos y rutas no previstas", () => {
  test("cada persona guarda sus consentimientos", async () => {
    await assertSucceeds(setDoc(doc(persona("ana"), "users/ana/perfil/datos"), { terms: "2026-10", at: Date.now(), contact: false }));
  });
  test("ATAQUE: escribir consentimientos de otra persona", async () => {
    await assertFails(setDoc(doc(persona("beto"), "users/ana/perfil/datos"), { terms: "2026-10", at: Date.now(), contact: true }));
  });
  test("ATAQUE: escribir en una colección no prevista", async () => {
    await assertFails(setDoc(doc(persona("ana"), "admin/config"), { abierto: true }));
  });
});
