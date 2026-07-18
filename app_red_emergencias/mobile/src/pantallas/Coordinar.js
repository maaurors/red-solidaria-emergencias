import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, RefreshControl } from "react-native";
import { api, tiempoRelativo } from "../api";
import { COLORES, ESP, TIPO, RADIO, PRIORIDAD_COLOR } from "../tema";
import {
  Tarjeta, Boton, Mensaje, Cargando, Etiqueta, Encabezado,
  SelectorSegmento, Vacio, Aparecer, TimelineItem,
} from "../componentes";
import { IconoCheck, IconoAsignar, IconoReloj } from "../iconos";

const SEGMENTOS = [
  { valor: "sugerencias", etiqueta: "Sugerencias" },
  { valor: "manual", etiqueta: "Manual" },
  { valor: "historial", etiqueta: "Historial" },
];

const COLOR_ACCION = {
  CREADA: COLORES.azul,
  ASIGNADA: COLORES.teal,
  CAMBIO_ESTADO: COLORES.naranja,
  PUBLICADA: COLORES.coral,
};

export default function Coordinar() {
  const [segmento, setSegmento] = useState("sugerencias");
  const [plan, setPlan] = useState(null);
  const [aplicando, setAplicando] = useState(false);
  const [pendientes, setPendientes] = useState(null);
  const [deficit, setDeficit] = useState([]);
  const [auditoria, setAuditoria] = useState(null);
  const [detalleSel, setDetalleSel] = useState(null);
  const [necesidadSel, setNecesidadSel] = useState(null);
  const [cantidad, setCantidad] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [refrescando, setRefrescando] = useState(false);

  const cargarManual = useCallback(async () => {
    try {
      const [p, d] = await Promise.all([
        api("/donaciones/pendientes", { sinCache: true }),
        api("/deficit", { sinCache: true }),
      ]);
      setPendientes(p);
      setDeficit(Array.isArray(d) ? d : d?.filas || []);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const cargarSugerencias = useCallback(async () => {
    try {
      setError("");
      const r = await api("/donaciones/sugerencias", { sinCache: true });
      setPlan(r.plan);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const cargarAuditoria = useCallback(async () => {
    try {
      setError("");
      setAuditoria(await api("/auditoria", { sinCache: true }));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    setError(""); setMensaje("");
    if (segmento === "sugerencias") cargarSugerencias();
    if (segmento === "manual") cargarManual();
    if (segmento === "historial") cargarAuditoria();
  }, [segmento, cargarSugerencias, cargarManual, cargarAuditoria]);

  async function aplicarPlan() {
    if (!plan || plan.length === 0) return;
    setAplicando(true);
    setError(""); setMensaje("");
    try {
      const r = await api("/donaciones/asignar-lote", {
        method: "POST",
        body: JSON.stringify({
          asignaciones: plan.map((p) => ({
            id_detalle: p.id_detalle,
            id_necesidad: p.id_necesidad,
            cantidad: p.cantidad,
          })),
        }),
      });
      setMensaje(r.mensaje);
      setPlan([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setAplicando(false);
    }
  }

  async function asignarManual() {
    setError(""); setMensaje("");
    if (!detalleSel || !necesidadSel || !Number(cantidad)) {
      setError("Selecciona una donacion, una necesidad y la cantidad");
      return;
    }
    try {
      const r = await api("/donaciones/asignar", {
        method: "POST",
        body: JSON.stringify({ id_detalle: detalleSel, id_necesidad: necesidadSel, cantidad: Number(cantidad) }),
      });
      setMensaje(`${r.mensaje} (necesidad ${r.estado_necesidad})`);
      setDetalleSel(null); setNecesidadSel(null); setCantidad("");
      cargarManual();
    } catch (e) {
      setError(e.message);
    }
  }

  const refrescar = async () => {
    setRefrescando(true);
    if (segmento === "sugerencias") await cargarSugerencias();
    if (segmento === "manual") await cargarManual();
    if (segmento === "historial") await cargarAuditoria();
    setRefrescando(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <Encabezado titulo="Coordinación" subtitulo="Distribución y trazabilidad" />
      <View style={{ paddingHorizontal: ESP.l, marginBottom: ESP.s }}>
        <SelectorSegmento opciones={SEGMENTOS} seleccionado={segmento} onCambio={setSegmento} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: ESP.l, paddingTop: ESP.xs, paddingBottom: ESP.xxl }}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[COLORES.navy]} />}
        showsVerticalScrollIndicator={false}
      >
        <Mensaje texto={error} tipo="error" />
        <Mensaje texto={mensaje} />

        {segmento === "sugerencias" && (
          plan === null ? <Cargando /> : plan.length === 0 ? (
            <Vacio
              titulo="Nada que distribuir"
              detalle="No hay stock disponible o todas las necesidades estan cubiertas"
              icono={<IconoCheck color={COLORES.teal} size={28} />}
            />
          ) : (
            <View>
              <Tarjeta style={estilos.resumenPlan}>
                <IconoAsignar color={COLORES.navy} size={26} />
                <View style={{ flex: 1, marginLeft: ESP.m }}>
                  <Text style={estilos.resumenTitulo}>{plan.length} movimientos sugeridos</Text>
                  <Text style={estilos.resumenSub}>
                    Prioridad alta primero, luego por antiguedad de la solicitud
                  </Text>
                </View>
              </Tarjeta>

              {plan.map((p, i) => (
                <Aparecer key={`${p.id_detalle}-${p.id_necesidad}`} retraso={i * 40}>
                  <Tarjeta>
                    <View style={estilos.filaEntre}>
                      <Text style={estilos.movimiento}>
                        {p.cantidad} {p.unidad_medida} de {p.item}
                      </Text>
                      <Etiqueta texto={p.prioridad} color={PRIORIDAD_COLOR[p.prioridad]} />
                    </View>
                    <Text style={estilos.ruta}>{p.donante}  →  {p.albergue}</Text>
                    <Text style={estilos.motivo}>{p.motivo}</Text>
                  </Tarjeta>
                </Aparecer>
              ))}

              <Boton
                titulo={aplicando ? "Aplicando..." : `Confirmar ${plan.length} asignaciones`}
                color={COLORES.teal}
                onPress={aplicarPlan}
                deshabilitado={aplicando}
              />
            </View>
          )
        )}

        {segmento === "manual" && (
          pendientes === null ? <Cargando /> : (
            <View>
              <Text style={estilos.paso}>1. Donacion en bodega</Text>
              {pendientes.map((p) => (
                <TouchableOpacity key={p.id_detalle} onPress={() => setDetalleSel(p.id_detalle)}>
                  <Tarjeta style={detalleSel === p.id_detalle ? estilos.seleccionado : null}>
                    <Text style={estilos.nombre}>{p.disponible} {p.unidad_medida} de {p.item}</Text>
                    <Text style={estilos.detalleTexto}>Donante: {p.donante}</Text>
                  </Tarjeta>
                </TouchableOpacity>
              ))}
              {pendientes.length === 0 && (
                <Text style={estilos.detalleTexto}>No hay donaciones con saldo en bodega</Text>
              )}

              <Text style={estilos.paso}>2. Necesidad que cubre</Text>
              {deficit.map((n) => (
                <TouchableOpacity key={n.id_necesidad} onPress={() => setNecesidadSel(n.id_necesidad)}>
                  <Tarjeta style={necesidadSel === n.id_necesidad ? estilos.seleccionado : null}>
                    <View style={estilos.filaEntre}>
                      <Text style={estilos.nombre}>{n.albergue}: faltan {n.deficit} {n.item}</Text>
                      <Etiqueta texto={n.prioridad} color={PRIORIDAD_COLOR[n.prioridad]} />
                    </View>
                  </Tarjeta>
                </TouchableOpacity>
              ))}

              <Text style={estilos.paso}>3. Cantidad</Text>
              <TextInput
                style={estilos.cantidad}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={COLORES.textoTerciario}
                value={cantidad}
                onChangeText={(t) => setCantidad(t.replace(/[^0-9]/g, ""))}
              />
              <Boton titulo="Asignar" color={COLORES.navy} onPress={asignarManual} />
            </View>
          )
        )}

        {segmento === "historial" && (
          auditoria === null ? <Cargando /> : auditoria.length === 0 ? (
            <Vacio
              titulo="Sin registros"
              detalle="Las operaciones apareceran aqui a medida que ocurran"
              icono={<IconoReloj color={COLORES.textoSecundario} size={28} />}
            />
          ) : (
            <View>
              <Tarjeta style={estilos.notaAuditoria}>
                <Text style={estilos.notaTexto}>
                  Registro generado por triggers del motor de base de datos.
                  Ninguna operacion puede ejecutarse sin dejar rastro.
                </Text>
              </Tarjeta>
              {auditoria.map((a, i) => (
                <TimelineItem
                  key={a.id_auditoria}
                  color={COLOR_ACCION[a.accion] || COLORES.navy}
                  titulo={`${a.tabla_afectada} ${a.accion.toLowerCase().replace("_", " ")}`}
                  subtitulo={`${a.detalle || ""}${a.usuario_app ? ` · por ${a.usuario_app}` : ""}`}
                  derecha={tiempoRelativo(a.fecha_hora)}
                  esUltimo={i === auditoria.length - 1}
                />
              ))}
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  resumenPlan: { flexDirection: "row", alignItems: "center", backgroundColor: COLORES.navy + "0A" },
  resumenTitulo: { ...TIPO.subtitulo, color: COLORES.navy },
  resumenSub: { ...TIPO.secundario, color: COLORES.textoSecundario, marginTop: 2 },
  filaEntre: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  movimiento: { ...TIPO.subtitulo, color: COLORES.texto, flex: 1, marginRight: ESP.s },
  ruta: { ...TIPO.cuerpo, color: COLORES.texto, marginTop: 6, fontWeight: "600" },
  motivo: { ...TIPO.secundario, color: COLORES.textoSecundario, marginTop: 3 },
  paso: { ...TIPO.subtitulo, color: COLORES.textoSecundario, marginTop: ESP.l, marginBottom: ESP.s },
  nombre: { ...TIPO.cuerpo, fontWeight: "600", color: COLORES.texto, flex: 1, marginRight: ESP.s },
  detalleTexto: { ...TIPO.secundario, color: COLORES.textoSecundario },
  seleccionado: { borderColor: COLORES.navy, borderWidth: 2 },
  cantidad: {
    borderWidth: 1.5, borderColor: COLORES.borde, borderRadius: RADIO.m,
    padding: 12, fontSize: 16, backgroundColor: COLORES.superficie,
    color: COLORES.texto, marginBottom: ESP.s,
  },
  notaAuditoria: { backgroundColor: COLORES.exitoFondo, borderColor: COLORES.teal + "55" },
  notaTexto: { ...TIPO.secundario, color: COLORES.teal },
});
