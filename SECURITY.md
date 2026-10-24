# Política de seguridad de SinVisto

SinVisto guarda experiencias laborales de personas que pueden temer represalias. La seguridad y el anonimato son parte del producto.

## Reportar una vulnerabilidad

Repórtala de forma privada en [GitHub Security Advisories](https://github.com/maaurors/red-solidaria-emergencias/security/advisories/new). No abras un issue público.

- Confirmamos la recepción en un máximo de 5 días hábiles.
- No tomaremos acciones legales contra investigaciones de buena fe que respeten estas reglas: no acceder a datos de terceros, no degradar el servicio y dar un plazo razonable para corregir antes de publicar.
- Fuera de alcance: ataques de denegación de servicio, ingeniería social y spam.

## Controles del frontend

| Riesgo (OWASP Top 10 2021) | Control implementado |
|---|---|
| A03 Inyección / XSS | Plantillas `html``…``` con escape por defecto; `setHTML` es el único punto que escribe `innerHTML`; Trusted Types obligatorio por CSP |
| A03 Inyección de CSS | Colores validados con lista blanca hexadecimal y aplicados por CSSOM; clases de una lista cerrada |
| A05 Configuración insegura | CSP sin `unsafe-inline` ni `unsafe-eval`; HSTS, `nosniff`, `frame-ancestors 'none'`, COOP, CORP y `Permissions-Policy` en `firebase.json` |
| A08 Integridad de datos | Registros de `localStorage` validados por esquema (tipos, longitudes, listas cerradas y un máximo de 200) |
| A06 Componentes vulnerables | Cero dependencias y cero scripts de terceros |
| Privacidad (Ley 21.719) | Fuentes alojadas en el propio sitio; ningún tercero recibe la IP del visitante; botón para borrar todos los datos locales |

La meta CSP de `index.html` es un respaldo para hostings sin cabeceras propias, como GitHub Pages. Para producción se recomienda Firebase Hosting, que aplica todas las cabeceras de `firebase.json`.

## Pendiente para el backend

1. Autenticación con MFA, sesiones en cookies `HttpOnly; Secure; SameSite=Strict` y protección CSRF.
2. Limitación de peticiones y Cloud Armor (WAF) frente a la API.
3. Cifrado en reposo con claves gestionadas (Cloud KMS) y datos alojados en `southamerica-west1`.
4. Separar la identidad del postulante de sus reseñas (seudonimización) y publicar solo agregados de 15 reportes o más.
5. Registro de auditoría y un procedimiento para notificar brechas a la Agencia de Protección de Datos Personales, como exige la Ley 21.719.
6. Escaneo automático en CI: dependencias, secretos y DAST (OWASP ZAP).
