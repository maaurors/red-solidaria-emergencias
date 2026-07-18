import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { COLORES, ESP, TIPO, SOMBRA, RADIO } from "../tema";
import { Encabezado, Tarjeta, Aparecer, Mensaje, Toast } from "../componentes";
import { api } from "../api";
import { LinearGradient } from "expo-linear-gradient";
import { IconoWarning, IconoMas, IconoCerrar } from "../iconos";

const TIPOS = [
  { clave: "INCENDIO", label: "Incendio" },
  { clave: "TERREMOTO", label: "Terremoto" },
  { clave: "ALUVION", label: "Aluvión" },
  { clave: "INUNDACION", label: "Inundación" },
  { clave: "OTRO", label: "Otro" }
];

export default function ReportarEmergencia({ navigation }) {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const [region, setRegion] = useState("");
  const [foto, setFoto] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const seleccionarFoto = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setFoto(result.assets[0].uri);
    }
  };

  const enviar = async () => {
    if (!nombre.trim() || !tipo || !region.trim()) {
      setError("Por favor completa todos los campos.");
      return;
    }

    setEnviando(true);
    setError("");

    try {
      // Si hubiera backend real subiríamos base64 o formdata aquí
      await api("/emergencias", {
        method: "POST",
        body: JSON.stringify({ nombre, tipo, region, fotoAdjunta: !!foto })
      });
      
      setToast({ mensaje: "Emergencia reportada exitosamente", tipo: "exito" });
      setTimeout(() => {
        navigation?.cambiarPestana("envivo");
      }, 1500);
      
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  };

  return (
    <View style={estilos.contenedor}>
      <Toast visible={!!toast} mensaje={toast?.mensaje} tipo={toast?.tipo} onOcultar={() => setToast(null)} />
      
      <Encabezado 
        titulo="Reportar Desastre" 
        subtitulo="Chile Ayude a Chile" 
        botonVolver={() => navigation?.cambiarPestana("envivo")}
      />

      <ScrollView contentContainerStyle={estilos.scroll} showsVerticalScrollIndicator={false}>
        <Aparecer>
          <Tarjeta style={estilos.alertaCard}>
            <IconoWarning color={COLORES.coral} size={32} />
            <Text style={estilos.alertaTexto}>
              Reporta únicamente emergencias reales que requieran movilización de ayuda y albergues.
            </Text>
          </Tarjeta>
        </Aparecer>

        <Aparecer retraso={100}>
          <Text style={estilos.label}>Nombre del evento</Text>
          <TextInput
            style={estilos.input}
            placeholder="Ej: Incendio Forestal Quilpué"
            placeholderTextColor={COLORES.textoTerciario}
            value={nombre}
            onChangeText={setNombre}
          />
        </Aparecer>

        <Aparecer retraso={200}>
          <Text style={estilos.label}>Tipo de Desastre</Text>
          <View style={estilos.gridTipos}>
            {TIPOS.map(t => (
              <TouchableOpacity
                key={t.clave}
                activeOpacity={0.8}
                onPress={() => setTipo(t.clave)}
                style={[
                  estilos.btnTipo,
                  tipo === t.clave && estilos.btnTipoActivo
                ]}
              >
                <Text style={[
                  estilos.btnTipoTexto,
                  tipo === t.clave && estilos.btnTipoTextoActivo
                ]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Aparecer>

        <Aparecer retraso={300}>
          <Text style={estilos.label}>Región / Zona</Text>
          <TextInput
            style={estilos.input}
            placeholder="Ej: Región de Valparaíso"
            placeholderTextColor={COLORES.textoTerciario}
            value={region}
            onChangeText={setRegion}
          />
        </Aparecer>

        <Aparecer retraso={400}>
          <Text style={estilos.label}>Evidencia (Opcional)</Text>
          {foto ? (
            <View style={estilos.fotoPreviewContenedor}>
              <Image source={{ uri: foto }} style={estilos.fotoPreview} />
              <TouchableOpacity style={estilos.btnRemoverFoto} onPress={() => setFoto(null)}>
                <IconoCerrar color={COLORES.blanco} size={16} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={estilos.btnSubirFoto} onPress={seleccionarFoto} activeOpacity={0.8}>
              <View style={estilos.circuloIcono}>
                <IconoMas color={COLORES.textoSecundario} size={24} />
              </View>
              <Text style={estilos.btnSubirFotoTexto}>Añadir fotografía del suceso</Text>
              <Text style={estilos.btnSubirFotoSubtexto}>Soportado: JPG, PNG (Max 5MB)</Text>
            </TouchableOpacity>
          )}
        </Aparecer>

        <Mensaje texto={error} tipo="error" style={{ marginTop: ESP.l }} />

        <Aparecer retraso={500} estilo={{ marginTop: ESP.l }}>
          <TouchableOpacity onPress={enviar} disabled={enviando}>
            <LinearGradient 
              colors={[COLORES.error, COLORES.coral]} 
              style={estilos.btnEnviar}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Text style={estilos.btnEnviarTexto}>
                {enviando ? "Enviando..." : "Emitir Alerta"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Aparecer>
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.fondo },
  scroll: { padding: ESP.l, paddingBottom: 100 },
  alertaCard: {
    backgroundColor: COLORES.error + "10",
    borderColor: COLORES.error + "30",
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ESP.xl,
    padding: ESP.l
  },
  alertaTexto: {
    ...TIPO.secundario,
    color: COLORES.error,
    flex: 1,
    marginLeft: ESP.m
  },
  label: {
    ...TIPO.subtitulo,
    color: COLORES.texto,
    marginBottom: ESP.s,
    marginLeft: 4
  },
  input: {
    backgroundColor: COLORES.superficie,
    borderWidth: 1,
    borderColor: COLORES.bordeSutil,
    borderRadius: RADIO.l,
    paddingHorizontal: ESP.l,
    paddingVertical: 14,
    ...TIPO.cuerpo,
    color: COLORES.texto,
    marginBottom: ESP.l
  },
  gridTipos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ESP.s,
    marginBottom: ESP.l
  },
  btnTipo: {
    backgroundColor: COLORES.superficie,
    borderWidth: 1,
    borderColor: COLORES.bordeSutil,
    paddingHorizontal: ESP.l,
    paddingVertical: ESP.s,
    borderRadius: RADIO.pill
  },
  btnTipoActivo: {
    backgroundColor: COLORES.navy,
    borderColor: COLORES.navy
  },
  btnTipoTexto: {
    ...TIPO.cuerpo,
    color: COLORES.textoSecundario
  },
  btnTipoTextoActivo: {
    color: COLORES.blanco,
    fontWeight: "600"
  },
  btnSubirFoto: {
    backgroundColor: COLORES.fondoCalido,
    borderWidth: 1,
    borderColor: COLORES.borde,
    borderStyle: "dashed",
    borderRadius: RADIO.l,
    padding: ESP.xl,
    alignItems: "center",
    marginBottom: ESP.l
  },
  circuloIcono: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORES.bordeSutil,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: ESP.m
  },
  btnSubirFotoTexto: { ...TIPO.subtitulo, color: COLORES.texto },
  btnSubirFotoSubtexto: { ...TIPO.micro, color: COLORES.textoSecundario, marginTop: 4 },
  fotoPreviewContenedor: {
    width: "100%",
    height: 200,
    borderRadius: RADIO.l,
    overflow: "hidden",
    marginBottom: ESP.l,
    ...SOMBRA.media
  },
  fotoPreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  btnRemoverFoto: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: COLORES.overlay,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  btnEnviar: {
    paddingVertical: ESP.l,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIO.xl,
    ...SOMBRA.glow(COLORES.error)
  },
  btnEnviarTexto: {
    ...TIPO.titulo,
    color: COLORES.blanco,
    fontSize: 18
  }
});
