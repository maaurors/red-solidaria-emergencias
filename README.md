# SinVisto

Plataforma de transparencia laboral para Chile. Su objetivo es terminar con el ghosting en los procesos de selección midiendo públicamente si las empresas responden a quienes entrevistan.

## Secciones

- **Inicio**: propuesta de valor e Índice de Respuesta.
- **Empresas**: perfiles con calificación, Índice de Respuesta, reseñas y derecho a réplica.
- **Sueldos**: calculadora de sueldo bruto a líquido (AFP, salud, cesantía, impuesto único) y rangos por cargo.
- **Entrevistas**: experiencias con la línea de tiempo completa del proceso.
- **Mis postulaciones**: panel privado que cuenta días hábiles y sugiere mensajes de seguimiento.
- **Para empresas**: Compromiso SinVisto con validación de RUT.
- **Leyes y políticas**: resumen de la normativa laboral y de datos personales chilena.

## Índice de Respuesta

IR = respuestas finales entregadas dentro de 10 días hábiles ÷ procesos con entrevista reportados en los últimos 12 meses. Se publica con 15 reportes o más.

## Estructura

```
index.html              Marcado, sin estilos ni scripts en línea
css/styles.css          Estilos y fuentes locales
js/app.js               Lógica, con escape de HTML por defecto
fonts/                  Fuentes woff2, subconjunto latin
img/                    Fotografías en WebP
firebase.json           Hosting con cabeceras de seguridad
.well-known/security.txt  Contacto de seguridad (RFC 9116)
SECURITY.md             Política de seguridad y controles
```

## Uso local

La CSP solo permite recursos del mismo origen, así que sírvelo por HTTP en vez de abrir el archivo directamente:

```
python3 -m http.server 8080
```

Luego abre http://localhost:8080.

## Despliegue seguro (Firebase Hosting en GCP)

```
npm install -g firebase-tools
firebase login
firebase init hosting   # usa la carpeta actual y conserva firebase.json
firebase deploy --only hosting
```

Después revisa las cabeceras en https://securityheaders.com y la CSP en https://csp-evaluator.withgoogle.com.

## Estado

Prototipo de frontend. Todas las empresas, reseñas y cifras son ficticias. Las postulaciones se guardan en el `localStorage` del navegador; el siguiente paso es un backend (por ejemplo Cloud Run + Firestore en `southamerica-west1`).

## Créditos de fotografías

Las fotos de `img/` provienen de Wikimedia Commons bajo licencia [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/deed.es). Fueron redimensionadas, convertidas a WebP y sin metadatos EXIF.

- `espera-notebook.webp`: [Frustrated woman working on laptop in a bright kitchen](https://commons.wikimedia.org/wiki/File:Frustrated_woman_working_on_laptop_in_a_bright_kitchen.jpg), Shixart1985.
- `cansancio.webp`: [Woman feeling stressed while working at a kitchen table](https://commons.wikimedia.org/wiki/File:Woman_feeling_stressed_while_working_at_a_kitchen_table.jpg), Shixart1985.
- `espera-telefono.webp`: [Woman waiting and playing on her phone](https://commons.wikimedia.org/wiki/File:Woman_waiting_and_playing_on_her_phone.jpg), Rawpixel Ltd.
