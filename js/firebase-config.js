/* Configuracion de Firebase. Mientras sea null, el sitio funciona en modo demostracion.
   Para activar el registro con correo y la base de datos publica:
     1. Crea un proyecto en https://console.firebase.google.com (plan Spark, gratuito).
     2. Agrega una app web y copia aqui su configuracion.
     3. En Authentication > Metodos de acceso, activa "Correo electronico" y "Vinculo del correo (acceso sin contrasena)".
     4. Despliega las reglas: firebase deploy --only firestore:rules
   Estos valores no son secretos: identifican el proyecto. La seguridad la ponen firestore.rules. */
window.SINVISTO_FIREBASE = null;
/* Ejemplo:
window.SINVISTO_FIREBASE = {
  apiKey: "AIza...",
  authDomain: "sinvisto-cl.firebaseapp.com",
  projectId: "sinvisto-cl"
};
*/
