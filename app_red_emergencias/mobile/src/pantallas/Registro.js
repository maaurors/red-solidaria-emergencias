import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from "react-native";
import { COLORES, ESP, TIPO, SOMBRA } from "../tema";
import { api } from "../api";
import { LinearGradient } from "expo-linear-gradient";
import { IconoCorazon, IconoPulso } from "../iconos";

export default function Registro({ onLogin, setRegistroOpen }) {
  const [formulario, setFormulario] = useState({
    rut: "", nombre: "", email: "", telefono: "", password: "", rol: "DONANTE"
  });
  const [cargando, setCargando] = useState(false);

  const formatearRut = (texto) => {
    let t = texto.replace(/[^0-9kK]/g, "").toUpperCase();
    if (t.length > 1) t = t.slice(0, -1) + "-" + t.slice(-1);
    setFormulario({ ...formulario, rut: t });
  };

  const registrar = async () => {
    if (!formulario.rut || !formulario.nombre || !formulario.email || !formulario.password) {
      return Alert.alert("Error", "Faltan campos obligatorios");
    }
    if (formulario.password.length < 8) {
      return Alert.alert("Seguridad", "La contraseña debe tener al menos 8 caracteres.");
    }
    setCargando(true);
    try {
      const resp = await api("/auth/registro", "POST", formulario);
      if (resp.error) throw new Error(resp.error);
      // Éxito: iniciar sesión
      onLogin(resp.token, { rol: resp.rol, nombre: resp.nombre });
    } catch (e) {
      Alert.alert("Error al registrar", e.message || "Revisa tus datos e intenta nuevamente.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={estilos.raiz}>
      <LinearGradient colors={["#0F172A", "#1E293B"]} style={StyleSheet.absoluteFillObject} />
      
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={estilos.scroll} showsVerticalScrollIndicator={false}>
          
          <TouchableOpacity style={estilos.btnAtras} onPress={() => setRegistroOpen(false)}>
            <Text style={estilos.atrasTexto}>Volver al Login</Text>
          </TouchableOpacity>

          <View style={estilos.header}>
            <Text style={estilos.titulo}>Únete a la Red</Text>
            <Text style={estilos.subtitulo}>Juntos podemos hacer la diferencia</Text>
          </View>

          <View style={estilos.selectorRol}>
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[estilos.opcionRol, formulario.rol === "DONANTE" && estilos.opcionSeleccionada]}
              onPress={() => setFormulario({ ...formulario, rol: "DONANTE" })}
            >
              <View style={[estilos.iconoWrapper, formulario.rol === "DONANTE" && { backgroundColor: "rgba(255, 42, 85, 0.2)" }]}>
                <IconoCorazon color={formulario.rol === "DONANTE" ? COLORES.coral : COLORES.textoSecundario} size={24} />
              </View>
              <Text style={[estilos.textoRol, formulario.rol === "DONANTE" && { color: COLORES.coral, fontWeight: "700" }]}>Quiero Donar</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.8}
              style={[estilos.opcionRol, formulario.rol === "VOLUNTARIO" && estilos.opcionSeleccionada]}
              onPress={() => setFormulario({ ...formulario, rol: "VOLUNTARIO" })}
            >
              <View style={[estilos.iconoWrapper, formulario.rol === "VOLUNTARIO" && { backgroundColor: "rgba(34, 211, 238, 0.2)" }]}>
                <IconoPulso color={formulario.rol === "VOLUNTARIO" ? COLORES.cyan : COLORES.textoSecundario} size={24} />
              </View>
              <Text style={[estilos.textoRol, formulario.rol === "VOLUNTARIO" && { color: COLORES.cyan, fontWeight: "700" }]}>Ser Voluntario</Text>
            </TouchableOpacity>
          </View>

          <View style={estilos.formulario}>
            <TextInput
              style={estilos.input} placeholder="RUT (12345678-9)"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={formulario.rut} onChangeText={formatearRut} maxLength={10}
            />
            <TextInput
              style={estilos.input} placeholder="Nombre Completo"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={formulario.nombre} onChangeText={(t) => setFormulario({ ...formulario, nombre: t })}
            />
            <TextInput
              style={estilos.input} placeholder="Correo Electrónico"
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="email-address" autoCapitalize="none"
              value={formulario.email} onChangeText={(t) => setFormulario({ ...formulario, email: t })}
            />
            <TextInput
              style={estilos.input} placeholder="Teléfono (Opcional)"
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="phone-pad"
              value={formulario.telefono} onChangeText={(t) => setFormulario({ ...formulario, telefono: t })}
            />
            <TextInput
              style={estilos.input} placeholder="Contraseña (mínimo 8 caracteres)"
              placeholderTextColor="rgba(255,255,255,0.4)"
              secureTextEntry
              value={formulario.password} onChangeText={(t) => setFormulario({ ...formulario, password: t })}
            />

            <TouchableOpacity 
              activeOpacity={0.8} 
              style={[estilos.btnRegistrar, cargando && { opacity: 0.7 }]} 
              onPress={registrar} 
              disabled={cargando}
            >
              <Text style={estilos.btnTexto}>{cargando ? "Creando cuenta..." : "Crear Cuenta"}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  scroll: { padding: ESP.xl, paddingTop: 60, paddingBottom: 100 },
  btnAtras: { alignSelf: "flex-start", paddingVertical: ESP.s, paddingHorizontal: ESP.m, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 20, marginBottom: ESP.xl },
  atrasTexto: { ...TIPO.micro, color: COLORES.blanco, fontWeight: "700" },
  header: { marginBottom: ESP.xl },
  titulo: { ...TIPO.display, color: COLORES.blanco, fontSize: 32, marginBottom: 8 },
  subtitulo: { ...TIPO.secundario, color: "rgba(255,255,255,0.7)" },
  
  selectorRol: { flexDirection: "row", justifyContent: "space-between", marginBottom: ESP.xl },
  opcionRol: {
    flex: 1, alignItems: "center", padding: ESP.m,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 16, marginHorizontal: 4,
    backgroundColor: "rgba(255,255,255,0.02)"
  },
  opcionSeleccionada: { borderColor: "rgba(255,255,255,0.3)", backgroundColor: "rgba(255,255,255,0.06)" },
  iconoWrapper: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center", marginBottom: ESP.s },
  textoRol: { ...TIPO.micro, color: COLORES.textoSecundario, marginTop: 4 },

  formulario: { marginTop: ESP.s },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12, padding: ESP.l,
    color: COLORES.blanco, ...TIPO.cuerpo,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    marginBottom: ESP.l,
  },
  btnRegistrar: {
    backgroundColor: COLORES.azul,
    padding: ESP.l, borderRadius: 12,
    alignItems: "center",
    marginTop: ESP.m,
    ...SOMBRA.glow(COLORES.azul)
  },
  btnTexto: { ...TIPO.subtitulo, color: COLORES.blanco, fontWeight: "700" }
});
