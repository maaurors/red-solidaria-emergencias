import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from "react-native";
import { api } from "../api";
import { COLORES, ESP, TIPO, SOMBRA, RADIO } from "../tema";
import { Encabezado, Tarjeta, Aparecer, Cargando, Mensaje } from "../componentes";
import { IconoCorazon, IconoWarning } from "../iconos";
import { LinearGradient } from "expo-linear-gradient";

export default function EmergenciasVivo({ navigation }) {
  const [emergencias, setEmergencias] = useState([]);
  const [albergues, setAlbergues] = useState([]);
  const [necesidades, setNecesidades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarDatos = async () => {
    setCargando(true);
    setError("");
    try {
      const [dataE, dataA, dataD] = await Promise.all([
        api("/emergencias"),
        api("/albergues"),
        api("/deficit")
      ]);
      setEmergencias(dataE);
      setAlbergues(dataA);
      setNecesidades(dataD?.filas || []);
    } catch (e) {
      setError(e.message);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  if (cargando && emergencias.length === 0) return <Cargando />;

  return (
    <View style={estilos.contenedor}>
      <Encabezado titulo="Emergencias en Vivo" subtitulo="Lo que está pasando ahora" />
      
      <Aparecer style={{ paddingHorizontal: ESP.l, marginBottom: ESP.m }}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => navigation?.cambiarPestana("reportar_emergencia")}>
          <LinearGradient 
            colors={[COLORES.error, COLORES.coral]} 
            style={estilos.btnReportar}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Text style={estilos.btnReportarTexto}>+ Reportar Desastre</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Aparecer>

      <Mensaje texto={error} tipo="error" />

      <FlatList
        data={emergencias}
        keyExtractor={e => String(e.id_emergencia)}
        contentContainerStyle={estilos.lista}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargarDatos} tintColor={COLORES.cyan} />}
        renderItem={({ item, index }) => {
          const alberguesActivos = albergues.filter(a => a.emergencia === item.nombre);
          const needs = necesidades.filter(n => n.emergencia === item.nombre);
          const deficitUrgente = needs.filter(n => n.prioridad === "ALTA");
          
          return (
            <Aparecer retraso={index * 100}>
              <Tarjeta variante="hero" style={estilos.tarjetaEmergencia}>
                <LinearGradient 
                  colors={[COLORES.superficie, COLORES.superficieElevada]} 
                  style={StyleSheet.absoluteFillObject}
                />
                
                <View style={estilos.filaBadge}>
                  <View style={estilos.badge}>
                    <View style={estilos.puntoRojo} />
                    <Text style={estilos.badgeTexto}>ACTIVA</Text>
                  </View>
                  {deficitUrgente.length > 0 && (
                    <View style={estilos.badgeUrgente}>
                      <IconoWarning color={COLORES.error} size={14} />
                      <Text style={estilos.badgeUrgenteTexto}>URGENCIAS PENDIENTES</Text>
                    </View>
                  )}
                </View>
                
                <Text style={estilos.titulo}>{item.nombre}</Text>
                <Text style={estilos.subtitulo}>{item.tipo} • {item.region}</Text>
                
                <View style={estilos.infoRow}>
                  <IconoCorazon color={COLORES.coral} size={16} />
                  <Text style={estilos.infoTexto}>
                    {alberguesActivos.length} Centros de Acopio activos
                  </Text>
                </View>

                {needs.length > 0 && (
                  <View style={estilos.needsBox}>
                    <Text style={estilos.needsHeader}>Falta en vivo:</Text>
                    {needs.slice(0, 3).map((n, idx) => (
                      <View key={idx} style={estilos.needRow}>
                        <View style={[estilos.needDot, { backgroundColor: n.prioridad === 'ALTA' ? COLORES.coral : COLORES.naranja }]} />
                        <Text style={estilos.needText}>
                          <Text style={{fontWeight: '700', color: n.prioridad === 'ALTA' ? COLORES.coral : COLORES.texto}}>{n.deficit} {n.unidad_medida}</Text> de {n.item}
                        </Text>
                      </View>
                    ))}
                    {needs.length > 3 && (
                      <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.cambiarPestana('deficit')}>
                        <Text style={estilos.needMas}>Y {needs.length - 3} artículos más... (Ver todos)</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </Tarjeta>
            </Aparecer>
          );
        }}
        ListEmptyComponent={
          !cargando ? (
            <View style={estilos.vacio}>
              <Text style={estilos.vacioTexto}>Afortunadamente, no hay emergencias activas en este momento.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.fondo },
  lista: { padding: ESP.l, paddingBottom: ESP.xxl },
  tarjetaEmergencia: {
    padding: ESP.l,
    marginBottom: ESP.m,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORES.bordeSutil,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORES.error + "20",
    alignSelf: "flex-start",
    paddingHorizontal: ESP.s,
    paddingVertical: 4,
    borderRadius: RADIO.s,
    marginBottom: ESP.s,
  },
  puntoRojo: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: COLORES.error, marginRight: 6,
    ...SOMBRA.glow(COLORES.error)
  },
  badgeTexto: { ...TIPO.micro, color: COLORES.error, fontWeight: "700" },
  titulo: { ...TIPO.subtitulo, color: COLORES.texto, marginBottom: 4 },
  subtitulo: { ...TIPO.secundario, color: COLORES.textoSecundario, marginBottom: ESP.m },
  infoRow: { flexDirection: "row", alignItems: "center", marginTop: ESP.xs },
  infoTexto: { ...TIPO.secundario, color: COLORES.texto, marginLeft: ESP.s },
  vacio: { padding: ESP.xl, alignItems: "center" },
  vacioTexto: { ...TIPO.cuerpo, color: COLORES.textoSecundario, textAlign: "center" },
  btnReportar: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIO.m,
  },
  btnReportarTexto: {
    ...TIPO.subtitulo,
    color: COLORES.blanco,
    fontWeight: "700"
  },
  filaBadge: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: ESP.s },
  badgeUrgente: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORES.errorFondo,
    paddingHorizontal: ESP.s,
    paddingVertical: 4,
    borderRadius: RADIO.s,
  },
  badgeUrgenteTexto: { ...TIPO.micro, color: COLORES.error, fontWeight: "700", marginLeft: 4 },
  needsBox: {
    marginTop: ESP.m,
    padding: ESP.m,
    backgroundColor: COLORES.fondo,
    borderRadius: RADIO.m,
    borderWidth: 1,
    borderColor: COLORES.bordeSutil
  },
  needsHeader: { ...TIPO.micro, color: COLORES.textoSecundario, marginBottom: ESP.xs, textTransform: "uppercase", fontWeight: "700" },
  needRow: { flexDirection: "row", alignItems: "center", marginVertical: 2 },
  needDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  needText: { ...TIPO.secundario, color: COLORES.texto },
  needMas: { ...TIPO.micro, color: COLORES.azul, marginTop: 4, fontWeight: "600" }
});
