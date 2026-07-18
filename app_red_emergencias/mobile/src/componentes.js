// Libreria de componentes premium: estados de interaccion, skeletons,
// metricas, modales, filtros, timeline, toasts, contadores animados.
import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, Animated,
  TouchableOpacity, Modal, ScrollView, Dimensions, Platform,
} from "react-native";
import { COLORES, ESP, TIPO, SOMBRA, RADIO, ANIM } from "./tema";

const { width: ANCHO_PANTALLA } = Dimensions.get("window");

// ─── Tarjeta con elevacion ────────────────────────────────────

export function Tarjeta({ children, style, variante = "normal" }) {
  const esHero = variante === "hero";
  return (
    <View style={[
      estilos.tarjeta,
      SOMBRA.suave,
      esHero && estilos.tarjetaHero,
      style,
    ]}>
      {children}
    </View>
  );
}

// ─── Boton con feedback de presion (escala + opacidad) ────────

export function Boton({ titulo, onPress, color = COLORES.navy, deshabilitado = false, variante = "solido", icono, tamaño = "normal" }) {
  const escala = useRef(new Animated.Value(1)).current;
  const animar = (v) => Animated.spring(escala, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const esFantasma = variante === "fantasma";
  const esPequeno = tamaño === "pequeno";

  return (
    <Animated.View style={{ transform: [{ scale: escala }] }}>
      <Pressable
        onPress={onPress}
        disabled={deshabilitado}
        onPressIn={() => animar(0.96)}
        onPressOut={() => animar(1)}
        style={[
          estilos.boton,
          esPequeno && { paddingVertical: 10, borderRadius: RADIO.s },
          esFantasma
            ? { backgroundColor: "transparent", borderWidth: 1.5, borderColor: color }
            : { backgroundColor: deshabilitado ? COLORES.textoTerciario : color },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
          {icono && <View style={{ marginRight: 8 }}>{icono}</View>}
          <Text style={[
            estilos.botonTexto,
            esPequeno && { fontSize: 13.5 },
            esFantasma && { color },
          ]}>
            {titulo}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Campo con estado de foco y validacion visual ─────────────

export function Campo({ etiqueta, error, valido, iconoDerecho, ...props }) {
  const [foco, setFoco] = useState(false);
  const borderColor = error ? COLORES.error : foco ? COLORES.bordeFoco : valido ? COLORES.exito : COLORES.borde;

  return (
    <View style={{ marginBottom: ESP.m }}>
      <Text style={estilos.campoEtiqueta}>{etiqueta}</Text>
      <View style={{ position: "relative" }}>
        <TextInput
          style={[estilos.entrada, { borderColor }, iconoDerecho && { paddingRight: 44 }]}
          placeholderTextColor={COLORES.textoTerciario}
          onFocus={() => setFoco(true)}
          onBlur={() => setFoco(false)}
          {...props}
        />
        {iconoDerecho && (
          <View style={estilos.iconoCampo}>
            {iconoDerecho}
          </View>
        )}
      </View>
      {error && typeof error === "string" && (
        <Text style={estilos.campoError}>{error}</Text>
      )}
    </View>
  );
}

// ─── Mensajes con fondo semantico ─────────────────────────────

export function Mensaje({ texto, tipo = "info" }) {
  if (!texto) return null;
  const esError = tipo === "error";
  return (
    <Aparecer>
      <View style={[estilos.mensaje, { backgroundColor: esError ? COLORES.errorFondo : COLORES.exitoFondo }]}>
        <Text style={{ color: esError ? COLORES.error : COLORES.exito, ...TIPO.secundario, fontWeight: "600" }}>
          {texto}
        </Text>
      </View>
    </Aparecer>
  );
}

// ─── Toast flotante ───────────────────────────────────────────

export function Toast({ visible, mensaje, tipo = "exito", onOcultar }) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 5 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, { toValue: -100, duration: 300, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => onOcultar?.());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, translateY, opacity, onOcultar]);

  if (!visible) return null;
  const bg = tipo === "error" ? COLORES.error : COLORES.exito;

  return (
    <Animated.View style={[estilos.toast, { backgroundColor: bg, transform: [{ translateY }], opacity }]}>
      <Text style={estilos.toastTexto}>{mensaje}</Text>
    </Animated.View>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────

export function Skeleton({ alto = 16, ancho = "100%", radio = RADIO.s, style }) {
  const opacidad = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const bucle = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidad, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacidad, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    );
    bucle.start();
    return () => bucle.stop();
  }, [opacidad]);
  return (
    <Animated.View
      style={[{ height: alto, width: ancho, borderRadius: radio, backgroundColor: COLORES.borde, opacity: opacidad }, style]}
    />
  );
}

export function Cargando() {
  return (
    <View style={{ padding: ESP.m }}>
      {[0, 1, 2].map((i) => (
        <Tarjeta key={i} style={{ marginBottom: ESP.m }}>
          <Skeleton alto={18} ancho="55%" />
          <Skeleton alto={12} ancho="35%" style={{ marginTop: ESP.s }} />
          <Skeleton alto={8} style={{ marginTop: ESP.m }} />
        </Tarjeta>
      ))}
    </View>
  );
}

// ─── Chip de prioridad/estado ─────────────────────────────────

export function Etiqueta({ texto, color, icono }) {
  return (
    <View style={[estilos.chip, { backgroundColor: color + "18", borderColor: color + "40" }]}>
      {icono && <View style={{ marginRight: 4 }}>{icono}</View>}
      <Text style={[estilos.chipTexto, { color }]}>{texto}</Text>
    </View>
  );
}

// ─── Chips de filtro seleccionables ───────────────────────────

export function ChipFiltro({ opciones, seleccionado, onCambio }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: ESP.l, paddingVertical: ESP.s, gap: ESP.s }}>
      {opciones.map((op) => {
        const activo = seleccionado === op.valor;
        return (
          <TouchableOpacity
            key={op.valor}
            onPress={() => onCambio(op.valor)}
            style={[estilos.chipFiltro, activo && estilos.chipFiltroActivo]}
          >
            {op.icono && <View style={{ marginRight: 5 }}>{op.icono}</View>}
            <Text style={[estilos.chipFiltroTexto, activo && { color: COLORES.blanco }]}>
              {op.etiqueta}
            </Text>
            {op.contador !== undefined && (
              <View style={[estilos.chipContador, activo && { backgroundColor: "rgba(255,255,255,0.3)" }]}>
                <Text style={[estilos.chipContadorTexto, activo && { color: COLORES.blanco }]}>
                  {op.contador}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Encabezado de pantalla ───────────────────────────────────

export function Encabezado({ titulo, subtitulo, extra }) {
  return (
    <View style={estilos.encabezado}>
      <View style={{ flex: 1 }}>
        <Text style={estilos.encabezadoTitulo}>{titulo}</Text>
        {subtitulo ? <Text style={estilos.encabezadoSub}>{subtitulo}</Text> : null}
      </View>
      {extra}
    </View>
  );
}

// ─── Estado vacio ─────────────────────────────────────────────

export function Vacio({ titulo, detalle, icono }) {
  return (
    <View style={estilos.vacio}>
      <View style={estilos.vacioCirculo}>
        {icono || <Text style={{ fontSize: 26 }}>—</Text>}
      </View>
      <Text style={estilos.vacioTitulo}>{titulo}</Text>
      {detalle ? <Text style={estilos.vacioDetalle}>{detalle}</Text> : null}
    </View>
  );
}

// ─── Barra de progreso animada ────────────────────────────────

export function BarraProgreso({ porcentaje, color = COLORES.teal, alto = 7 }) {
  const ancho = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(ancho, {
      toValue: Math.min(100, Math.max(0, porcentaje)),
      duration: 650,
      useNativeDriver: false,
    }).start();
  }, [porcentaje, ancho]);
  return (
    <View style={[estilos.barraFondo, { height: alto }]}>
      <Animated.View
        style={[estilos.barraAvance, {
          height: alto,
          backgroundColor: color,
          width: ancho.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }),
        }]}
      />
    </View>
  );
}

// ─── Aparicion suave ──────────────────────────────────────────

export function Aparecer({ children, retraso = 0 }) {
  const opacidad = useRef(new Animated.Value(0)).current;
  const desplazamiento = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacidad, { toValue: 1, duration: 350, delay: retraso, useNativeDriver: true }),
      Animated.timing(desplazamiento, { toValue: 0, duration: 350, delay: retraso, useNativeDriver: true }),
    ]).start();
  }, [opacidad, desplazamiento, retraso]);
  return (
    <Animated.View style={{ opacity: opacidad, transform: [{ translateY: desplazamiento }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Metrica Grande (cifra + subtitulo + tendencia) ───────────

export function MetricaGrande({ cifra, subtitulo, icono, color = COLORES.coral, tendencia }) {
  return (
    <Tarjeta style={estilos.metrica}>
      {icono && (
        <View style={[estilos.metricaIcono, { backgroundColor: color + "15" }]}>
          {icono}
        </View>
      )}
      <ContadorAnimado valor={Number(cifra) || 0} style={[TIPO.cifra, { color }]} />
      <Text style={estilos.metricaSubtitulo}>{subtitulo}</Text>
      {tendencia && (
        <Text style={[estilos.metricaTendencia, { color: tendencia.startsWith("+") ? COLORES.exito : COLORES.error }]}>
          {tendencia}
        </Text>
      )}
    </Tarjeta>
  );
}

// ─── Contador Animado (numeros que se animan al cambiar) ──────

export function ContadorAnimado({ valor, style }) {
  const [display, setDisplay] = useState(0);
  const animRef = useRef(null);

  useEffect(() => {
    const inicio = display;
    const diff = valor - inicio;
    if (diff === 0) return;
    const duracion = Math.min(600, Math.abs(diff) * 20);
    const frames = Math.max(10, Math.floor(duracion / 16));
    let frame = 0;

    const step = () => {
      frame++;
      const progreso = frame / frames;
      const easeOut = 1 - Math.pow(1 - progreso, 3);
      setDisplay(Math.round(inicio + diff * easeOut));
      if (frame < frames) {
        animRef.current = requestAnimationFrame(step);
      }
    };
    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [valor]);

  return <Text style={style}>{display.toLocaleString()}</Text>;
}

// ─── Selector Segmento tipo iOS ───────────────────────────────

export function SelectorSegmento({ opciones, seleccionado, onCambio }) {
  const indicadorX = useRef(new Animated.Value(0)).current;
  const anchoSegmento = (ANCHO_PANTALLA - ESP.xl * 2 - 8) / opciones.length;

  useEffect(() => {
    const idx = opciones.findIndex(o => o.valor === seleccionado);
    Animated.spring(indicadorX, {
      toValue: idx * anchoSegmento,
      useNativeDriver: true,
      speed: 20,
      bounciness: 3,
    }).start();
  }, [seleccionado, opciones, anchoSegmento, indicadorX]);

  return (
    <View style={estilos.segmento}>
      <Animated.View
        style={[estilos.segmentoIndicador, {
          width: anchoSegmento,
          transform: [{ translateX: indicadorX }],
        }]}
      />
      {opciones.map((op) => (
        <TouchableOpacity
          key={op.valor}
          style={[estilos.segmentoBoton, { width: anchoSegmento }]}
          onPress={() => onCambio(op.valor)}
        >
          <Text style={[
            estilos.segmentoTexto,
            seleccionado === op.valor && estilos.segmentoTextoActivo,
          ]}>
            {op.etiqueta}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Modal Deslizante (Bottom Sheet simple) ───────────────────

export function ModalDeslizante({ visible, onCerrar, titulo, children }) {
  const translateY = useRef(new Animated.Value(500)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 4 }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 500, duration: 250, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, translateY, overlayOpacity]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[estilos.modalOverlay, { opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCerrar} />
      </Animated.View>
      <Animated.View style={[estilos.modalSheet, { transform: [{ translateY }] }]}>
        <View style={estilos.modalDragHandle} />
        {titulo && (
          <View style={estilos.modalHeader}>
            <Text style={estilos.modalTitulo}>{titulo}</Text>
            <TouchableOpacity onPress={onCerrar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={{ color: COLORES.azul, ...TIPO.cuerpo, fontWeight: "600" }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        )}
        <ScrollView style={{ maxHeight: Dimensions.get("window").height * 0.6 }}
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ─── Timeline Item ────────────────────────────────────────────

export function TimelineItem({ color = COLORES.navy, titulo, subtitulo, derecha, esUltimo = false }) {
  return (
    <View style={estilos.timelineItem}>
      <View style={estilos.timelineLinea}>
        <View style={[estilos.timelinePunto, { backgroundColor: color }]} />
        {!esUltimo && <View style={estilos.timelineConector} />}
      </View>
      <View style={estilos.timelineContenido}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={estilos.timelineTitulo}>{titulo}</Text>
          {derecha}
        </View>
        {subtitulo && <Text style={estilos.timelineSubtitulo}>{subtitulo}</Text>}
      </View>
    </View>
  );
}

// ─── Barra de busqueda ────────────────────────────────────────

export function BarraBusqueda({ valor, onCambio, placeholder = "Buscar..." }) {
  return (
    <View style={estilos.busqueda}>
      <View style={estilos.busquedaIcono}>
        <Text style={{ color: COLORES.textoTerciario, fontSize: 16 }}>⌕</Text>
      </View>
      <TextInput
        style={estilos.busquedaInput}
        value={valor}
        onChangeText={onCambio}
        placeholder={placeholder}
        placeholderTextColor={COLORES.textoTerciario}
      />
    </View>
  );
}

// ─── Stepper Visual (Paso 1 → 2 → 3) ─────────────────────────

export function Stepper({ pasos, activo }) {
  return (
    <View style={estilos.stepper}>
      {pasos.map((paso, i) => {
        const completado = i < activo;
        const esActivo = i === activo;
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <View style={[estilos.stepperLinea, completado && { backgroundColor: COLORES.navy }]} />
            )}
            <View style={[
              estilos.stepperCirculo,
              completado && { backgroundColor: COLORES.navy },
              esActivo && { backgroundColor: COLORES.coral, borderColor: COLORES.coral },
            ]}>
              <Text style={[
                estilos.stepperNumero,
                (completado || esActivo) && { color: COLORES.blanco },
              ]}>
                {completado ? "" : i + 1}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── Sparkline SVG mini (grafico de tendencia) ────────────────
// Renderizado con View + Animated para evitar dependencia extra
export function MiniGrafico({ datos = [], color = COLORES.coral, alto = 40, ancho = 120 }) {
  if (datos.length < 2) return <View style={{ height: alto, width: ancho }} />;
  const max = Math.max(...datos, 1);
  const min = Math.min(...datos, 0);
  const rango = max - min || 1;
  const step = ancho / (datos.length - 1);

  return (
    <View style={{ height: alto, width: ancho, flexDirection: "row", alignItems: "flex-end" }}>
      {datos.map((v, i) => {
        const h = ((v - min) / rango) * (alto - 4) + 4;
        return (
          <View key={i} style={{
            width: step - 2,
            height: h,
            backgroundColor: color + "30",
            borderTopLeftRadius: 2,
            borderTopRightRadius: 2,
            marginRight: i < datos.length - 1 ? 2 : 0,
          }} />
        );
      })}
    </View>
  );
}

// ─── Progress Ring (mini donut) ───────────────────────────────

export function ProgressRing({ porcentaje, radio = 28, grosor = 5, color = COLORES.teal }) {
  const circunferencia = 2 * Math.PI * (radio - grosor);
  const progreso = Math.min(100, Math.max(0, porcentaje));
  const offset = circunferencia - (progreso / 100) * circunferencia;

  // Render simple con View borders (no requiere SVG extra)
  return (
    <View style={{ width: radio * 2, height: radio * 2, alignItems: "center", justifyContent: "center" }}>
      <View style={{
        width: radio * 2, height: radio * 2, borderRadius: radio,
        borderWidth: grosor, borderColor: COLORES.borde,
        position: "absolute",
      }} />
      <View style={{
        width: radio * 2, height: radio * 2, borderRadius: radio,
        borderWidth: grosor, borderColor: color,
        borderTopColor: progreso > 25 ? color : "transparent",
        borderRightColor: progreso > 50 ? color : "transparent",
        borderBottomColor: progreso > 75 ? color : "transparent",
        borderLeftColor: progreso > 0 ? color : "transparent",
        position: "absolute",
        transform: [{ rotate: "-90deg" }],
      }} />
      <Text style={{ fontSize: 11, fontWeight: "800", color: COLORES.texto }}>
        {Math.round(progreso)}%
      </Text>
    </View>
  );
}

// ─── Badge de notificacion ────────────────────────────────────

export function Badge({ count, color = COLORES.coral }) {
  if (!count || count <= 0) return null;
  return (
    <View style={[estilos.badge, { backgroundColor: color }]}>
      <Text style={estilos.badgeTexto}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: COLORES.superficie,
    borderRadius: RADIO.l,
    padding: ESP.l,
    marginBottom: ESP.m,
    borderWidth: 1,
    borderColor: COLORES.bordeSutil,
  },
  tarjetaHero: {
    borderWidth: 0,
    backgroundColor: COLORES.superficieElevada,
    ...SOMBRA.media,
  },
  boton: {
    borderRadius: RADIO.m,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: ESP.xs,
  },
  botonTexto: { color: COLORES.blanco, fontWeight: "700", fontSize: 15.5, letterSpacing: 0.2 },
  campoEtiqueta: { ...TIPO.micro, color: COLORES.textoSecundario, marginBottom: 6, textTransform: "uppercase" },
  campoError: { ...TIPO.micro, color: COLORES.error, marginTop: 4 },
  entrada: {
    borderWidth: 1.5,
    borderColor: COLORES.borde,
    borderRadius: RADIO.m,
    paddingHorizontal: ESP.l,
    paddingVertical: 12,
    backgroundColor: COLORES.superficie,
    fontSize: 15,
    color: COLORES.texto,
  },
  iconoCampo: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  mensaje: {
    borderRadius: RADIO.m,
    paddingVertical: ESP.s + 2,
    paddingHorizontal: ESP.l,
    marginVertical: ESP.s,
    alignItems: "center",
  },
  toast: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    left: ESP.l,
    right: ESP.l,
    borderRadius: RADIO.m,
    paddingVertical: ESP.m,
    paddingHorizontal: ESP.l,
    zIndex: 9999,
    ...SOMBRA.fuerte,
  },
  toastTexto: { color: COLORES.blanco, ...TIPO.cuerpo, fontWeight: "600", textAlign: "center" },
  chip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIO.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipTexto: { ...TIPO.micro, fontWeight: "700" },
  chipFiltro: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIO.pill,
    borderWidth: 1.5,
    borderColor: COLORES.borde,
    backgroundColor: COLORES.superficie,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipFiltroActivo: {
    backgroundColor: COLORES.navy,
    borderColor: COLORES.navy,
  },
  chipFiltroTexto: { ...TIPO.secundario, fontWeight: "600", color: COLORES.texto },
  chipContador: {
    backgroundColor: COLORES.borde,
    borderRadius: RADIO.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  chipContadorTexto: { ...TIPO.micro, fontWeight: "700", color: COLORES.textoSecundario },
  encabezado: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: ESP.l,
    paddingTop: ESP.l,
    paddingBottom: ESP.s,
  },
  encabezadoTitulo: { ...TIPO.titulo, color: COLORES.texto },
  encabezadoSub: { ...TIPO.secundario, color: COLORES.textoSecundario, marginTop: 2 },
  vacio: { alignItems: "center", paddingVertical: ESP.xxl * 1.5, paddingHorizontal: ESP.xl },
  vacioCirculo: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: COLORES.bordeSutil,
    alignItems: "center", justifyContent: "center", marginBottom: ESP.l,
  },
  vacioTitulo: { ...TIPO.subtitulo, color: COLORES.texto },
  vacioDetalle: { ...TIPO.secundario, color: COLORES.textoSecundario, textAlign: "center", marginTop: 4 },
  barraFondo: { height: 7, backgroundColor: COLORES.bordeSutil, borderRadius: 4, marginTop: ESP.s, overflow: "hidden" },
  barraAvance: { height: 7, borderRadius: 4 },
  metrica: { flex: 1, alignItems: "center", paddingVertical: ESP.xl },
  metricaIcono: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
    marginBottom: ESP.s,
  },
  metricaSubtitulo: { ...TIPO.micro, color: COLORES.textoSecundario, textAlign: "center", marginTop: 4 },
  metricaTendencia: { ...TIPO.micro, fontWeight: "700", marginTop: 2 },
  segmento: {
    flexDirection: "row",
    backgroundColor: COLORES.fondo,
    borderRadius: RADIO.m,
    padding: 4,
    marginBottom: ESP.m,
    position: "relative",
  },
  segmentoIndicador: {
    position: "absolute",
    top: 4,
    left: 4,
    bottom: 4,
    backgroundColor: COLORES.superficie,
    borderRadius: RADIO.s,
    ...SOMBRA.suave,
  },
  segmentoBoton: { paddingVertical: 9, borderRadius: RADIO.s, alignItems: "center", zIndex: 1 },
  segmentoTexto: { ...TIPO.secundario, color: COLORES.textoSecundario, fontWeight: "600" },
  segmentoTextoActivo: { color: COLORES.navy, fontWeight: "700" },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORES.overlay,
  },
  modalSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORES.superficie,
    borderTopLeftRadius: RADIO.xxl,
    borderTopRightRadius: RADIO.xxl,
    padding: ESP.xl,
    paddingBottom: Platform.OS === "ios" ? ESP.xxxl : ESP.xl,
    ...SOMBRA.fuerte,
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORES.borde,
    alignSelf: "center",
    marginBottom: ESP.l,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ESP.l,
  },
  modalTitulo: { ...TIPO.titulo, color: COLORES.texto },
  timelineItem: { flexDirection: "row", minHeight: 50 },
  timelineLinea: { alignItems: "center", width: 24, marginRight: ESP.m },
  timelinePunto: {
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: COLORES.superficie,
    ...SOMBRA.suave,
  },
  timelineConector: {
    width: 2, flex: 1, backgroundColor: COLORES.bordeSutil,
    marginVertical: 2,
  },
  timelineContenido: { flex: 1, paddingBottom: ESP.l },
  timelineTitulo: { ...TIPO.cuerpo, color: COLORES.texto, fontWeight: "600" },
  timelineSubtitulo: { ...TIPO.secundario, color: COLORES.textoSecundario, marginTop: 2 },
  busqueda: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORES.fondo,
    borderRadius: RADIO.m,
    paddingHorizontal: ESP.m,
    marginHorizontal: ESP.l,
    marginBottom: ESP.s,
    borderWidth: 1,
    borderColor: COLORES.bordeSutil,
  },
  busquedaIcono: { marginRight: ESP.s },
  busquedaInput: {
    flex: 1, paddingVertical: 10, fontSize: 14,
    color: COLORES.texto,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: ESP.l,
    paddingHorizontal: ESP.xl,
  },
  stepperCirculo: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: COLORES.borde,
    alignItems: "center", justifyContent: "center",
    backgroundColor: COLORES.superficie,
  },
  stepperNumero: { fontSize: 13, fontWeight: "700", color: COLORES.textoTerciario },
  stepperLinea: { flex: 1, height: 2, backgroundColor: COLORES.borde, marginHorizontal: 6 },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeTexto: { color: COLORES.blanco, fontSize: 9, fontWeight: "800" },
});
