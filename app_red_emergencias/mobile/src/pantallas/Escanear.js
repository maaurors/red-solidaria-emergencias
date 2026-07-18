
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Animated, TouchableOpacity, Alert } from "react-native";
import { api } from "../api";
import { COLORES, ESP, TIPO, SOMBRA, RADIO } from "../tema";
import {
  Encabezado, Boton, ModalDeslizante, Cargando, Aparecer,
  MetricaGrande, Etiqueta,
} from "../componentes";
import { IconoCaja, IconoCheck, IconoCerrar } from "../iconos";

// MOCK: Simular la camara si no está instalada, para mantener el template premium
function CamaraMock({ onBarcodeScanned }) {
  return (
    <View style={estilos.camaraMock}>
      <Text style={estilos.camaraTexto}>Cámara activa</Text>
      <Boton
        titulo="Simular QR detectado"
        color={COLORES.navy}
        onPress={() => onBarcodeScanned({ data: "RSE-DON-12345" })}
      />
    </View>
  );
}

export default function Escanear() {
  const [tienePermiso, setTienePermiso] = useState(null);
  const [escaneado, setEscaneado] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const lineaAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTienePermiso(true);

    // Animacion de linea de escaneo
    Animated.loop(
      Animated.sequence([
        Animated.timing(lineaAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(lineaAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (escaneado) return;
    setEscaneado(true);
    setProcesando(true);

    try {
      // Simular busqueda o procesar de API
      const r = await api(`/donaciones/qr/${data}`);
      setResultado(r);
    } catch (e) {
      Alert.alert(
        "Error de escaneo",
        e.message || "Código inválido o no reconocido.",
        [{ text: "Reintentar", onPress: () => setEscaneado(false) }]
      );
    }
    setProcesando(false);
  };

  const confirmarIngreso = async () => {
    if (!resultado) return;
    setProcesando(true);
    try {
      await api(`/donaciones/ingresar`, {
        method: "POST",
        body: JSON.stringify({ id_donacion: resultado.id_donacion }),
      });
      Alert.alert("Éxito", "Donación ingresada a bodega correctamente", [
        { text: "OK", onPress: reiniciar }
      ]);
    } catch (e) {
      Alert.alert("Error", e.message);
    }
    setProcesando(false);
  };

  const reiniciar = () => {
    setEscaneado(false);
    setResultado(null);
  };

  const translateY = lineaAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 250], // Alto del marco de escaneo
  });

  if (tienePermiso === null) return <Cargando />;
  if (tienePermiso === false) return <View style={estilos.contenedor}><Text>Sin acceso a cámara</Text></View>;

  return (
    <View style={estilos.contenedor}>
      <Encabezado titulo="Escanear QR" subtitulo="Ingreso a bodega" />

      <View style={estilos.camaraContenedor}>
        {/* Aqui iria <CameraView ... /> */}
        <CamaraMock onBarcodeScanned={handleBarCodeScanned} />

        {/* Overlay premium */}
        <View style={estilos.overlay}>
          <View style={estilos.marcoSuperior} />
          <View style={estilos.filaMedio}>
            <View style={estilos.marcoLateral} />
            <View style={estilos.areaEscaneo}>
              <View style={[estilos.esquina, estilos.esqTL]} />
              <View style={[estilos.esquina, estilos.esqTR]} />
              <View style={[estilos.esquina, estilos.esqBL]} />
              <View style={[estilos.esquina, estilos.esqBR]} />

              <Animated.View style={[estilos.lineaEscaneo, { transform: [{ translateY }] }]} />
            </View>
            <View style={estilos.marcoLateral} />
          </View>
          <View style={estilos.marcoInferior}>
            <Text style={estilos.textoOverlay}>Apunta al código QR de la donación</Text>
          </View>
        </View>
      </View>

      {/* Modal interactivo de resultado */}
      <ModalDeslizante
        visible={!!resultado}
        onCerrar={reiniciar}
        titulo={resultado ? `Donación #${resultado.id_donacion}` : ""}
      >
        {resultado && (
          <View>
            <View style={estilos.resHeader}>
              <Etiqueta texto={resultado.estado} color={resultado.estado === "RECIBIDA" ? COLORES.teal : COLORES.naranja} />
              <Text style={estilos.resFecha}>{resultado.fecha}</Text>
            </View>

            <View style={estilos.donanteBox}>
              <Text style={estilos.donanteLabel}>Donante</Text>
              <Text style={estilos.donanteNombre}>{resultado.donante}</Text>
            </View>

            <Text style={estilos.seccionTitulo}>Artículos contenidos</Text>
            {resultado.items.map((it, i) => (
              <Aparecer key={i} retraso={i * 50}>
                <View style={estilos.resItem}>
                  <IconoCaja color={COLORES.navy} size={20} />
                  <View style={{ flex: 1, marginLeft: ESP.m }}>
                    <Text style={estilos.resItemNombre}>{it.item}</Text>
                    <Text style={estilos.resItemCat}>{it.categoria}</Text>
                  </View>
                  <Text style={estilos.resItemCant}>{it.cantidad}</Text>
                  <Text style={estilos.resItemUni}>{it.unidad}</Text>
                </View>
              </Aparecer>
            ))}

            <View style={{ marginTop: ESP.xl }}>
              <Boton
                titulo={procesando ? "Procesando..." : "Confirmar Ingreso a Bodega"}
                color={COLORES.teal}
                onPress={confirmarIngreso}
                deshabilitado={procesando || resultado.estado !== "RECIBIDA"}
                icono={<IconoCheck color={COLORES.blanco} size={18} />}
              />
            </View>
          </View>
        )}
      </ModalDeslizante>

      {procesando && !resultado && (
        <View style={estilos.cargandoOverlay}>
          <Cargando color={COLORES.blanco} />
        </View>
      )}
    </View>
  );
}

const COLOR_OVERLAY = "rgba(0,0,0,0.6)";

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.fondo },
  camaraContenedor: { flex: 1, position: "relative" },
  camaraMock: { flex: 1, backgroundColor: "#1a1a1a", alignItems: "center", justifyContent: "center" },
  camaraTexto: { color: COLORES.blanco, marginBottom: 20 },
  overlay: { ...StyleSheet.absoluteFillObject },
  marcoSuperior: { flex: 1, backgroundColor: COLOR_OVERLAY },
  marcoInferior: { flex: 1, backgroundColor: COLOR_OVERLAY, alignItems: "center", paddingTop: ESP.xl },
  filaMedio: { flexDirection: "row", height: 250 },
  marcoLateral: { flex: 1, backgroundColor: COLOR_OVERLAY },
  areaEscaneo: { width: 250, height: 250, position: "relative" },
  textoOverlay: { ...TIPO.cuerpo, color: COLORES.blanco, fontWeight: "600", textAlign: "center" },
  esquina: {
    position: "absolute", width: 40, height: 40,
    borderColor: COLORES.coral,
  },
  esqTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
  esqTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
  esqBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
  esqBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },
  lineaEscaneo: {
    width: "100%", height: 2,
    backgroundColor: COLORES.coral,
    ...SOMBRA.glow(COLORES.coral),
  },
  cargandoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.8)",
    alignItems: "center", justifyContent: "center",
  },
  resHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: ESP.m },
  resFecha: { ...TIPO.secundario, color: COLORES.textoSecundario },
  donanteBox: {
    backgroundColor: COLORES.superficie,
    padding: ESP.m, borderRadius: RADIO.m,
    borderWidth: 1, borderColor: COLORES.bordeSutil,
    marginBottom: ESP.l,
  },
  donanteLabel: { ...TIPO.micro, color: COLORES.textoSecundario },
  donanteNombre: { ...TIPO.subtitulo, color: COLORES.texto, marginTop: 2 },
  seccionTitulo: { ...TIPO.subtitulo, color: COLORES.texto, marginBottom: ESP.m },
  resItem: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORES.fondo,
    padding: ESP.m, borderRadius: RADIO.m,
    marginBottom: ESP.s,
  },
  resItemNombre: { ...TIPO.cuerpo, fontWeight: "600", color: COLORES.texto },
  resItemCat: { ...TIPO.micro, color: COLORES.textoSecundario },
  resItemCant: { ...TIPO.subtitulo, color: COLORES.navy, fontWeight: "800", marginRight: 4 },
  resItemUni: { ...TIPO.micro, color: COLORES.textoSecundario },
});
