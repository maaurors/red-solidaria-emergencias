# SinVisto

Plataforma de transparencia laboral para Chile. Su objetivo es terminar con el ghosting en los procesos de selección midiendo públicamente si las empresas responden a quienes entrevistan.

## Cómo funciona

1. **Reportar**: la persona indica su correo, la empresa, región, área, canal de postulación, mes, si le respondieron y en qué etapa dejaron de hablarle. Todo se elige de listas cerradas; el único texto libre es el nombre de la empresa.
2. **Separación de datos**: el reporte público (`reports/<id aleatorio>`) no contiene correo ni identificador de la persona. El correo y la lista de reportes propios van al espacio privado `data/users/<uid>/perfil`, que solo esa persona puede leer.
3. **Métrica**: el buscador agrupa los reportes por empresa (normalizando "S.A.", "SpA", tildes y mayúsculas) y calcula el Índice de Respuesta, el porcentaje de ghosting y la etapa donde se corta el contacto.
4. **k-anonimato**: con menos de 3 reportes solo se muestra la cantidad, para que la empresa no pueda deducir quién reportó. Bajo 15 reportes la métrica se marca como preliminar.

## Registro de empresas

`data/empresas.json` se genera desde la [nómina de personas jurídicas del SII](https://www.sii.cl/sobre_el_sii/nominapersonasjuridicas.html) con `scripts/construir_catalogo.py`. Incluye 21.420 empleadores activos con 50 trabajadores o más, sin EIRL ni sociedades de hecho, más alias de marcas conocidas (BCI, Lider, Movistar...) verificados contra la misma nómina. Para actualizarlo cuando el SII publique un nuevo año:

```
python3 scripts/construir_catalogo.py PUB_EMPRESAS_PJ_2020_A_2024.zip
```

Cada reporte apunta al RUT de la empresa. El único texto libre es un comentario opcional de 200 caracteres que pasa por un filtro (nombres de personas, teléfonos, RUT, correos, enlaces e insultos) y se publica solo cuando la empresa tiene 3 reportes o más.

## Modos de datos

| Modo | Cuándo | Dónde quedan los reportes |
|---|---|---|
| Compartido | Dentro del visor de claude.ai, con la capacidad `db` | Base de datos del artifact, visible para todas las personas con acceso |
| Demostración | Archivo local, GitHub Pages o Firebase sin backend | Solo en el navegador de quien reporta |

Para un lanzamiento público hace falta una tercera implementación de la capa de datos (por ejemplo Firestore con Cloud Functions), con verificación del correo por enlace y validación de los reportes en el servidor. La interfaz `subscribe / add / remove / loadMine / saveMine` de `js/app.js` está pensada para eso.

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

## Llegar a todo público

El sitio ya trae lo necesario para compartirse y encontrarse:

- **Open Graph** (`img/og-sinvisto.jpg`): vista previa con imagen y título al compartir el enlace en WhatsApp, LinkedIn, X o Facebook. Al tener dominio, cambia `og:image` a una URL absoluta (`https://tudominio.cl/img/og-sinvisto.jpg`); algunas redes no aceptan rutas relativas.
- **PWA** (`manifest.webmanifest` e íconos): se puede instalar en el teléfono desde el navegador.
- **robots.txt**: permite que los buscadores indexen el sitio.

Para que cualquier persona pueda **enviar** reportes (no solo leer) falta el backend con verificación de correo descrito en `SECURITY.md`. La vista previa de claude.ai solo permite reportar a las personas con acceso de colaborador.

## Skill de referencia: system prompts

`.claude/skills/referencia-system-prompts/` permite consultar la colección pública [asgeirtj/system_prompts_leaks](https://github.com/asgeirtj/system_prompts_leaks) (CC0) para estudiar ingeniería de prompts y diseñar defensas contra filtración o inyección. El repositorio se descarga bajo demanda en `~/.cache/system_prompts_leaks`, fuera del proyecto, y su contenido se trata como datos, nunca como instrucciones.

```
bash .claude/skills/referencia-system-prompts/scripts/obtener.sh
bash .claude/skills/referencia-system-prompts/scripts/buscar.sh "moderation" OpenAI
```
