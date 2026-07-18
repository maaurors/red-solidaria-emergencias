import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from "react-native";
import { COLORES, ESP, TIPO, SOMBRA } from "../tema";
import { Aparecer } from "../componentes";
import { api } from "../api";
import { IconoCaja, IconoCheck, IconoAlerta } from "../iconos";
import { LinearGradient } from "expo-linear-gradient";

export default function Acopio({ sesion }) {
  const [donaciones, setDonaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargarDonaciones = async () => {
    try {
      // Cargamos todas las donaciones. En un caso real filtrariamos por estado pendiente.
      const data = await api("/donaciones", "GET");
      const pendientes = data.filter(d => d.estado !== "RECIBIDA");
      setDonaciones(pendientes);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useEffect(() => {
    cargarDonaciones();
  }, []);

  const marcarRecibido = (id) => {
    Alert.alert(
      "Confirmar Recepción",
      "¿Estás seguro de marcar esta donación como recibida en el centro de acopio?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Confirmar", 
          style: "default",
          onPress: async () => {
            try {
              await api(`/donaciones/${id}/estado`, "PATCH", { estado: "RECIBIDA" });
              Alert.alert("Éxito", "Donación marcada como recibida.");
              cargarDonaciones();
            } catch (e) {
              Alert.alert("Error", "No se pudo actualizar el estado.");
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item, index }) => (
    <Aparecer retraso={index * 100}>
      <View style={estilos.tarjeta}>
        <View style={estilos.tarjetaHeader}>
          <View style={estilos.badge}>
            <IconoCaja color={COLORES.cyan} size={16} />
            <Text style={estilos.badgeTexto}>ID: {item.id_donacion}</Text>
          </View>
          <Text style={estilos.fechaTexto}>{item.fecha_donacion.split("T")[0]}</Text>
        </View>

        <Text style={estilos.descripcionTexto}>{item.descripcion}</Text>
        <Text style={estilos.tipoTexto}>Tipo: <Text style={{ color: COLORES.blanco }}>{item.tipo}</Text></Text>

        <TouchableOpacity style={estilos.btnRecibir} onPress={() => marcarRecibido(item.id_donacion)} activeOpacity={0.8}>
          <IconoCheck color={COLORES.navy} size={20} />
          <Text style={estilos.btnTexto}>Marcar Recibido</Text>
        </TouchableOpacity>
      </View>
    </Aparecer>
  );

  return (
    <View style={estilos.raiz}>
      <LinearGradient colors={["#0F172A", "#1E293B"]} style={StyleSheet.absoluteFillObject} />
      
      <View style={estilos.header}>
        <Text style={estilos.titulo}>Gestión de Acopio</Text>
        <Text style={estilos.subtitulo}>Centro de Recepción Logística</Text>
      </View>

      <FlatList
        data={donaciones}
        keyExtractor={i => i.id_donacion.toString()}
        renderItem={renderItem}
        contentContainerStyle={estilos.lista}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargarDonaciones(); }} tintColor={COLORES.cyan} />}
        ListEmptyComponent={
          !cargando && (
            <View style={estilos.vacioContainer}>
              <View style={estilos.vacioIcono}><IconoAlerta color="rgba(255,255,255,0.4)" size={32} /></View>
              <Text style={estilos.vacioTexto}>No hay donaciones pendientes por recibir en este momento.</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  header: { padding: ESP.xl, paddingTop: 60, paddingBottom: ESP.l },
  titulo: { ...TIPO.display, color: COLORES.blanco, fontSize: 32, marginBottom: 8 },
  subtitulo: { ...TIPO.secundario, color: COLORES.cyan },
  lista: { padding: ESP.xl, paddingBottom: 100 },
  
  tarjeta: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 20, padding: ESP.l, marginBottom: ESP.m,
  },
  tarjetaHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: ESP.m },
  badge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(34, 211, 238, 0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeTexto: { ...TIPO.micro, color: COLORES.cyan, marginLeft: 6, fontWeight: "700" },
  fechaTexto: { ...TIPO.micro, color: "rgba(255,255,255,0.4)" },
  
  descripcionTexto: { ...TIPO.cuerpo, color: COLORES.blanco, fontSize: 16, marginBottom: ESP.s },
  tipoTexto: { ...TIPO.micro, color: "rgba(255,255,255,0.6)", marginBottom: ESP.l },
  
  btnRecibir: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: COLORES.cyan, padding: ESP.m, borderRadius: 12,
    ...SOMBRA.glow(COLORES.cyan)
  },
  btnTexto: { ...TIPO.subtitulo, color: COLORES.navy, marginLeft: 8, fontWeight: "800" },

  vacioContainer: { alignItems: "center", marginTop: 40 },
  vacioIcono: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center", marginBottom: ESP.l },
  vacioTexto: { ...TIPO.cuerpo, color: "rgba(255,255,255,0.5)", textAlign: "center", paddingHorizontal: ESP.xl },
});
