
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Platform, Animated, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORES, ESP, TIPO, SOMBRA, RADIO, saludoHora } from "./src/tema";
import { ICONOS_PESTANA, IconoSalir } from "./src/iconos";
import { cerrarSesion, registrarExpiracion, api } from "./src/api";
import { Badge, Toast } from "./src/componentes";
import { Image } from "react-native";
import Login from "./src/pantallas/Login";
import Deficit from "./src/pantallas/Deficit";
import Donar from "./src/pantallas/Donar";
import MisDonaciones from "./src/pantallas/MisDonaciones";
import Turnos from "./src/pantallas/Turnos";
import Coordinar from "./src/pantallas/Coordinar";
import Mapa from "./src/pantallas/Mapa";
import EnVivo from "./src/pantallas/EnVivo";
import Escanear from "./src/pantallas/Escanear";
import Perfil from "./src/pantallas/Perfil";
import Impacto from "./src/pantallas/Impacto";
import Inicio from "./src/pantallas/Inicio";
import Tutorial from "./src/pantallas/Tutorial";
import EmergenciasVivo from "./src/pantallas/EmergenciasVivo";
import ReportarEmergencia from "./src/pantallas/ReportarEmergencia";
import ChatSOS from "./src/pantallas/ChatSOS";
import Registro from "./src/pantallas/Registro";
import Acopio from "./src/pantallas/Acopio";
import { LinearGradient } from "expo-linear-gradient";

const { width: ANCHO } = Dimensions.get("window");

const PESTANAS = {
  DONANTE: [
    { clave: "inicio", titulo: "Inicio", Componente: Inicio },
    { clave: "envivo", titulo: "En Vivo", Componente: EmergenciasVivo },
    { clave: "mapa", titulo: "Mapa", Componente: Mapa },
    { clave: "donar", titulo: "Donar", Componente: Donar },
    { clave: "mias", titulo: "Aportes", Componente: MisDonaciones },
    { clave: "chat", titulo: "Chat", Componente: ChatSOS },
  ],
  VOLUNTARIO: [
    { clave: "inicio", titulo: "Inicio", Componente: Inicio },
    { clave: "mapa", titulo: "Mapa", Componente: Mapa },
    { clave: "deficit", titulo: "Urgencias", Componente: Deficit },
    { clave: "turnos", titulo: "Turnos", Componente: Turnos },
    { clave: "chat", titulo: "Chat", Componente: ChatSOS },
    { clave: "impacto", titulo: "Impacto", Componente: Impacto },
  ],
  COORDINADOR: [
    { clave: "inicio", titulo: "Inicio", Componente: Inicio },
    { clave: "mapa", titulo: "Mapa", Componente: Mapa },
    { clave: "coordinar", titulo: "Asignar", Componente: Coordinar },
    { clave: "escanear", titulo: "Escanear", Componente: Escanear },
    { clave: "chat", titulo: "Chat", Componente: ChatSOS },
    { clave: "impacto", titulo: "Impacto", Componente: Impacto },
  ],
};

const ROL_LEGIBLE = { DONANTE: "Donante", VOLUNTARIO: "Voluntaria/o", COORDINADOR: "Coordinación" };

// ─── Splash Screen Animado ────────────────────────────────────

function SplashScreen({ onFin }) {
  const escala = useRef(new Animated.Value(0.5)).current;
  const opacidad = useRef(new Animated.Value(0)).current;
  const selloRotacion = useRef(new Animated.Value(-15)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(escala, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 8 }),
        Animated.timing(opacidad, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(selloRotacion, { toValue: -6, useNativeDriver: true, speed: 6, bounciness: 12 }),
      ]),
      Animated.delay(800),
      Animated.timing(opacidad, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => onFin());
  }, [escala, opacidad, selloRotacion, onFin]);

  return (
    <View style={estilos.splash}>
      <Animated.View style={{
        opacity: opacidad,
        transform: [{ scale: escala }],
      }}>
        <Animated.View style={[estilos.splashSello, {
          transform: [{ rotate: selloRotacion.interpolate({ inputRange: [-15, -6], outputRange: ["-15deg", "-6deg"] }) }],
        }]}>
          <Text style={estilos.splashSelloTexto}>RSE</Text>
        </Animated.View>
        <Text style={estilos.splashTitulo}>Red Solidaria</Text>
        <Text style={estilos.splashSubtitulo}>de Emergencias</Text>
      </Animated.View>
    </View>
  );
}

export default function App() {
  const [mostrarTutorial, setMostrarTutorial] = useState(true);
  const [splash, setSplash] = useState(true);
  const [registroOpen, setRegistroOpen] = useState(false);
  const [sesion, setSesion] = useState(null);
  const [pestana, setPestana] = useState("inicio");
  const [urgentes, setUrgentes] = useState(0);
  const [perfilVisible, setPerfilVisible] = useState(false);
  const transicion = useRef(new Animated.Value(1)).current;
  const indicadorX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    registrarExpiracion(() => setSesion(null));
  }, []);

  // Cargar KPIs para badge de urgencias
  useEffect(() => {
    if (!sesion) return;
    const cargarKPI = async () => {
      try {
        const kpi = await api("/estadisticas/kpi", { sinCache: true });
        setUrgentes(kpi.urgentes_sin_cubrir || 0);
      } catch { /* silencioso */ }
    };
    cargarKPI();
    const intervalo = setInterval(cargarKPI, 30000);
    return () => clearInterval(intervalo);
  }, [sesion]);

  const cambiarPestana = useCallback((clave) => {
    if (clave === pestana) return;
    const pestanas = PESTANAS[sesion?.rol] || PESTANAS.DONANTE;
    const idx = pestanas.findIndex(p => p.clave === clave);
    const anchoTab = ANCHO / pestanas.length;

    Animated.parallel([
      Animated.timing(transicion, { toValue: 0, duration: 80, useNativeDriver: true }),
      Animated.spring(indicadorX, { toValue: idx * anchoTab, useNativeDriver: true, speed: 20, bounciness: 3 }),
    ]).start(() => {
      setPestana(clave);
      Animated.timing(transicion, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    });
  }, [pestana, transicion, indicadorX, sesion]);

  // Mover indicador a la posicion correcta al cambiar de sesion/rol
  useEffect(() => {
    if (sesion) {
      const pestanas = PESTANAS[sesion.rol] || PESTANAS.DONANTE;
      const idx = pestanas.findIndex(p => p.clave === pestana);
      const anchoTab = ANCHO / pestanas.length;
      indicadorX.setValue(idx * anchoTab);
    }
  }, [sesion?.rol, pestana, indicadorX]);

  // Splash
  if (splash) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.navy }}>
        <StatusBar barStyle="light-content" backgroundColor={COLORES.navy} />
        <SplashScreen onFin={() => setSplash(false)} />
      </SafeAreaView>
    );
  }

  // Tutorial
  if (mostrarTutorial) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.navy }}>
        <StatusBar barStyle="light-content" backgroundColor={COLORES.navy} />
        <Tutorial onFinalizar={() => setMostrarTutorial(false)} />
      </SafeAreaView>
    );
  }

  // Registro
  if (registroOpen && !sesion) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.navy }}>
        <StatusBar barStyle="light-content" backgroundColor={COLORES.navy} />
        <Registro onLogin={(token, s) => { setSesion(s); setPestana("inicio"); setRegistroOpen(false); }} setRegistroOpen={setRegistroOpen} />
      </SafeAreaView>
    );
  }

  // Login
  if (!sesion) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.navy }}>
        <StatusBar barStyle="light-content" backgroundColor={COLORES.navy} />
        <Login alEntrar={(s) => { setSesion(s); setPestana("inicio"); }} abrirRegistro={() => setRegistroOpen(true)} />
      </SafeAreaView>
    );
  }

  const pestanas = PESTANAS[sesion.rol] || PESTANAS.DONANTE;
  
  // Si la pestana actual no esta en las de la barra (ej: sub-pantalla),
  // se busca el Componente hardcodeado, de lo contrario se saca de pestanas.
  let Pantalla;
  if (pestana === "reportar_emergencia") {
    Pantalla = ReportarEmergencia;
  } else if (pestana === "deficit") {
    Pantalla = Deficit;
  } else {
    const activa = pestanas.find((p) => p.clave === pestana) || pestanas[0];
    Pantalla = activa.Componente;
  }

  const iniciales = sesion.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const anchoTab = ANCHO / pestanas.length;

  return (
    <SafeAreaView style={estilos.raiz} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORES.navy} />

      {/* Cabecera premium con gradiente */}
      <View style={estilos.cabecera}>
        <View style={estilos.cabeceraFila}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setPerfilVisible(true)}>
            {sesion.avatar ? (
              <Image source={{ uri: sesion.avatar }} style={estilos.avatar} />
            ) : (
              <View style={estilos.avatar}>
                <Text style={estilos.avatarTexto}>{iniciales}</Text>
              </View>
            )}
            <View style={estilos.avatarBrillo} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: ESP.m }}>
            <Text style={estilos.saludo}>{saludoHora()}, {sesion.nombre.split(" ")[0]}</Text>
            <Text style={estilos.rol}>{ROL_LEGIBLE[sesion.rol] || sesion.rol}</Text>
          </View>
          <TouchableOpacity
            style={estilos.salirBoton}
            onPress={() => { cerrarSesion(); setSesion(null); }}
            activeOpacity={0.7}
          >
            <IconoSalir color={COLORES.blanco} size={18} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Contenido con transicion */}
      <Animated.View style={{ flex: 1, backgroundColor: COLORES.fondo, opacity: transicion }}>
        {/* Pasamos un pseudo-navigation object para poder cambiar de pestana desde las pantallas */}
        <Pantalla sesion={sesion} navigation={{ cambiarPestana }} />
      </Animated.View>

      {/* Tab Bar Premium Glassmorphism */}
      <View style={[estilos.barraWrapper]}>
        <View style={[estilos.barra, SOMBRA.media]}>
          {/* Indicador deslizante */}
          <Animated.View
            style={[estilos.barraIndicador, {
              width: anchoTab - 24,
              transform: [{ translateX: Animated.add(indicadorX, 12) }],
            }]}
          />
          {pestanas.map((p) => {
            const activaEsta = pestana === p.clave;
            const Icono = ICONOS_PESTANA[p.clave];
            const color = activaEsta ? COLORES.cyan : COLORES.textoTerciario;
            const mostrarBadge = p.clave === "mapa" && urgentes > 0;

            return (
              <TouchableOpacity
                key={p.clave}
                style={estilos.pestanaBoton}
                onPress={() => cambiarPestana(p.clave)}
                activeOpacity={0.7}
              >
                <View style={estilos.pestanaIcono}>
                  {Icono ? <Icono color={color} /> : null}
                  {mostrarBadge && <Badge count={urgentes} />}
                </View>
                <Text style={[
                  estilos.pestanaTexto,
                  { color },
                  activaEsta && { fontWeight: "700", color: COLORES.cyan },
                ]}>
                  {p.titulo}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Perfil 
        visible={perfilVisible} 
        alCerrar={() => setPerfilVisible(false)} 
        sesion={sesion} 
        onSesionActualizada={setSesion} 
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: COLORES.navy, paddingTop: Platform.OS === "android" ? 30 : 0 },
  // Splash
  splash: { flex: 1, backgroundColor: COLORES.navy, alignItems: "center", justifyContent: "center" },
  splashSello: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: COLORES.coral, alignItems: "center", justifyContent: "center",
    alignSelf: "center", marginBottom: ESP.l,
    ...SOMBRA.glow(COLORES.coral),
  },
  splashSelloTexto: { color: COLORES.blanco, fontWeight: "900", fontSize: 26, letterSpacing: 1.5 },
  splashTitulo: { ...TIPO.display, color: COLORES.blanco, textAlign: "center" },
  splashSubtitulo: { ...TIPO.titulo, color: COLORES.coral, textAlign: "center", marginTop: -2 },
  // Cabecera
  cabecera: {
    backgroundColor: COLORES.navy,
    paddingHorizontal: ESP.l,
    paddingVertical: ESP.m + 2,
  },
  cabeceraFila: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORES.coral,
    alignItems: "center", justifyContent: "center",
  },
  avatarTexto: { color: COLORES.blanco, fontWeight: "800", fontSize: 15 },
  avatarBrillo: {
    position: "absolute", top: 2, right: 2,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: COLORES.coralClaro, opacity: 0.6,
  },
  saludo: { color: COLORES.blanco, ...TIPO.subtitulo },
  rol: { color: COLORES.sobreOscuro, ...TIPO.micro, textTransform: "uppercase", marginTop: 1 },
  salirBoton: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  // Tab bar
  barraWrapper: {
    backgroundColor: COLORES.superficie,
    borderTopWidth: 1,
    borderTopColor: COLORES.bordeSutil,
    paddingBottom: Platform.OS === "ios" ? 20 : 6,
    paddingTop: 6,
  },
  barra: {
    flexDirection: "row",
    position: "relative",
    backgroundColor: COLORES.superficie,
  },
  barraIndicador: {
    position: "absolute",
    top: -6,
    height: 3,
    backgroundColor: COLORES.cyan,
    borderRadius: 1.5,
    ...SOMBRA.glow(COLORES.cyan),
  },
  pestanaBoton: { flex: 1, alignItems: "center", paddingVertical: 4 },
  pestanaIcono: {
    paddingHorizontal: 14, paddingVertical: 4, borderRadius: RADIO.pill,
    position: "relative",
  },
  pestanaTexto: { fontSize: 10.5, marginTop: 2, fontWeight: "500" },
});
