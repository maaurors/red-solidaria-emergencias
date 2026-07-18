import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { COLORES, ESP, TIPO, RADIO, SOMBRA, SEMAFORO_COLOR } from "./tema";

function Barra({ albergue, maximo, onPress }) {
  const progreso = useRef(new Animated.Value(0)).current;
  const totalDeficit = albergue.faltantes.reduce((s, f) => s + Number(f.deficit), 0);
  const proporcion = maximo > 0 ? totalDeficit / maximo : 0;
  const color = SEMAFORO_COLOR[albergue.semaforo] || COLORES.teal;

  useEffect(() => {
    Animated.timing(progreso, {
      toValue: proporcion,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [proporcion, progreso]);

  const itemCritico = [...albergue.faltantes]
    .sort((a, b) => Number(b.deficit) - Number(a.deficit))[0];

  return (
    <TouchableOpacity activeOpacity={0.75} onPress={() => onPress(albergue)}>
      <View style={estilos.filaBarra}>
        <View style={estilos.etiquetas}>
          <Text style={estilos.nombreAlbergue} numberOfLines={1}>{albergue.nombre}</Text>
          <Text style={estilos.deficitTotal}>{totalDeficit} u.</Text>
        </View>
        <View style={estilos.pista}>
          <Animated.View
            style={[estilos.relleno, {
              backgroundColor: color,
              width: progreso.interpolate({ inputRange: [0, 1], outputRange: ["2%", "100%"] }),
            }]}
          />
        </View>
        {itemCritico && (
          <Text style={estilos.critico} numberOfLines={1}>
            Lo mas urgente: {itemCritico.deficit} de {itemCritico.item}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function GraficoPrioridad({ albergues, onSeleccionar }) {
  const conDeficit = (albergues || [])
    .map((a) => ({ ...a, total: a.faltantes.reduce((s, f) => s + Number(f.deficit), 0) }))
    .filter((a) => a.total > 0)
    .sort((a, b) => b.total - a.total);

  if (conDeficit.length === 0) return null;

  const maximo = conDeficit[0].total;

  return (
    <View style={[estilos.tarjeta, SOMBRA.suave]}>
      <Text style={estilos.titulo}>Donde se necesita mas ayuda hoy</Text>
      <Text style={estilos.subtitulo}>
        Deficit total por albergue, en tiempo real. Toca uno para donar ahi.
      </Text>
      {conDeficit.map((a) => (
        <Barra key={a.id_albergue} albergue={a} maximo={maximo} onPress={onSeleccionar} />
      ))}
      <View style={estilos.leyenda}>
        {[["ROJO", "Urgente"], ["AMARILLO", "Moderado"], ["VERDE", "Cubierto"]].map(([clave, texto]) => (
          <View key={clave} style={estilos.leyendaItem}>
            <View style={[estilos.punto, { backgroundColor: SEMAFORO_COLOR[clave] }]} />
            <Text style={estilos.leyendaTexto}>{texto}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: COLORES.superficie,
    borderRadius: RADIO.l,
    borderWidth: 1,
    borderColor: COLORES.borde,
    padding: ESP.l,
    marginBottom: ESP.l,
  },
  titulo: { ...TIPO.subtitulo, color: COLORES.texto },
  subtitulo: { ...TIPO.secundario, color: COLORES.textoSecundario, marginTop: 2, marginBottom: ESP.m },
  filaBarra: { marginBottom: ESP.m },
  etiquetas: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  nombreAlbergue: { ...TIPO.cuerpo, fontWeight: "600", color: COLORES.texto, flex: 1, marginRight: ESP.s },
  deficitTotal: { ...TIPO.cuerpo, fontWeight: "800", color: COLORES.navy },
  pista: { height: 10, backgroundColor: COLORES.borde, borderRadius: 5, overflow: "hidden" },
  relleno: { height: 10, borderRadius: 5 },
  critico: { ...TIPO.micro, color: COLORES.textoSecundario, marginTop: 3 },
  leyenda: { flexDirection: "row", justifyContent: "center", marginTop: ESP.s, gap: ESP.l },
  leyendaItem: { flexDirection: "row", alignItems: "center" },
  punto: { width: 9, height: 9, borderRadius: 5, marginRight: 5 },
  leyendaTexto: { ...TIPO.micro, color: COLORES.textoSecundario },
});
