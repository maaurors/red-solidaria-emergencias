import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Keyboard } from "react-native";
import { COLORES, ESP, TIPO, SOMBRA, RADIO } from "../tema";
import { Aparecer } from "../componentes";
import { IconoEnviar } from "../iconos";

const MENSAJES_INICIALES = [
  { id: "1", texto: "Necesito 2 camionetas para llevar agua a Valparaiso. Alguien disponible?", autor: "Juan Perez", rol: "COORDINADOR", hora: "14:30", mio: false },
  { id: "2", texto: "Tengo una F-150, salgo en 20 min desde Santiago Centro. Donde recojo el agua?", autor: "Ana Torres", rol: "DONANTE", hora: "14:32", mio: false },
  { id: "3", texto: "Ofrezco transporte desde Rancagua hacia la costa. Camioneta con capacidad para 500kg.", autor: "Carlos Muñoz", rol: "VOLUNTARIO", hora: "14:35", mio: false },
];

export default function ChatSOS({ navigation }) {
  const [mensajes, setMensajes] = useState(MENSAJES_INICIALES);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [tecladoVisible, setTecladoVisible] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setTecladoVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setTecladoVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const enviar = () => {
    if (!nuevoMensaje.trim()) return;
    const msg = {
      id: Date.now().toString(),
      texto: nuevoMensaje.trim(),
      autor: "Tu",
      rol: "HEROE",
      hora: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      mio: true
    };
    setMensajes(prev => [...prev, msg]);
    setNuevoMensaje("");
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderMensaje = ({ item, index }) => (
    <Aparecer retraso={index * 80}>
      <View style={[estilos.burbujaContainer, item.mio ? estilos.burbujaMia : estilos.burbujaOtra]}>
        {!item.mio && (
          <View style={estilos.autorInfo}>
            <Text style={estilos.autorTexto}>{item.autor}</Text>
            <View style={[estilos.rolPill, { backgroundColor: item.rol === "COORDINADOR" ? "rgba(255,42,85,0.2)" : "rgba(34,211,238,0.2)" }]}>
              <Text style={[estilos.rolTexto, { color: item.rol === "COORDINADOR" ? COLORES.coral : COLORES.cyan }]}>{item.rol}</Text>
            </View>
          </View>
        )}
        <View style={[estilos.burbuja, item.mio ? estilos.burbujaBgMia : estilos.burbujaBgOtra]}>
          <Text style={[estilos.mensajeTexto, item.mio && { color: "#0F172A" }]}>{item.texto}</Text>
        </View>
        <Text style={estilos.horaTexto}>{item.hora}</Text>
      </View>
    </Aparecer>
  );

  return (
    <View style={estilos.raiz}>
      <View style={estilos.header}>
        <View>
          <Text style={estilos.headerTitulo}>Radio SOS</Text>
          <Text style={estilos.headerSub}>Canal Nacional Abierto</Text>
        </View>
        <View style={estilos.estadoContainer}>
          <View style={estilos.puntoVerde} />
          <Text style={estilos.estadoTexto}>145 online</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={estilos.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={mensajes}
          keyExtractor={item => item.id}
          renderItem={renderMensaje}
          contentContainerStyle={estilos.lista}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={[estilos.inputContainer, tecladoVisible && { paddingBottom: ESP.l }]}>
          <TextInput
            style={estilos.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={nuevoMensaje}
            onChangeText={setNuevoMensaje}
            multiline
            maxLength={280}
          />
          <TouchableOpacity
            style={[estilos.btnEnviar, !nuevoMensaje.trim() && { opacity: 0.4 }]}
            onPress={enviar}
            disabled={!nuevoMensaje.trim()}
          >
            <IconoEnviar color="#0F172A" size={20} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: "#0F172A" },
  header: {
    padding: ESP.l,
    paddingTop: 16,
    backgroundColor: "#1E293B",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)"
  },
  headerTitulo: { ...TIPO.subtitulo, color: COLORES.blanco, fontSize: 20, fontWeight: "700" },
  headerSub: { ...TIPO.micro, color: COLORES.cyan, fontWeight: "700", marginTop: 2 },
  estadoContainer: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20
  },
  puntoVerde: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981", marginRight: 6 },
  estadoTexto: { ...TIPO.micro, color: "#10B981", fontWeight: "800" },
  container: { flex: 1 },
  lista: { padding: ESP.l, paddingBottom: ESP.xl },
  burbujaContainer: { marginBottom: ESP.l, maxWidth: "85%" },
  burbujaMia: { alignSelf: "flex-end", alignItems: "flex-end" },
  burbujaOtra: { alignSelf: "flex-start" },
  autorInfo: { flexDirection: "row", alignItems: "center", marginBottom: 4, paddingLeft: 4 },
  autorTexto: { ...TIPO.micro, color: COLORES.blanco, fontWeight: "700", marginRight: 8 },
  rolPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  rolTexto: { ...TIPO.micro, fontSize: 9, fontWeight: "800" },
  burbuja: { padding: ESP.m, borderRadius: 18 },
  burbujaBgMia: { backgroundColor: COLORES.cyan, borderBottomRightRadius: 4 },
  burbujaBgOtra: { backgroundColor: "#1E293B", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  mensajeTexto: { ...TIPO.cuerpo, color: "rgba(255,255,255,0.9)", fontSize: 15, lineHeight: 22 },
  horaTexto: { ...TIPO.micro, color: "rgba(255,255,255,0.35)", marginTop: 4, marginHorizontal: 4, fontSize: 10 },
  inputContainer: {
    flexDirection: "row", alignItems: "flex-end",
    padding: ESP.m, backgroundColor: "#1E293B",
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)"
  },
  input: {
    flex: 1, minHeight: 44, maxHeight: 100,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 22, paddingHorizontal: ESP.l,
    paddingTop: 12, paddingBottom: 12,
    color: COLORES.blanco, ...TIPO.cuerpo, marginRight: ESP.m,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)"
  },
  btnEnviar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORES.cyan,
    alignItems: "center", justifyContent: "center",
  }
});
