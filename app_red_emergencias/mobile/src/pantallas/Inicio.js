import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Alert } from "react-native";
import { COLORES, ESP, TIPO, SOMBRA, RADIO } from "../tema";
import { Aparecer } from "../componentes";
import { IconoCorazon, IconoEstrella, IconoPulso } from "../iconos";
import { api } from "../api";
import { LinearGradient } from "expo-linear-gradient";

export default function Inicio({ navigation, sesion }) {
  const [estrellas, setEstrellas] = useState(0);
  const [animacionGlow] = useState(new Animated.Value(0));

  useEffect(() => {
    const cargarEstrellas = async () => {
      try {
        const data = await api("/estadisticas/ranking");
        const miUsuario = data.find(u => u.id_usuario === sesion?.id_usuario);
        if (miUsuario) setEstrellas(miUsuario.estrellas);
      } catch (e) {
        // Demo mode
      }
    };
    cargarEstrellas();

    Animated.loop(
      Animated.sequence([
        Animated.timing(animacionGlow, { toValue: 1, duration: 2500, useNativeDriver: false }),
        Animated.timing(animacionGlow, { toValue: 0, duration: 2500, useNativeDriver: false }),
      ])
    ).start();
  }, [sesion]);

  const glowOpacity = animacionGlow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });
  const glowRadius = animacionGlow.interpolate({ inputRange: [0, 1], outputRange: [10, 25] });

  const enviarSOS = () => {
    Alert.alert(
      "Alerta SOS",
      "Tu ubicación actual será transmitida inmediatamente a los coordinadores cercanos y servicios de rescate. ¿Confirmar SOS?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "EMITIR SOS", 
          style: "destructive",
          onPress: () => Alert.alert("¡Enviado!", "Tu señal de socorro crítica ha sido transmitida. Mantén la calma.") 
        }
      ]
    );
  };

  return (
    <LinearGradient colors={["#0F172A", "#1E293B", "#0F172A"]} style={estilos.raiz}>
      <ScrollView contentContainerStyle={estilos.scroll} showsVerticalScrollIndicator={false}>

        {/* Header Personalizado */}
        <Aparecer retraso={100}>
          <View style={estilos.headerSuper}>
            <View>
              <Text style={estilos.saludo}>Hola, {sesion?.nombre?.split(" ")[0] || "Heroe"}</Text>
              <Text style={estilos.rolBadge}>{sesion?.rol || "DONANTE"}</Text>
            </View>
            <View style={estilos.avatarPlaceholder}>
              <IconoEstrella color={COLORES.blanco} size={20} />
            </View>
          </View>
        </Aparecer>

        {/* Tarjeta de Impacto (Glassmorphism) */}
        <Aparecer retraso={200}>
          <Animated.View style={[estilos.glassCard, {
            shadowColor: COLORES.cyan,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: glowOpacity,
            shadowRadius: glowRadius,
            elevation: 10,
            marginBottom: ESP.xxl,
          }]}>
            <LinearGradient
              colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0.03)"]}
              style={estilos.glassInner}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <View style={estilos.impactoTop}>
                <View style={estilos.impactoIconoGlow}>
                  <IconoEstrella size={28} color={COLORES.cyan} />
                </View>
                <Text style={estilos.impactoNivel}>Nivel {Math.floor(estrellas / 10) + 1}</Text>
              </View>
              <Text style={estilos.estrellasTexto}>{estrellas} Puntos de Luz</Text>
              <View style={estilos.barraProgresoBg}>
                <LinearGradient
                  colors={[COLORES.cyan, COLORES.azul]}
                  style={[estilos.barraProgresoFill, { width: `${Math.min(100, (estrellas % 10) * 10)}%` }]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
              </View>
              <Text style={estilos.impactoSubtitulo}>Te faltan {10 - (estrellas % 10)} puntos para el proximo nivel.</Text>
            </LinearGradient>
          </Animated.View>
        </Aparecer>

        <Text style={estilos.seccionTitulo}>Centro de Accion</Text>

        {/* BOTON DE PANICO SOS */}
        <Aparecer retraso={250}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[estilos.cardPrincipal, { marginBottom: ESP.l, borderWidth: 1, borderColor: COLORES.error }]}
            onPress={enviarSOS}
          >
            <LinearGradient
              colors={["#7F1D1D", "#DC2626"]}
              style={estilos.cardGradiente}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <View style={estilos.cardContent}>
                <View style={estilos.cardTextWrapper}>
                  <Text style={[estilos.cardTituloP, { color: COLORES.blanco, fontWeight: "900" }]}>SOS INMEDIATO</Text>
                  <Text style={[estilos.cardSubP, { color: "rgba(255,255,255,0.8)" }]}>Emitir señal de socorro crítica</Text>
                </View>
                <View style={[estilos.cardIconoWrapper, { backgroundColor: "rgba(255,0,0,0.2)" }]}>
                  <IconoPulso size={32} color={COLORES.blanco} />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Aparecer>

        {/* Tarjeta Principal: Generar Compromiso */}
        <Aparecer retraso={300}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={estilos.cardPrincipal}
            onPress={() => navigation?.cambiarPestana("donar")}
          >
            <LinearGradient
              colors={[COLORES.coral, "#E11D48"]}
              style={estilos.cardGradiente}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <View style={estilos.cardContent}>
                <View style={estilos.cardTextWrapper}>
                  <Text style={estilos.cardTituloP}>Generar Compromiso</Text>
                  <Text style={estilos.cardSubP}>Ofrece alimentos, herramientas o refugio hoy.</Text>
                </View>
                <View style={estilos.cardIconoWrapper}>
                  <IconoCorazon size={28} color={COLORES.coral} />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Aparecer>

        {/* Botones Secundarios */}
        <View style={estilos.filaTarjetas}>
          <Aparecer retraso={400} estilo={{ flex: 1, marginRight: ESP.m }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation?.cambiarPestana("envivo")}
            >
              <LinearGradient
                colors={["rgba(56, 189, 248, 0.15)", "rgba(56, 189, 248, 0.05)"]}
                style={estilos.tarjetaChica}
              >
                <View style={[estilos.iconoChico, { backgroundColor: "rgba(56, 189, 248, 0.2)" }]}>
                  <IconoPulso color="#38BDF8" size={24} />
                </View>
                <Text style={estilos.tarjetaChicaTitulo}>Radar En Vivo</Text>
                <Text style={estilos.tarjetaChicaSub}>Zonas criticas</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Aparecer>

          <Aparecer retraso={500} estilo={{ flex: 1 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation?.cambiarPestana("mapa")}
            >
              <LinearGradient
                colors={["rgba(16, 185, 129, 0.15)", "rgba(16, 185, 129, 0.05)"]}
                style={estilos.tarjetaChica}
              >
                <View style={[estilos.iconoChico, { backgroundColor: "rgba(16, 185, 129, 0.2)" }]}>
                  <IconoEstrella color="#10B981" size={24} />
                </View>
                <Text style={estilos.tarjetaChicaTitulo}>Mapa Calor</Text>
                <Text style={estilos.tarjetaChicaSub}>Ver albergues</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Aparecer>
        </View>

      </ScrollView>
    </LinearGradient>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  scroll: { padding: ESP.l, paddingBottom: 120, paddingTop: 60 },

  headerSuper: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ESP.xxl,
  },
  saludo: { ...TIPO.display, color: COLORES.blanco, fontSize: 28, marginBottom: 4 },
  rolBadge: {
    ...TIPO.micro,
    color: COLORES.cyan,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase"
  },
  avatarPlaceholder: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center"
  },

  glassCard: {
    borderRadius: 24,
    backgroundColor: "transparent",
  },
  glassInner: {
    borderRadius: 24,
    padding: ESP.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  impactoTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ESP.m,
  },
  impactoIconoGlow: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(34, 211, 238, 0.15)",
    alignItems: "center", justifyContent: "center",
    marginRight: ESP.m,
  },
  impactoNivel: { ...TIPO.subtitulo, color: COLORES.cyan, fontWeight: "700" },
  estrellasTexto: { ...TIPO.display, color: COLORES.blanco, fontSize: 36, marginBottom: ESP.l },

  barraProgresoBg: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    marginBottom: ESP.s,
    overflow: "hidden"
  },
  barraProgresoFill: { height: "100%", borderRadius: 3 },
  impactoSubtitulo: { ...TIPO.micro, color: "rgba(255,255,255,0.6)" },

  seccionTitulo: { ...TIPO.subtitulo, color: COLORES.blanco, marginBottom: ESP.m, marginLeft: 4, fontSize: 18, fontWeight: "700" },

  cardPrincipal: {
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: ESP.m,
    ...SOMBRA.glow(COLORES.coral),
  },
  cardGradiente: { padding: ESP.xl },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTextWrapper: { flex: 1, paddingRight: ESP.m },
  cardTituloP: { ...TIPO.subtitulo, color: COLORES.blanco, fontSize: 22, fontWeight: "700", marginBottom: 6 },
  cardSubP: { ...TIPO.cuerpo, color: "rgba(255,255,255,0.9)", fontSize: 14 },
  cardIconoWrapper: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORES.blanco,
    alignItems: "center", justifyContent: "center",
  },

  filaTarjetas: { flexDirection: "row" },
  tarjetaChica: {
    padding: ESP.l,
    alignItems: "flex-start",
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    minHeight: 140,
  },
  iconoChico: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
    marginBottom: ESP.m,
  },
  tarjetaChicaTitulo: { ...TIPO.subtitulo, color: COLORES.blanco, marginBottom: 4 },
  tarjetaChicaSub: { ...TIPO.micro, color: "rgba(255,255,255,0.6)" },
});
