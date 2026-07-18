// Asigna contrasena de demo a los usuarios de ejemplo del script del curso.
// Uso: npm run seed
// Contrasena de todos los usuarios demo: demo1234
const bcrypt = require("bcryptjs");
const pool = require("../src/db");

async function main() {
  const hash = await bcrypt.hash("demo1234", 10);
  const [resultado] = await pool.execute(
    "UPDATE usuario SET password_hash = ? WHERE password_hash IS NULL",
    [hash]
  );
  console.log(`Contrasena demo asignada a ${resultado.affectedRows} usuarios (demo1234)`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
