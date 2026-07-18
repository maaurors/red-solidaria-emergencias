import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORES, TIPO, ESP, RADIO, SOMBRA } from "../tema";
import { IconoMapa, IconoCopa, IconoCorazon } from "../iconos";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

const PASOS = [
  {
    id: "1",
    titulo: "Descubre Emergencias",
    descripcion: "Mira en el mapa en tiempo real dónde se necesita ayuda. Filtra por urgencias, albergues y centros de acopio.",
    icono: <IconoMapa size={80} color={COLORES.cyan} />,
  },
  {
    id: "2",
    titulo: "Haz tu Compromiso",
    descripcion: "No importa si tienes poco, todo suma. Genera un compromiso de donación y llévalo al centro más cercano.",
    icono: <IconoCorazon size={80} color={COLORES.coral} />,
  },
  {
    id: "3",
    titulo: "Conviértete en Héroe",
    descripcion: "Gana estrellas por cada unidad que dones. Sube en el ranking y demuestra tu impacto solidario al mundo.",
    icono: <IconoCopa size={80} color="#FFD700" />,
  },
];

export default function Tutorial({ onFinalizar }) {
  const [paso, setPaso] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleSiguiente = () => {
    if (paso < PASOS.length - 1) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start(() => {
        setPaso(paso + 1);
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      });
    } else {
      onFinalizar();
    }
  };

  const current = PASOS[paso];

  return (
    <View style={estilos.raiz}>
      <LinearGradient colors={[COLORES.navy, COLORES.fondo]} style={StyleSheet.absoluteFillObject} />

      <SafeAreaView style={estilos.contenedor}>
        {/* Cabecera Paginacion */}
        <View style={estilos.paginador}>
          {PASOS.map((_, i) => (
            <View
              key={i}
              style={[
                estilos.punto,
                i === paso ? estilos.puntoActivo : null,
              ]}
            />
          ))}
        </View>

        <Animated.View style={[estilos.contenido, { opacity: fadeAnim }]}>
          <View style={estilos.circuloIcono}>
            {current.icono}
          </View>
          <Text style={estilos.titulo}>{current.titulo}</Text>
          <Text style={estilos.descripcion}>{current.descripcion}</Text>
        </Animated.View>

        <TouchableOpacity 
          style={estilos.boton} 
          activeOpacity={0.8}
          onPress={handleSiguiente}
        >
          <LinearGradient 
            colors={[COLORES.coral, COLORES.coralClaro]} 
            style={estilos.botonGradiente}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Text style={estilos.botonTexto}>
              {paso === PASOS.length - 1 ? "Comenzar Aventura" : "Siguiente"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: COLORES.fondo },
  contenedor: { flex: 1, padding: ESP.xl, justifyContent: "space-between" },
  paginador: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: ESP.xl,
  },
  punto: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORES.borde,
    marginHorizontal: 6,
  },
  puntoActivo: {
    width: 24,
    backgroundColor: COLORES.cyan,
    ...SOMBRA.glow(COLORES.cyan),
  },
  contenido: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  circuloIcono: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORES.superficieElevada,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: ESP.xxl,
    borderWidth: 2,
    borderColor: COLORES.bordeSutil,
    ...SOMBRA.fuerte,
  },
  titulo: {
    ...TIPO.display,
    color: COLORES.texto,
    textAlign: "center",
    marginBottom: ESP.m,
  },
  descripcion: {
    ...TIPO.subtitulo,
    color: COLORES.blanco,
    opacity: 0.85,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: ESP.m,
  },
  boton: {
    width: "100%",
    borderRadius: RADIO.xl,
    overflow: "hidden",
    marginBottom: ESP.xl,
    ...SOMBRA.glow(COLORES.coral),
  },
  botonGradiente: {
    paddingVertical: ESP.l,
    alignItems: "center",
    justifyContent: "center",
  },
  botonTexto: {
    ...TIPO.titulo,
    color: COLORES.blanco,
    fontSize: 18,
  }
});
