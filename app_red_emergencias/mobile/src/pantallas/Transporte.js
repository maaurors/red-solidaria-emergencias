import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { api, tiempoRelativo } from "../api";
import { COLORES, ESP, TIPO, RADIO } from "../tema";
import {
  Tarjeta, Boton, Mensaje, Cargando, Encabezado, Vacio, Aparecer,
  SelectorSegmento, ModalDeslizante, Campo, Etiqueta,
} from "../componentes";
import { IconoCaja, IconoCheck, IconoNavegar } from "../iconos";

const ESTADO_COLOR = { OFRECIDO: COLORES.naranja, EN_RUTA: COLORES.azul, ENTREGADO: COLORES.teal };
const SEG = [{ valor: "activos", etiqueta: "Despachos" }, { valor: "ofrecer", etiqueta: "Ofrecer viaje" }];

export default function Transporte() {
  const [segmento, setSegmento] = useState("activos");
  const [despachos, setDespachos] = useState(null);
  const [pendientes, setPendientes] = useState(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [refrescando, setRefrescando] = useState(false);

  const [albergueSel, setAlbergueSel] = useState(null);
  const [seleccion, setSeleccion] = useState({});
  const [vehiculo, setVehiculo] = useState("");
  const [modalEntrega, setModalEntrega] = useState(null);
  const [foto, setFoto] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setError("");
      const [d, p] = await Promise.all([
        api("/transporte", { sinCache: true }),
        api("/transporte/pendientes", { sinCache: true }),
      ]);
      setDespachos(d);
      setPendientes(p);
    } catch (e) {
      setError(e.message);
    } finally {
      setRefrescando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Agrupar cargas pendientes por albergue
  const porAlbergue = {};
  for (const c of pendientes || []) {
    (porAlbergue[c.id_albergue] = porAlbergue[c.id_albergue] || { nombre: c.albergue, comuna: c.comuna, cargas: [] }).cargas.push(c);
  }

  async function tomarFoto() {
    const r = await ImagePicker.launchCameraAsync({ quality: 0.25, base64: true });
    if (!r.canceled && r.assets?.[0]?.base64) setFoto("data:image/jpeg;base64," + r.assets[0].base64);
  }

  async function crearDespacho() {
    setError(""); setMensaje("");
    const ids = Object.entries(seleccion).filter(([, v]) => v).map(([k]) => Number(k));
    if (!albergueSel || !vehiculo || ids.length === 0) {
      setError("Elige albergue, vehiculo y al menos una carga");
      return;
    }
    setEnviando(true);
    try {
      const r = await api("/transporte", {
        method: "POST",
        body: JSON.stringify({ id_albergue: albergueSel, vehiculo, id_asignaciones: ids }),
      });
      setMensaje(r.mensaje);
      setAlbergueSel(null); setSeleccion({}); setVehiculo("");
      setSegmento("activos");
      cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  async function accion(despacho, tipo) {
    setError(""); setMensaje("");
    try {
      if (tipo === "en-ruta") {
        await api(`/transporte/${despacho.id_despacho}/en-ruta`, { method: "POST", body: "{}" });
        setMensaje("En ruta hacia el albergue");
        cargar();
      } else {
        if (!foto) { setError("Toma la foto de entrega"); return; }
        setEnviando(true);
        const r = await api(`/transporte/${despacho.id_despacho}/entregar`, {
          method: "POST", body: JSON.stringify({ foto }),
        });
        setMensaje(r.mensaje);
        setModalEntrega(null); setFoto(null);
        cargar();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  if (despachos === null && !error) return <Cargando />;

  return (
    <View style={{ flex: 1 }}>
      <Encabezado titulo="Transporte" subtitulo="De la bodega al albergue" />
      <View style={{ paddingHorizontal: ESP.l, marginBottom: ESP.s }}>
        <SelectorSegmento opciones={SEG} seleccionado={segmento} onCambio={setSegmento} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: ESP.l, paddingTop: ESP.xs, paddingBottom: ESP.xxl * 2 }}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(); }} />}
        showsVerticalScrollIndicator={false}
      >
        <Mensaje texto={error} tipo="error" />
        <Mensaje texto={mensaje} />

        {segmento === "activos" && (
          (despachos || []).length === 0 ? (
            <Vacio titulo="Sin despachos" detalle="Ofrece un viaje para llevar la ayuda a terreno" />
          ) : (
            (despachos || []).map((d, i) => (
              <Aparecer key={d.id_despacho} retraso={i * 40}>
                <Tarjeta>
                  <View style={estilos.filaEntre}>
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                      <IconoNavegar color={ESTADO_COLOR[d.estado]} size={18} />
                      <Text style={estilos.nombre}>{d.albergue}</Text>
                    </View>
                    <Etiqueta texto={d.estado.replace("_", " ")} color={ESTADO_COLOR[d.estado]} />
                  </View>
                  <Text style={estilos.detalle}>
                    {d.vehiculo} · {d.bultos} bultos · {d.transportista}
                  </Text>
                  <Text style={estilos.fecha}>
                    {d.estado === "ENTREGADO" && d.fecha_entrega
                      ? `Entregado ${tiempoRelativo(d.fecha_entrega)}`
                      : `Ofrecido ${tiempoRelativo(d.fecha_ofrecido)}`}
                  </Text>
                  {d.estado === "OFRECIDO" && (
                    <Boton titulo="Iniciar ruta" color={COLORES.azul} tamaño="pequeno"
                      onPress={() => accion(d, "en-ruta")} />
                  )}
                  {d.estado === "EN_RUTA" && (
                    <Boton titulo="Confirmar entrega" color={COLORES.teal} tamaño="pequeno"
                      onPress={() => { setFoto(null); setModalEntrega(d); }} />
                  )}
                </Tarjeta>
              </Aparecer>
            ))
          )
        )}

        {segmento === "ofrecer" && (
          Object.keys(porAlbergue).length === 0 ? (
            <Vacio titulo="Nada por despachar" detalle="No hay carga en bodega esperando transporte" />
          ) : (
            <View>
              <Text style={estilos.ayuda}>1. Elige el albergue de destino</Text>
              {Object.entries(porAlbergue).map(([id, alb]) => (
                <TouchableOpacity key={id} onPress={() => { setAlbergueSel(Number(id)); setSeleccion({}); }}>
                  <Tarjeta style={albergueSel === Number(id) ? estilos.activa : null}>
                    <Text style={estilos.nombre}>{alb.nombre}</Text>
                    <Text style={estilos.detalle}>{alb.comuna} · {alb.cargas.length} cargas en bodega</Text>
                  </Tarjeta>
                </TouchableOpacity>
              ))}

              {albergueSel && (
                <View>
                  <Text style={estilos.ayuda}>2. Marca la carga que llevaras</Text>
                  {porAlbergue[albergueSel].cargas.map((c) => (
                    <TouchableOpacity key={c.id_asignacion}
                      onPress={() => setSeleccion({ ...seleccion, [c.id_asignacion]: !seleccion[c.id_asignacion] })}>
                      <Tarjeta style={seleccion[c.id_asignacion] ? estilos.activa : null}>
                        <View style={estilos.filaEntre}>
                          <Text style={estilos.detalle}>
                            {c.cantidad_asignada} {c.unidad_medida} de {c.item}
                          </Text>
                          {seleccion[c.id_asignacion] && <IconoCheck color={COLORES.teal} size={18} />}
                        </View>
                      </Tarjeta>
                    </TouchableOpacity>
                  ))}
                  <Text style={estilos.ayuda}>3. Tu vehiculo</Text>
                  <Campo etiqueta="Vehiculo" value={vehiculo} onChangeText={setVehiculo} placeholder="Camioneta 3/4, patente XX-YY" />
                  <Boton titulo={enviando ? "Creando..." : "Ofrecer este viaje"}
                    color={COLORES.navy} onPress={crearDespacho} deshabilitado={enviando} />
                </View>
              )}
            </View>
          )
        )}
      </ScrollView>

      <ModalDeslizante visible={!!modalEntrega} onCerrar={() => setModalEntrega(null)} titulo="Confirmar entrega">
        <Text style={estilos.ayuda}>
          Toma una foto de la ayuda entregada en el albergue. Con esto el deficit
          se marca como cubierto de verdad, no solo asignado.
        </Text>
        <Boton titulo="Foto de la entrega" variante="fantasma" color={COLORES.navy} onPress={tomarFoto} />
        {foto && <Image source={{ uri: foto }} style={estilos.previa} />}
        <Mensaje texto={error} tipo="error" />
        <Boton titulo={enviando ? "Confirmando..." : "Confirmar entrega"}
          color={COLORES.teal} onPress={() => accion(modalEntrega, "entregar")} deshabilitado={enviando} />
      </ModalDeslizante>
    </View>
  );
}

const estilos = StyleSheet.create({
  filaEntre: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nombre: { ...TIPO.subtitulo, color: COLORES.texto, marginLeft: ESP.s, flex: 1 },
  detalle: { ...TIPO.secundario, color: COLORES.textoSecundario, marginTop: 2, flex: 1, marginRight: ESP.s },
  fecha: { ...TIPO.micro, color: COLORES.textoTerciario, marginTop: 4, marginBottom: ESP.s },
  ayuda: { ...TIPO.subtitulo, color: COLORES.textoSecundario, marginTop: ESP.m, marginBottom: ESP.s },
  activa: { borderColor: COLORES.navy, borderWidth: 2 },
  previa: { width: "100%", height: 160, borderRadius: RADIO.m, marginVertical: ESP.m },
});
