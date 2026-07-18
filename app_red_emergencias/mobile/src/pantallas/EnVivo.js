
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, Animated,
} from "react-native";
import { api } from "../api";
import { COLORES, ESP, TIPO, SOMBRA, RADIO } from "../tema";
import {
  Tarjeta, Cargando, Encabezado, Aparecer, ContadorAnimado,
  BarraProgreso, MiniGrafico, Etiqueta, ProgressRing,
} from "../componentes";
import { IconoCorazon, IconoWarning, IconoUsuarios, IconoTendencia, IconoMedalla } from "../iconos";

export default function EnVivo() {
  const [datos, setDatos] = useState(null);
  const [refrescando, setRefrescando] = useState(false);
  const pulso = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const bucle = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1.15, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    bucle.start();
    return () => bucle.stop();
  }, [pulso]);

  const cargar = useCallback(async () => {
    try {
      const r = await api("/estadisticas", { sinCache: true });
      setDatos(r);
    } catch { /* silencioso: se reintentar al refrescar */ }
  }, []);

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 15000);
    return () => clearInterval(interval);
  }, [cargar]);

  const refrescar = async () => {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  };

  if (!datos) return <Cargando />;

  const historial = datos.historial7d || [];
  const datosGrafico = historial.map(h => h.unidades);

  return (
    <ScrollView
      style={estilos.contenedor}
      contentContainerStyle={{ paddingBottom: ESP.xxl * 2 }}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[COLORES.navy]} />}
      showsVerticalScrollIndicator={false}
    >
      <Encabezado
        titulo="Panel en vivo"
        subtitulo="Datos en tiempo real"
        extra={
          <Animated.View style={{ transform: [{ scale: pulso }] }}>
            <View style={estilos.vivoIndicador}>
              <View style={estilos.vivoPunto} />
              <Text style={estilos.vivoTexto}>VIVO</Text>
            </View>
          </Animated.View>
        }
      />

      {/* 4 KPIs Hero */}
      <View style={estilos.kpiGrid}>
        {[
          { cifra: datos.hoy?.donaciones_hoy, label: "Donaciones hoy", color: COLORES.coral, icono: <IconoCorazon color={COLORES.coral} size={20} /> },
          { cifra: datos.hoy?.unidades_hoy, label: "Unidades hoy", color: COLORES.naranja, icono: <IconoTendencia color={COLORES.naranja} size={20} /> },
          { cifra: datos.urgentes_sin_cubrir, label: "Urgentes", color: COLORES.error, icono: <IconoWarning color={COLORES.error} size={20} /> },
          { cifra: datos.voluntarios_hoy, label: "Voluntarios", color: COLORES.teal, icono: <IconoUsuarios color={COLORES.teal} size={20} /> },
        ].map((kpi, i) => (
          <Aparecer key={i} retraso={i * 60}>
            <Tarjeta variante="hero" style={estilos.kpiCard}>
              <View style={[estilos.kpiIcono, { backgroundColor: kpi.color + "12" }]}>
                {kpi.icono}
              </View>
              <ContadorAnimado valor={Number(kpi.cifra) || 0} style={[TIPO.cifraPequena, { color: kpi.color }]} />
              <Text style={estilos.kpiLabel}>{kpi.label}</Text>
            </Tarjeta>
          </Aparecer>
        ))}
      </View>

      {/* Cobertura global ring */}
      <Aparecer retraso={250}>
        <Tarjeta variante="hero" style={estilos.coberturaCard}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <ProgressRing porcentaje={datos.cobertura_global || 0} radio={36} grosor={6} color={COLORES.teal} />
            <View style={{ marginLeft: ESP.l, flex: 1 }}>
              <Text style={estilos.coberturaTitulo}>Cobertura global</Text>
              <Text style={estilos.coberturaSub}>
                {datos.totales?.donaciones_total || 0} donaciones totales · {datos.totales?.unidades_total || 0} unidades
              </Text>
            </View>
          </View>
        </Tarjeta>
      </Aparecer>

      {/* Historial 7 días */}
      {datosGrafico.length > 0 && (
        <Aparecer retraso={350}>
          <Tarjeta style={{ marginHorizontal: ESP.l }}>
            <Text style={estilos.seccion}>Tendencia 7 días</Text>
            <MiniGrafico datos={datosGrafico} color={COLORES.coral} alto={60} ancho={undefined} />
            <View style={estilos.histLabels}>
              {historial.map((h, i) => (
                <Text key={i} style={estilos.histLabel}>{h.fecha?.slice(5)}</Text>
              ))}
            </View>
          </Tarjeta>
        </Aparecer>
      )}

      {/* Cobertura por albergue */}
      {datos.cobertura?.length > 0 && (
        <Aparecer retraso={450}>
          <View style={{ paddingHorizontal: ESP.l }}>
            <Text style={estilos.seccionTitulo}>Cobertura por albergue</Text>
            {datos.cobertura.map((c, i) => (
              <Tarjeta key={i} style={estilos.cobAlbergue}>
                <View style={estilos.cobRow}>
                  <Text style={estilos.cobNombre} numberOfLines={1}>{c.albergue}</Text>
                  <Text style={[estilos.cobPct, {
                    color: Number(c.porcentaje) >= 80 ? COLORES.teal : COLORES.coral,
                  }]}>
                    {c.porcentaje || 0}%
                  </Text>
                </View>
                <BarraProgreso
                  porcentaje={Number(c.porcentaje) || 0}
                  color={Number(c.porcentaje) >= 80 ? COLORES.teal : COLORES.coral}
                />
              </Tarjeta>
            ))}
          </View>
        </Aparecer>
      )}

      {/* Top donantes (leaderboard) */}
      {datos.topDonantes?.length > 0 && (
        <Aparecer retraso={550}>
          <View style={{ paddingHorizontal: ESP.l }}>
            <Text style={estilos.seccionTitulo}>
              Top donantes
            </Text>
            {datos.topDonantes.map((d, i) => (
              <Tarjeta key={i} style={estilos.leaderFila}>
                <View style={[estilos.leaderPos, {
                  backgroundColor: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : COLORES.fondo,
                }]}>
                  <Text style={[estilos.leaderPosTexto, i < 3 && { color: COLORES.blanco }]}>
                    {i + 1}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: ESP.m }}>
                  <Text style={estilos.leaderNombre}>{d.donante}</Text>
                  <Text style={estilos.leaderSub}>
                    {d.total_donaciones} donaciones
                  </Text>
                </View>
                <Text style={estilos.leaderCifra}>{d.unidades}</Text>
                <Text style={estilos.leaderUnidad}>uds</Text>
              </Tarjeta>
            ))}
          </View>
        </Aparecer>
      )}

      {/* Feed ultimas actividades */}
      {datos.ultimos?.length > 0 && (
        <Aparecer retraso={650}>
          <View style={{ paddingHorizontal: ESP.l }}>
            <Text style={estilos.seccionTitulo}>Actividad reciente</Text>
            {datos.ultimos.slice(0, 5).map((u, i) => (
              <View key={i} style={estilos.feedItem}>
                <View style={estilos.feedPunto} />
                <View style={{ flex: 1 }}>
                  <Text style={estilos.feedTexto}>
                    <Text style={{ fontWeight: "600" }}>{u.donante}</Text>
                    {" donó "}
                    <Text style={{ fontWeight: "600" }}>{u.cantidad} {u.item}</Text>
                  </Text>
                  <Text style={estilos.feedFecha}>{u.fecha}</Text>
                </View>
              </View>
            ))}
          </View>
        </Aparecer>
      )}

      {/* Por categoria */}
      {datos.porCategoria?.length > 0 && (
        <Aparecer retraso={750}>
          <View style={{ paddingHorizontal: ESP.l }}>
            <Text style={estilos.seccionTitulo}>Donaciones por categoría</Text>
            {datos.porCategoria.map((c, i) => (
              <Tarjeta key={i} style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.catNombre}>{c.categoria}</Text>
                </View>
                <ContadorAnimado valor={c.donado} style={[TIPO.subtitulo, { color: COLORES.navy }]} />
                <Text style={estilos.catUnidad}> uds</Text>
              </Tarjeta>
            ))}
          </View>
        </Aparecer>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.fondo },
  vivoIndicador: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORES.coral + "15",
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: RADIO.pill,
  },
  vivoPunto: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: COLORES.coral, marginRight: 5,
  },
  vivoTexto: { ...TIPO.micro, fontWeight: "800", color: COLORES.coral },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: ESP.l,
    gap: ESP.s,
  },
  kpiCard: {
    width: (Dimensions_width() - ESP.l * 2 - ESP.s) / 2,
    alignItems: "center",
    paddingVertical: ESP.l,
  },
  kpiIcono: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    marginBottom: ESP.s,
  },
  kpiLabel: { ...TIPO.micro, color: COLORES.textoSecundario, marginTop: 4, textAlign: "center" },
  coberturaCard: { marginHorizontal: ESP.l, paddingVertical: ESP.l },
  coberturaTitulo: { ...TIPO.subtitulo, color: COLORES.texto },
  coberturaSub: { ...TIPO.secundario, color: COLORES.textoSecundario, marginTop: 2 },
  seccion: { ...TIPO.subtitulo, color: COLORES.texto, marginBottom: ESP.m },
  seccionTitulo: { ...TIPO.subtitulo, color: COLORES.texto, marginBottom: ESP.s, marginTop: ESP.l },
  histLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: ESP.xs },
  histLabel: { ...TIPO.micro, color: COLORES.textoTerciario },
  cobAlbergue: { marginBottom: 0 },
  cobRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cobNombre: { ...TIPO.cuerpo, fontWeight: "600", color: COLORES.texto, flex: 1, marginRight: 8 },
  cobPct: { ...TIPO.subtitulo, fontWeight: "800" },
  leaderFila: { flexDirection: "row", alignItems: "center", paddingVertical: ESP.s },
  leaderPos: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  leaderPosTexto: { fontSize: 13, fontWeight: "800", color: COLORES.textoSecundario },
  leaderNombre: { ...TIPO.cuerpo, fontWeight: "600", color: COLORES.texto },
  leaderSub: { ...TIPO.micro, color: COLORES.textoSecundario },
  leaderCifra: { ...TIPO.cifraPequena, color: COLORES.navy, marginRight: 2 },
  leaderUnidad: { ...TIPO.micro, color: COLORES.textoSecundario },
  feedItem: { flexDirection: "row", alignItems: "flex-start", marginBottom: ESP.m },
  feedPunto: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORES.coral, marginRight: ESP.m, marginTop: 6,
  },
  feedTexto: { ...TIPO.cuerpo, color: COLORES.texto },
  feedFecha: { ...TIPO.micro, color: COLORES.textoTerciario, marginTop: 2 },
  catNombre: { ...TIPO.cuerpo, fontWeight: "600", color: COLORES.texto },
  catUnidad: { ...TIPO.secundario, color: COLORES.textoSecundario },
});

// Utility para calcular ancho de KPI cards
function Dimensions_width() {
  const { Dimensions } = require("react-native");
  return Dimensions.get("window").width;
}
