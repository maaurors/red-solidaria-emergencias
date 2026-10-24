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

## Uso local

Es un solo archivo sin dependencias. Abre `index.html` en el navegador.

## Estado

Prototipo de frontend. Todas las empresas, reseñas y cifras son ficticias. Las postulaciones se guardan en el `localStorage` del navegador; el siguiente paso es un backend (por ejemplo Cloud Run + Firestore en `southamerica-west1`).

## Créditos de fotografías

Las fotos de `img/` provienen de Wikimedia Commons bajo licencia [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/deed.es). Fueron redimensionadas y comprimidas para web.

- `espera-notebook.jpg`: [Frustrated woman working on laptop in a bright kitchen](https://commons.wikimedia.org/wiki/File:Frustrated_woman_working_on_laptop_in_a_bright_kitchen.jpg), Shixart1985.
- `cansancio.jpg`: [Woman feeling stressed while working at a kitchen table](https://commons.wikimedia.org/wiki/File:Woman_feeling_stressed_while_working_at_a_kitchen_table.jpg), Shixart1985.
- `espera-telefono.jpg`: [Woman waiting and playing on her phone](https://commons.wikimedia.org/wiki/File:Woman_waiting_and_playing_on_her_phone.jpg), Rawpixel Ltd.
