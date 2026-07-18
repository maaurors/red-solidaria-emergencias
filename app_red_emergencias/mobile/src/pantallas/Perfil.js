import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, SafeAreaView, ActivityIndicator, Appearance } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { COLORES, ESP, TIPO, SOMBRA, RADIO } from "../tema";
import { api } from "../api";
import { IconoMedalla, IconoEstrella, IconoCopa, IconoLuna } from "../iconos";

// Icono simple de camara en SVG para evitar emojis
import Svg, { Path, Circle } from "react-native-svg";
function IconoCamara({ color = "#000", size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <Circle cx="12" cy="13" r="4" />
    </Svg>
  );
}

export default function Perfil({ visible, alCerrar, sesion, onSesionActualizada }) {
  const [avatar, setAvatar] = useState(sesion?.avatar || null);
  const [cargando, setCargando] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (visible && sesion) {
      setAvatar(sesion.avatar);
      cargarStats();
    }
  }, [visible, sesion]);

  const cargarStats = async () => {
    try {
      const res = await api("/donaciones/mias");
      setStats(res.estadisticas || { total_donaciones: 0, total_unidades: 0, albergues_impactados: 0 });
    } catch {
      setStats({ total_donaciones: 0, total_unidades: 0, albergues_impactados: 0 });
    }
  };

  const subirFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert("Se requiere permiso para acceder a las fotos.");
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!resultado.canceled && resultado.assets[0].base64) {
      const base64Str = `data:image/jpeg;base64,${resultado.assets[0].base64}`;
      setAvatar(base64Str);
      await guardarPerfil(base64Str);
    }
  };

  const guardarPerfil = async (nuevoAvatar) => {
    setCargando(true);
    try {
      const res = await api("/auth/perfil", {
        method: "POST",
        body: JSON.stringify({ avatar: nuevoAvatar })
      });
      const nuevaSesion = { ...sesion, avatar: res.avatar };
      if (onSesionActualizada) onSesionActualizada(nuevaSesion);
    } catch (e) {
      alert("Error al actualizar el perfil");
    } finally {
      setCargando(false);
    }
  };

  if (!sesion) return null;

  const iniciales = sesion.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={alCerrar}>
      <SafeAreaView style={estilos.raiz}>
        <View style={estilos.cabecera}>
          <Text style={estilos.titulo}>Mi Perfil</Text>
          <TouchableOpacity onPress={alCerrar} style={estilos.cerrarBoton}>
            <Text style={estilos.cerrarTexto}>Hecho</Text>
          </TouchableOpacity>
        </View>

        <View style={estilos.contenido}>
          <TouchableOpacity style={estilos.avatarContenedor} onPress={subirFoto} activeOpacity={0.8}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={estilos.avatar} />
            ) : (
              <View style={estilos.avatarPlaceholder}>
                <Text style={estilos.avatarTexto}>{iniciales}</Text>
              </View>
            )}
            <View style={estilos.iconoCamara}>
              <IconoCamara size={18} color={COLORES.textoSecundario} />
            </View>
          </TouchableOpacity>

          <Text style={estilos.nombre}>{sesion.nombre}</Text>
          <Text style={estilos.rol}>{sesion.rol}</Text>
          
          {stats && (
            <View style={estilos.gamificacionContainer}>
              <View style={estilos.nivelHeader}>
                <Text style={estilos.nivelLabel}>Nivel Solidario</Text>
                <Text style={estilos.nivelValor}>
                  {stats.total_donaciones >= 3 ? "Corazón Gigante" : stats.total_donaciones >= 1 ? "Apañador" : "Semilla"}
                </Text>
              </View>

              <Text style={estilos.medallasLabel}>Tus Medallas</Text>
              <View style={estilos.medallasGrid}>
                <View style={[estilos.medallaItem, stats.total_donaciones >= 1 ? estilos.medallaActiva : estilos.medallaInactiva]}>
                  <IconoEstrella color={stats.total_donaciones >= 1 ? COLORES.teal : COLORES.textoSecundario} size={32} relleno={stats.total_donaciones >= 1} />
                  <Text style={estilos.medallaTexto}>1ra Donación</Text>
                </View>
                <View style={[estilos.medallaItem, stats.total_donaciones >= 3 ? estilos.medallaActiva : estilos.medallaInactiva]}>
                  <IconoMedalla color={stats.total_donaciones >= 3 ? COLORES.naranja : COLORES.textoSecundario} size={32} />
                  <Text style={estilos.medallaTexto}>Frecuente</Text>
                </View>
                <View style={[estilos.medallaItem, stats.albergues_impactados >= 2 ? estilos.medallaActiva : estilos.medallaInactiva]}>
                  <IconoCopa color={stats.albergues_impactados >= 2 ? COLORES.amarillo : COLORES.textoSecundario} size={32} />
                  <Text style={estilos.medallaTexto}>Multi-Destino</Text>
                </View>
              </View>
            </View>
          )}

          <View style={estilos.estadoContenedor}>
            <Text style={estilos.estadoTexto}>Estado de la cuenta: Activa</Text>
          </View>
          


          {cargando && <ActivityIndicator size="small" color={COLORES.coral} style={{ marginTop: ESP.l }} />}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: COLORES.fondo },
  cabecera: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: ESP.l,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.bordeSutil,
  },
  titulo: { ...TIPO.h2, color: COLORES.textoPrincipal },
  cerrarBoton: { padding: ESP.s },
  cerrarTexto: { ...TIPO.cuerpo, color: COLORES.texto, fontWeight: "600" },
  contenido: { flex: 1, padding: ESP.xl, alignItems: "center" },
  avatarContenedor: {
    width: 120, height: 120, borderRadius: 60,
    marginBottom: ESP.l,
    position: "relative",
    ...SOMBRA.media
  },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarPlaceholder: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: COLORES.navy,
    alignItems: "center", justifyContent: "center",
  },
  avatarTexto: { color: COLORES.blanco, fontSize: 40, fontWeight: "800" },
  iconoCamara: {
    position: "absolute", bottom: 0, right: 0,
    backgroundColor: COLORES.superficie,
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    ...SOMBRA.baja
  },
  nombre: { ...TIPO.h1, color: COLORES.textoPrincipal, marginBottom: ESP.xs },
  rol: { ...TIPO.etiqueta, color: COLORES.textoSecundario, textTransform: "uppercase", marginBottom: ESP.xl },
  estadoContenedor: {
    backgroundColor: COLORES.superficie,
    paddingHorizontal: ESP.l,
    paddingVertical: ESP.m,
    borderRadius: RADIO.l,
    width: "100%",
    ...SOMBRA.baja,
    marginTop: ESP.xl
  },
  estadoTexto: { ...TIPO.cuerpo, color: COLORES.textoPrincipal, textAlign: "center" },
  gamificacionContainer: {
    width: "100%",
    backgroundColor: COLORES.superficie,
    borderRadius: RADIO.l,
    padding: ESP.l,
    ...SOMBRA.suave,
    borderWidth: 1,
    borderColor: COLORES.bordeSutil
  },
  nivelHeader: {
    alignItems: "center",
    marginBottom: ESP.l,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.bordeSutil,
    paddingBottom: ESP.m
  },
  nivelLabel: { ...TIPO.etiqueta, color: COLORES.textoSecundario, textTransform: "uppercase" },
  nivelValor: { ...TIPO.h2, color: COLORES.texto, marginTop: 4 },
  medallasLabel: { ...TIPO.subtitulo, color: COLORES.texto, marginBottom: ESP.m, textAlign: "center" },
  medallasGrid: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  medallaItem: {
    alignItems: "center",
    flex: 1
  },
  medallaActiva: { opacity: 1 },
  medallaInactiva: { opacity: 0.3 },
  medallaTexto: { ...TIPO.micro, color: COLORES.texto, marginTop: 8, textAlign: "center", fontWeight: "600" },
  botonTema: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORES.superficie,
    paddingHorizontal: ESP.l,
    paddingVertical: ESP.m,
    borderRadius: RADIO.l,
    width: "100%",
    ...SOMBRA.baja,
    marginTop: ESP.m,
    borderWidth: 1,
    borderColor: COLORES.bordeSutil
  },
  botonTemaTexto: { ...TIPO.cuerpo, color: COLORES.texto, fontWeight: "600", marginLeft: ESP.s }
});
