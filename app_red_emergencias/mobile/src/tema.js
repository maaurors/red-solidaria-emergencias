// Design system profesional: todos los valores visuales de la app.
// Gradientes, animaciones, haptics, sombras avanzadas.

import { Appearance } from 'react-native';

const colorScheme = Appearance.getColorScheme();
const isDarkMode = colorScheme === 'dark' || colorScheme === null; // Default to dark

const COLORES_BASE = {
  coral: "#FF2A55",
  coralClaro: "#FF4D79",
  naranja: "#FF9F0A",
  naranjaClaro: "#FFB340",
  teal: "#30D158",
  tealClaro: "#34C759",
  azul: "#0A84FF",
  azulClaro: "#64D2FF",
  cyan: "#00F0FF",
  exito: "#30D158",
  exitoClaro: "#34C759",
  error: "#FF453A",
  errorClaro: "#FF6961",
  warning: "#FF9F0A",
  blanco: "#FFFFFF",
  negro: "#000000",
  gris: "#8E9BB3",
};

const COLORES_OSCURO = {
  ...COLORES_BASE,
  navy: "#0E1428",
  navyClaro: "#1A243F",
  navyMedio: "#151D33",
  fondo: "#05070F",
  fondoCalido: "#090D18",
  superficie: "#121A30",
  superficieElevada: "#1C2742",
  texto: "#FFFFFF",
  textoSecundario: "#8E9BB3",
  textoTerciario: "#64728C",
  borde: "#1E2A45",
  bordeSutil: "#172033",
  bordeFoco: "#0A84FF",
  errorFondo: "rgba(255, 69, 58, 0.15)",
  exitoFondo: "rgba(48, 209, 88, 0.15)",
  warningFondo: "rgba(255, 159, 10, 0.15)",
  sobreOscuro: "#C9D4F0",
  overlay: "rgba(0, 0, 0, 0.8)",
  overlayClaro: "rgba(0, 0, 0, 0.6)",
  glass: "rgba(18, 26, 48, 0.75)",
};

const COLORES_CLARO = {
  ...COLORES_BASE,
  navy: "#0E1428", // Keep navy for some headers
  navyClaro: "#1A243F",
  navyMedio: "#151D33",
  fondo: "#F2F2F7",
  fondoCalido: "#E5E5EA",
  superficie: "#FFFFFF",
  superficieElevada: "#FFFFFF",
  texto: "#000000",
  textoSecundario: "#8E8E93",
  textoTerciario: "#C7C7CC",
  borde: "#C6C6C8",
  bordeSutil: "#E5E5EA",
  bordeFoco: "#0A84FF",
  errorFondo: "rgba(255, 69, 58, 0.1)",
  exitoFondo: "rgba(48, 209, 88, 0.1)",
  warningFondo: "rgba(255, 159, 10, 0.1)",
  sobreOscuro: "#4A4A4A",
  overlay: "rgba(0, 0, 0, 0.4)",
  overlayClaro: "rgba(0, 0, 0, 0.2)",
  glass: "rgba(255, 255, 255, 0.75)",
};

export const COLORES = isDarkMode ? COLORES_OSCURO : COLORES_CLARO;

export const GRADIENTES = {
  navy: ["#1E2A52", "#2C3E70"],
  coral: ["#E44D6B", "#F06B85"],
  teal: ["#1F8A70", "#2BA88A"],
  naranja: ["#EE8A3C", "#F5A55A"],
  azul: ["#3D7BD9", "#5B93E8"],
  oscuro: isDarkMode ? ["#141B33", "#1E2A52"] : ["#E5E5EA", "#F2F2F7"],
};

export const PRIORIDAD_COLOR = {
  ALTA: COLORES.coral,
  MEDIA: COLORES.naranja,
  BAJA: COLORES.teal,
};

export const SEMAFORO_COLOR = {
  ROJO: "#D9304F",
  AMARILLO: "#E8A63C",
  VERDE: "#1F8A70",
};

// Escala de espaciado (multiplos de 4)
export const ESP = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, xxxl: 48 };

// Escala tipografica
export const TIPO = {
  display: { fontSize: 30, fontWeight: "800", letterSpacing: -0.5 },
  titulo: { fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
  subtitulo: { fontSize: 16, fontWeight: "600" },
  cuerpo: { fontSize: 14.5, fontWeight: "400" },
  secundario: { fontSize: 13, fontWeight: "400" },
  micro: { fontSize: 11, fontWeight: "500", letterSpacing: 0.3 },
  cifra: { fontSize: 34, fontWeight: "800", letterSpacing: -1 },
  cifraPequena: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
};

// Elevacion consistente (iOS sombra + Android elevation)
// En Dark Mode la sombra no resalta tanto, se usa un ligero brillo o elevacion de color
export const SOMBRA = {
  suave: {
    shadowColor: isDarkMode ? "#000000" : "#8E8E93", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkMode ? 0.4 : 0.2, shadowRadius: 8, elevation: 4,
  },
  media: {
    shadowColor: isDarkMode ? "#000000" : "#8E8E93", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDarkMode ? 0.5 : 0.3, shadowRadius: 16, elevation: 8,
  },
  fuerte: {
    shadowColor: isDarkMode ? "#000000" : "#8E8E93", shadowOffset: { width: 0, height: 16 },
    shadowOpacity: isDarkMode ? 0.6 : 0.4, shadowRadius: 24, elevation: 12,
  },
  glow: (color) => ({
    shadowColor: color, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 16, elevation: 10,
  }),
};

export const RADIO = { xs: 6, s: 8, m: 12, l: 16, xl: 22, xxl: 28, pill: 999 };

// Duraciones de animacion estandarizadas
export const ANIM = {
  rapida: 150,
  normal: 250,
  suave: 350,
  lenta: 500,
};

// Saludo dinamico segun la hora
export function saludoHora() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}
