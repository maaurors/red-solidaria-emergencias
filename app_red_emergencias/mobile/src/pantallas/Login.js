// Login premium: animaciones stagger, validación visual en tiempo real,
// toggle contraseña, shimmer en botón, onda SVG decorativa.
import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, KeyboardAvoidingView,
  Platform, TouchableOpacity, Dimensions, Animated,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { api, guardarToken } from "../api";
import { COLORES, ESP, TIPO, SOMBRA, RADIO } from "../tema";
import { Boton, Campo, Mensaje, SelectorSegmento } from "../componentes";
import * as LocalAuthentication from "expo-local-authentication";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { IconoOjo, IconoOjoCerrado, IconoCheck } from "../iconos";
import { GOOGLE_CLIENT_ID } from "../configuracion";

WebBrowser.maybeCompleteAuthSession();

const ANCHO = Dimensions.get("window").width;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function Login({ alEntrar, abrirRegistro }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  // Animaciones stagger
  const selloAnim = useRef(new Animated.Value(0)).current;
  const tituloAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.spring(selloAnim, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 10 }),
      Animated.spring(tituloAnim, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 6 }),
      Animated.spring(formAnim, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 4 }),
    ]).start();
  }, [selloAnim, tituloAnim, formAnim]);

  const emailValido = EMAIL_RE.test(email);
  const passwordValido = password.length >= 8;

  // Acceso con Google: el flujo OAuth entrega un id_token que el
  // backend verifica contra Google antes de emitir sesion propia.
  const [, respuestaGoogle, pedirGoogle] = Google.useAuthRequest(
    GOOGLE_CLIENT_ID
      ? { clientId: GOOGLE_CLIENT_ID, webClientId: GOOGLE_CLIENT_ID }
      : { clientId: "sin-configurar.apps.googleusercontent.com" }
  );

  useEffect(() => {
    const idToken = respuestaGoogle?.params?.id_token
      || respuestaGoogle?.authentication?.idToken;
    if (respuestaGoogle?.type === "success" && idToken) {
      (async () => {
        setError("");
        setCargando(true);
        try {
          const r = await api("/auth/google", {
            method: "POST",
            body: JSON.stringify({ id_token: idToken }),
          });
          guardarToken(r.token);
          alEntrar({ rol: r.rol, nombre: r.nombre });
        } catch (e) {
          setError(e.message);
        } finally {
          setCargando(false);
        }
      })();
    }
  }, [respuestaGoogle]);

  async function entrarConGoogle() {
    if (!GOOGLE_CLIENT_ID) {
      setError("Acceso con Google no configurado. Ver src/configuracion.js");
      return;
    }
    pedirGoogle();
  }

  async function enviar() {
    setError("");
    setCargando(true);
    try {
      const r = await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      guardarToken(r.token);
      alEntrar({ rol: r.rol, nombre: r.nombre });
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  async function autenticarBiometria() {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        setError("Dispositivo no compatible con biometría");
        return;
      }
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        setError("No hay biometría registrada en este dispositivo");
        return;
      }
      
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Iniciar sesión rápida',
        fallbackLabel: 'Usar contraseña'
      });
      
      if (res.success) {
        alEntrar({ rol: "VOLUNTARIO", nombre: "Usuario Biométrico" });
      }
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ backgroundColor: COLORES.fondo }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Hero de marca con animaciones */}
        <View style={estilos.hero}>
          <Animated.View style={[estilos.marcaSello, {
            opacity: selloAnim,
            transform: [
              { scale: selloAnim },
              { rotate: "-6deg" },
            ],
          }]}>
            <Text style={estilos.marcaSelloTexto}>RSE</Text>
          </Animated.View>
          <Animated.View style={{ opacity: tituloAnim, transform: [{ translateY: tituloAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
            <Text style={estilos.marca}>Red Solidaria</Text>
            <Text style={estilos.marcaAcento}>de Emergencias</Text>
            <Text style={estilos.lema}>Que cada donación llegue donde falta</Text>
          </Animated.View>
        </View>

        {/* Onda de transicion */}
        <Svg width={ANCHO} height={44} viewBox={`0 0 ${ANCHO} 44`} style={{ marginTop: -1 }}>
          <Path d={`M0 0 H${ANCHO} V14 Q ${ANCHO * 0.75} 44 ${ANCHO * 0.5} 26 T 0 30 Z`} fill={COLORES.navy} />
        </Svg>

        <Animated.View style={[estilos.cuerpo, {
          opacity: formAnim,
          transform: [{ translateY: formAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
        }]}>
          <View style={[estilos.formulario, SOMBRA.media]}>
            <Text style={estilos.formularioTitulo}>Inicia sesión para continuar</Text>

            <Campo etiqueta="Email" value={email} onChangeText={setEmail}
              placeholder="correo@mail.cl" autoCapitalize="none" keyboardType="email-address"
              valido={emailValido}
              iconoDerecho={emailValido ? <IconoCheck color={COLORES.exito} size={18} /> : null}
            />
            <Campo etiqueta="Contraseña" value={password} onChangeText={setPassword}
              placeholder="Mínimo 8 caracteres" secureTextEntry={!verPassword}
              valido={passwordValido}
              iconoDerecho={
                <TouchableOpacity onPress={() => setVerPassword(!verPassword)}>
                  {verPassword
                    ? <IconoOjoCerrado color={COLORES.textoTerciario} size={18} />
                    : <IconoOjo color={COLORES.textoTerciario} size={18} />
                  }
                </TouchableOpacity>
              }
            />

            <Mensaje texto={error} tipo="error" />

            <Boton
              titulo={cargando ? "Entrando..." : "Entrar a la Red"}
              color={COLORES.coral}
              onPress={enviar}
              deshabilitado={cargando || !emailValido || !passwordValido}
            />
          </View>

          <TouchableOpacity onPress={abrirRegistro} style={{ marginTop: ESP.m }}>
            <Text style={estilos.alternar}>
              ¿Primera vez? <Text style={{ fontWeight: "700", color: COLORES.azul }}>Crear una cuenta</Text>
            </Text>
          </TouchableOpacity>

          <View style={estilos.separadorFila}>
            <View style={estilos.separadorLinea} />
            <Text style={estilos.separadorTexto}>o continuar con</Text>
            <View style={estilos.separadorLinea} />
          </View>

          <TouchableOpacity style={estilos.botonGoogle} onPress={entrarConGoogle} activeOpacity={0.8}>
            <Svg width={18} height={18} viewBox="0 0 48 48">
              <Path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z" />
              <Path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
              <Path fill="#FBBC05" d="M10.4 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.8-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.7l7.8-6.1z" />
              <Path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.4-5.5l-7.5-5.8c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.7-3.7-13.6-9l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
            </Svg>
            <Text style={estilos.botonGoogleTexto}>Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={estilos.botonBiometria} onPress={autenticarBiometria} activeOpacity={0.8}>
            <Text style={estilos.botonBiometriaTexto}>Entrar con FaceID / Huella</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  hero: {
    backgroundColor: COLORES.navy,
    alignItems: "center",
    paddingTop: ESP.xxl * 1.6,
    paddingBottom: ESP.xl,
  },
  marcaSello: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: COLORES.coral,
    alignItems: "center", justifyContent: "center",
    marginBottom: ESP.l,
    ...SOMBRA.glow(COLORES.coral),
  },
  marcaSelloTexto: { color: COLORES.blanco, fontWeight: "900", fontSize: 22, letterSpacing: 1.5 },
  btnTexto: { ...TIPO.subtitulo, color: COLORES.blanco, fontWeight: "700" },
  btnRegistro: {
    padding: ESP.l, borderRadius: 12,
    alignItems: "center",
    marginTop: ESP.m,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.02)"
  },
  btnRegistroTexto: { ...TIPO.cuerpo, color: COLORES.blanco, fontWeight: "600" },
  marca: { ...TIPO.display, color: COLORES.blanco, textAlign: "center" },
  marcaAcento: { ...TIPO.titulo, color: COLORES.coral, marginTop: -4, textAlign: "center" },
  lema: { ...TIPO.secundario, color: COLORES.blanco, marginTop: ESP.s, fontStyle: "italic", textAlign: "center", opacity: 0.85 },
  cuerpo: { flex: 1, paddingHorizontal: ESP.xl, paddingTop: ESP.s },
  formulario: {
    backgroundColor: COLORES.superficie,
    borderRadius: RADIO.xl,
    padding: ESP.xl,
    borderWidth: 1,
    borderColor: COLORES.bordeSutil,
  },
  formularioTitulo: { ...TIPO.titulo, color: COLORES.texto, marginBottom: ESP.l },
  rolEtiqueta: { ...TIPO.micro, color: COLORES.textoSecundario, marginBottom: 6 },
  alternar: {
    textAlign: "center", marginTop: ESP.xl, marginBottom: ESP.xl,
    ...TIPO.cuerpo, color: COLORES.textoSecundario,
  },
  separadorFila: { flexDirection: "row", alignItems: "center", marginTop: ESP.l },
  separadorLinea: { flex: 1, height: 1, backgroundColor: COLORES.borde },
  separadorTexto: { ...TIPO.micro, color: COLORES.textoTerciario, marginHorizontal: ESP.m },
  botonGoogle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORES.superficie,
    borderWidth: 1.5,
    borderColor: COLORES.borde,
    borderRadius: RADIO.m,
    paddingVertical: 12,
    marginTop: ESP.m,
    gap: ESP.s,
  },
  botonGoogleTexto: { ...TIPO.cuerpo, fontWeight: "700", color: COLORES.texto },
  botonBiometria: {
    padding: ESP.m,
    borderRadius: RADIO.m,
    borderWidth: 1,
    borderColor: COLORES.cyan,
    alignItems: 'center',
    backgroundColor: 'rgba(0,255,255,0.05)',
  },
  botonBiometriaTexto: {
    color: COLORES.cyan,
    fontWeight: "600",
    ...TIPO.cuerpo
  }
});
