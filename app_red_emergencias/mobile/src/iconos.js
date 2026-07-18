// Iconografia SVG profesional — trazo consistente 1.8, esquinas redondeadas.
// Set propio que se ve mas profesional que mezclar fuentes de iconos.
import React from "react";
import Svg, { Path, Circle, Rect, Line } from "react-native-svg";

const base = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none" };
const trazo = (color) => ({ stroke: color, strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" });

export function IconoMapa({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 21s-6.5-5.2-6.5-10.2a6.5 6.5 0 1 1 13 0C18.5 15.8 12 21 12 21z" {...trazo(color)} />
      <Circle cx="12" cy="10.5" r="2.4" {...trazo(color)} />
    </Svg>
  );
}

export function IconoLista({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6h11M9 12h11M9 18h11" {...trazo(color)} />
      <Circle cx="4.5" cy="6" r="1.2" fill={color} />
      <Circle cx="4.5" cy="12" r="1.2" fill={color} />
      <Circle cx="4.5" cy="18" r="1.2" fill={color} />
    </Svg>
  );
}

export function IconoCorazon({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 20.5s-7.5-4.7-9.3-9.3C1.4 7.9 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.4 4.3 6.7-1.8 4.6-9.3 9.3-9.3 9.3z" {...trazo(color)} />
    </Svg>
  );
}

export function IconoCaja({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3.5 8.2 12 4l8.5 4.2v7.6L12 20l-8.5-4.2z" {...trazo(color)} />
      <Path d="M3.5 8.2 12 12.4l8.5-4.2M12 12.4V20" {...trazo(color)} />
    </Svg>
  );
}

export function IconoPulso({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M2.5 12h4l2.5-6.5L13 18l2.5-6h6" {...trazo(color)} />
    </Svg>
  );
}

export function IconoEscaner({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" {...trazo(color)} />
      <Path d="M4 12h16" {...trazo(color)} />
    </Svg>
  );
}

export function IconoCalendario({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3.5" y="5" width="17" height="15.5" rx="2.5" {...trazo(color)} />
      <Path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" {...trazo(color)} />
    </Svg>
  );
}

export function IconoAsignar({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7h11M15 7l-3.5-3.5M15 7l-3.5 3.5" {...trazo(color)} />
      <Path d="M20 17H9M9 17l3.5-3.5M9 17l3.5 3.5" {...trazo(color)} />
    </Svg>
  );
}

export function IconoSalir({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14M10 8l-4 4 4 4M6 12h10" {...trazo(color)} />
    </Svg>
  );
}

// ─── Iconos nuevos ────────────────────────────────────────────

export function IconoFiltro({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M6 12h12M9 18h6" {...trazo(color)} />
    </Svg>
  );
}

export function IconoTendencia({ color, size = 22, arriba = true }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {arriba ? (
        <Path d="M22 7l-8.5 8.5-5-5L2 17" {...trazo(color)} />
      ) : (
        <Path d="M22 17l-8.5-8.5-5 5L2 7" {...trazo(color)} />
      )}
      {arriba && <Path d="M16 7h6v6" {...trazo(color)} />}
      {!arriba && <Path d="M16 17h6v-6" {...trazo(color)} />}
    </Svg>
  );
}

export function IconoCheck({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" {...trazo(color)} />
      <Path d="M8 12.5l2.5 2.5 5-5" {...trazo(color)} />
    </Svg>
  );
}

export function IconoWarning({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3L2 20h20L12 3z" {...trazo(color)} />
      <Line x1="12" y1="10" x2="12" y2="14" {...trazo(color)} />
      <Circle cx="12" cy="17" r="0.5" fill={color} />
    </Svg>
  );
}

export function IconoReloj({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" {...trazo(color)} />
      <Path d="M12 7v5l3 3" {...trazo(color)} />
    </Svg>
  );
}

export function IconoUsuarios({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="7" r="3" {...trazo(color)} />
      <Path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" {...trazo(color)} />
      <Circle cx="17" cy="8" r="2.5" {...trazo(color)} />
      <Path d="M21 21v-1.5a3 3 0 0 0-2-2.8" {...trazo(color)} />
    </Svg>
  );
}

export function IconoStats({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="12" width="4" height="9" rx="1" {...trazo(color)} />
      <Rect x="10" y="6" width="4" height="15" rx="1" {...trazo(color)} />
      <Rect x="17" y="3" width="4" height="18" rx="1" {...trazo(color)} />
    </Svg>
  );
}

export function IconoCampana({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" {...trazo(color)} />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" {...trazo(color)} />
    </Svg>
  );
}

export function IconoBuscar({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="10.5" cy="10.5" r="6.5" {...trazo(color)} />
      <Path d="M15.5 15.5L21 21" {...trazo(color)} />
    </Svg>
  );
}

export function IconoSol({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="4" {...trazo(color)} />
      <Path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" {...trazo(color)} />
    </Svg>
  );
}

export function IconoAtardecer({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M17 18a5 5 0 0 0-10 0" {...trazo(color)} />
      <Line x1="12" y1="9" x2="12" y2="3" {...trazo(color)} />
      <Path d="M4.22 10.22l1.42 1.42M18.36 11.64l1.42-1.42M1 18h22" {...trazo(color)} />
    </Svg>
  );
}

export function IconoLuna({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" {...trazo(color)} />
    </Svg>
  );
}

export function IconoMas({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="12" y1="5" x2="12" y2="19" {...trazo(color)} />
      <Line x1="5" y1="12" x2="19" y2="12" {...trazo(color)} />
    </Svg>
  );
}

export function IconoMenos({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="5" y1="12" x2="19" y2="12" {...trazo(color)} />
    </Svg>
  );
}

export function IconoNavegar({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 11l19-9-9 19-2-8z" {...trazo(color)} />
    </Svg>
  );
}

export function IconoOjo({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" {...trazo(color)} />
      <Circle cx="12" cy="12" r="3" {...trazo(color)} />
    </Svg>
  );
}

export function IconoOjoCerrado({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" {...trazo(color)} />
      <Line x1="1" y1="1" x2="23" y2="23" {...trazo(color)} />
    </Svg>
  );
}

export function IconoCerrar({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="18" y1="6" x2="6" y2="18" {...trazo(color)} />
      <Line x1="6" y1="6" x2="18" y2="18" {...trazo(color)} />
    </Svg>
  );
}

export function IconoMedalla({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="6" {...trazo(color)} />
      <Path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" {...trazo(color)} />
    </Svg>
  );
}

export function IconoEstrella({ color, size = 22, relleno = false }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={relleno ? color : "none"}>
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" {...trazo(color)} />
    </Svg>
  );
}

export function IconoCopa({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8 21h8M12 17v4M7 4h10M5 4h14a2 2 0 0 1 2 2v2a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6V6a2 2 0 0 1 2-2z" {...trazo(color)} />
    </Svg>
  );
}

export function IconoInicio({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...trazo(color)} />
      <Path d="M9 22V12h6v10" {...trazo(color)} />
    </Svg>
  );
}

export function IconoUbicacion({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" {...trazo(color)} />
      <Circle cx="12" cy="10" r="3" {...trazo(color)} />
    </Svg>
  );
}

export function IconoPildora({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M10.5 20.5l-6-6a4.95 4.95 0 1 1 7-7l6 6a4.95 4.95 0 1 1-7 7z" {...trazo(color)} />
      <Line x1="8.5" y1="8.5" x2="15.5" y2="15.5" {...trazo(color)} />
    </Svg>
  );
}

export function IconoHospital({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" {...trazo(color)} />
      <Line x1="12" y1="9" x2="12" y2="15" {...trazo(color)} />
      <Line x1="9" y1="12" x2="15" y2="12" {...trazo(color)} />
    </Svg>
  );
}

export function IconoPregunta({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" {...trazo(color)} />
      <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" {...trazo(color)} />
      <Circle cx="12" cy="17" r="0.5" fill={color} />
    </Svg>
  );
}

export function IconoCompartir({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="18" cy="5" r="3" {...trazo(color)} />
      <Circle cx="6" cy="12" r="3" {...trazo(color)} />
      <Circle cx="18" cy="19" r="3" {...trazo(color)} />
      <Line x1="8.59" y1="13.51" x2="15.42" y2="17.49" {...trazo(color)} />
      <Line x1="15.41" y1="6.51" x2="8.59" y2="10.49" {...trazo(color)} />
    </Svg>
  );
}

export function IconoGps({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" {...trazo(color)} />
      <Circle cx="12" cy="12" r="3" {...trazo(color)} />
      <Line x1="12" y1="2" x2="12" y2="4" {...trazo(color)} />
      <Line x1="12" y1="20" x2="12" y2="22" {...trazo(color)} />
      <Line x1="2" y1="12" x2="4" y2="12" {...trazo(color)} />
      <Line x1="20" y1="12" x2="22" y2="12" {...trazo(color)} />
    </Svg>
  );
}

export function IconoEnviar({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M22 2L11 13" {...trazo(color)} />
      <Path d="M22 2L15 22L11 13L2 9L22 2Z" {...trazo(color)} />
    </Svg>
  );
}

export function IconoChat({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" {...trazo(color)} />
    </Svg>
  );
}

// Mapa de iconos por clave de pestana
export const ICONOS_PESTANA = {
  inicio: IconoInicio,
  mapa: IconoMapa,
  deficit: IconoLista,
  donar: IconoCorazon,
  mias: IconoCaja,
  envivo: IconoPulso,
  vivo: IconoPulso,
  escanear: IconoEscaner,
  turnos: IconoCalendario,
  coordinar: IconoAsignar,
  impacto: IconoEstrella,
  chat: IconoChat,
  acopio: IconoCaja,
};
