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
