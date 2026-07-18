# Red Solidaria de Emergencias — MVP

Aplicación móvil + API + base de datos MySQL del curso. La app opera en vivo
sobre la base `red_emergencias` diseñada en el trabajo de Base de Datos.

## Arquitectura

```
[App móvil Expo/React Native]  --HTTP/JSON-->  [API Node/Express]  --SQL-->  [MySQL red_emergencias]
        (teléfono)                              (notebook, :3000)              (notebook)
```

## Requisitos

- Node.js 18 o superior (incluye npm)
- MySQL 8 corriendo local (el mismo que usan para el curso / Workbench)
- La app Expo Go instalada en el teléfono (Play Store / App Store)
- Teléfono y notebook en la MISMA red wifi

## Instalación paso a paso

### 1. Base de datos

En MySQL Workbench (o consola) ejecutar en este orden:

1. `red_emergencias.sql` (el script del trabajo — crea la base y los datos)
2. `backend/sql/01_auth.sql` (agrega la columna de contraseñas)

### 2. Backend

```bash
cd backend
npm install
copy .env.example .env      # en Mac/Linux: cp .env.example .env
```

Editar `.env`: poner la contraseña de su MySQL en `DB_PASSWORD` y generar
un `JWT_SECRET` propio con:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Luego:

```bash
npm run seed     # asigna la contraseña demo1234 a los usuarios de ejemplo
npm start        # la API queda en http://localhost:3000
npm test         # (opcional, en otra terminal) 22 pruebas automáticas
```

### 3. App móvil

Averiguar la IP local del notebook:
en Windows `ipconfig` (Dirección IPv4), en Mac `ifconfig | grep inet`.

Editar `mobile/src/api.js` y poner esa IP en `API_URL`, por ejemplo:
`http://192.168.1.20:3000`.

```bash
npx create-expo-app red-emergencias --template blank
```

Copiar dentro del proyecto creado: el `App.js` y la carpeta `src/` de `mobile/`
(reemplazando el App.js generado). Después:

```bash
cd red-emergencias
npx expo start
```

Escanear el QR con Expo Go desde el teléfono.

## Usuarios de demostración (contraseña: demo1234)

| Email | Rol | Qué puede hacer |
|---|---|---|
| carla.soto@mail.cl | COORDINADOR | Ver déficit, asignar donaciones a necesidades |
| maria.f@mail.cl | DONANTE | Ver déficit, donar, ver trazabilidad de sus aportes |
| ana.morales@mail.cl | VOLUNTARIO | Ver déficit, agendar turnos |

También se pueden crear cuentas nuevas de donante/voluntario desde la app.

## Demo sugerida para la presentación (3 minutos)

1. Entrar como donante (maria.f@mail.cl), mostrar la pestaña Necesidades:
   el déficit en tiempo real, la consulta estrella del modelo.
2. Donar 20 frazadas. Ir a Mis aportes: aparece "en bodega".
3. Entrar como coordinadora (carla.soto@mail.cl), asignar esas frazadas
   al Gimnasio Municipal.
4. Volver a Necesidades: el déficit de frazadas BAJÓ en 20, en vivo.
5. Volver como donante a Mis aportes: ahora dice "20 asignadas al
   Gimnasio Municipal" — trazabilidad completa.
6. Bonus: como voluntaria (ana.morales@mail.cl) intentar agendar dos
   turnos en el mismo bloque: el segundo es rechazado por la restricción
   UNIQUE del modelo.

## Seguridad implementada (para explicar en la defensa)

- Contraseñas con hash bcrypt: la BD nunca guarda la contraseña real.
- Autenticación por token JWT con expiración de 12 horas.
- Autorización por rol en cada endpoint (un donante no puede asignar).
- Nadie puede registrarse como COORDINADOR (no hay escalada de privilegios).
- Consultas 100% parametrizadas: inmune a inyección SQL.
- Login con mensaje genérico: no revela qué emails existen.
- Límite de peticiones por IP (mitiga fuerza bruta).
- Invariantes de negocio validados en transacciones con bloqueo de fila
  (no se puede sobreasignar una donación ni sobrecubrir una necesidad).
- Integridad garantizada por el motor: FK, CHECK y UNIQUE del modelo.

## Acceso con Google (SSO)

El botón de Google queda oculto hasta configurar las credenciales:

1. En Google Cloud Console: APIs y servicios → Pantalla de consentimiento
   OAuth (tipo Externo, usuarios de prueba: sus emails).
2. Credenciales → Crear credencial → ID de cliente OAuth → tipo
   "Aplicación web". En orígenes y URIs de redireccionamiento autorizados
   agregar: https://auth.expo.io (Expo Go usa ese proxy).
3. Copiar el Client ID (termina en .apps.googleusercontent.com) en DOS
   lugares con el mismo valor:
   - `backend/.env` → `GOOGLE_CLIENT_ID=...`
   - `mobile/src/configuracion.js` → `GOOGLE_CLIENT_ID = "..."`
4. Reiniciar backend y recargar la app.

El servidor verifica cada id_token directamente contra Google y valida
que fue emitido para esta aplicación; los usuarios nuevos por Google
entran como DONANTE sin RUT (pueden completarlo después).

## Compilar app instalable para Android (APK)

La app corre en iPhone y Android via Expo Go (mismo QR). Para generar un
APK instalable en cualquier Android SIN Expo Go, se usa EAS Build: la
compilación ocurre en los servidores de Expo (plan gratuito, ~15 min).

1. Crear cuenta gratis en https://expo.dev (una para el grupo).
2. Instalar la CLI e iniciar sesión:

```bash
npm install -g eas-cli
eas login
```

3. Compilar (desde el proyecto Expo):

```bash
cd red-emergencias-app
eas build --platform android --profile preview
```

4. Al terminar entrega un enlace: se abre en el teléfono Android y se
   instala el APK directamente (aceptar "instalar de origen desconocido").

Notas importantes:

- El APK instalado sigue necesitando el backend encendido y el teléfono
  en la misma red wifi (la IP está en `src/api.js`). Para que funcione
  desde cualquier lugar habría que desplegar el backend en la nube.
- La config ya permite HTTP en Android (`usesCleartextTraffic`), los
  permisos de cámara y el identificador `cl.redsolidaria.emergencias`.
- iPhone instalable requiere cuenta Apple Developer (US$99/año); sin
  ella, en iPhone se usa via Expo Go, que para la demo es equivalente.

## Alcance (versión demo)

MVP académico: demuestra que el modelo de datos funciona de punta a punta.
Para producción real faltaría: HTTPS/TLS, refresh tokens, recuperación de
contraseña, verificación de email, respaldos, monitoreo, auditoría de
seguridad externa y despliegue en la nube con alta disponibilidad.
Declararlo así en la presentación suma seriedad, no resta.
