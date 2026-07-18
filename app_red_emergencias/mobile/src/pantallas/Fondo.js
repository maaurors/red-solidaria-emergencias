import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  RefreshControl, Image, Share,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { api, tiempoRelativo } from "../api";
import { COLORES, ESP, TIPO, RADIO, SOMBRA } from "../tema";
import {
  Tarjeta, Boton, Mensaje, Cargando, Encabezado, Vacio, Aparecer,
  BarraProgreso, ModalDeslizante, Campo,
} from "../componentes";
import { IconoCheck, IconoWarning, IconoCorazon, IconoCaja } from "../iconos";

const pesos = (n) => "$" + Number(n || 0).toLocaleString("es-CL");

export default function Fondo({ sesion }) {
  const esCoordinador = sesion?.rol === "COORDINADOR";
  const [campanas, setCampanas] = useState(null);
  const [cadena, setCadena] = useState(null);
  const [seleccionada, setSeleccionada] = useState(null);
  const [movimientos, setMovimientos] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [refrescando, setRefrescando] = useState(false);

  const [modalAporte, setModalAporte] = useState(false);
  const [modalEgreso, setModalEgreso] = useState(false);
  const [fotoModal, setFotoModal] = useState(null);
  const [monto, setMonto] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [foto, setFoto] = useState(null);
  const [cantidades, setCantidades] = useState({});
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setError("");
      const [c, v, i] = await Promise.all([
        api("/fondo/campanas", { sinCache: true }),
        api("/fondo/verificar", { sinCache: true }),
        api("/items"),
      ]);
      setCampanas(c);
      setCadena(v);
      setItems(i);
    } catch (e) {
      setError(e.message);
    } finally {
      setRefrescando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function abrirDetalle(campana) {
    setSeleccionada(campana);
    setMovimientos(null);
    try {
      setMovimientos(await api(`/fondo/campanas/${campana.id_campana}`, { sinCache: true }));
    } catch (e) {
      setError(e.message);
    }
  }

  async function tomarFoto(desdeCamara) {
    const opciones = { quality: 0.25, base64: true, allowsEditing: true };
    const r = desdeCamara
      ? await ImagePicker.launchCameraAsync(opciones)
      : await ImagePicker.launchImageLibraryAsync(opciones);
    if (!r.canceled && r.assets?.[0]?.base64) {
      setFoto("data:image/jpeg;base64," + r.assets[0].base64);
    }
  }

  function limpiarFormulario() {
    setMonto(""); setProveedor(""); setDescripcion(""); setFoto(null); setCantidades({});
  }

  async function enviarAporte() {
    setError(""); setMensaje("");
    if (!Number(monto)) { setError("Ingresa el monto transferido"); return; }
    setEnviando(true);
    try {
      const r = await api("/fondo/aportes", {
        method: "POST",
        body: JSON.stringify({ id_campana: seleccionada.id_campana, monto: Number(monto), foto }),
      });
      setModalAporte(false);
      limpiarFormulario();
      setMensaje("Aporte registrado en el libro publico");
      Share.share({
        message: `Aporte ${pesos(monto)} a la campana "${seleccionada.nombre}" en Red Solidaria de Emergencias. Cada peso es trazable con boletas publicas. Sumate.`,
      }).catch(() => {});
      cargar();
      abrirDetalle(seleccionada);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  async function enviarEgreso() {
    setError(""); setMensaje("");
    if (!Number(monto) || !proveedor || !foto) {
      setError("Monto, proveedor y foto de la boleta son obligatorios");
      return;
    }
    setEnviando(true);
    try {
      const seleccion = Object.entries(cantidades)
        .filter(([, c]) => Number(c) > 0)
        .map(([id_item, cantidad]) => ({ id_item: Number(id_item), cantidad: Number(cantidad) }));
      const r = await api("/fondo/egresos", {
        method: "POST",
        body: JSON.stringify({
          id_campana: seleccionada.id_campana, monto: Number(monto),
          proveedor, descripcion, foto, items: seleccion,
        }),
      });
      setModalEgreso(false);
      limpiarFormulario();
      setMensaje(r.mensaje);
      cargar();
      abrirDetalle(seleccionada);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  async function verFoto(mov) {
    try {
      const r = await api(`/fondo/movimientos/${mov.id_movimiento}/foto`);
      setFotoModal({ ...r, tipo: mov.tipo });
    } catch (e) {
      setError(e.message);
    }
  }

  if (campanas === null && !error) return <Cargando />;

  return (
    <View style={{ flex: 1 }}>
      <Encabezado
        titulo="Fondo Transparente"
        subtitulo="Cada peso trazable, con boletas publicas"
        extra={cadena && (
          <View style={[estilos.sello, { borderColor: cadena.integra ? COLORES.teal : COLORES.error }]}>
            {cadena.integra
              ? <IconoCheck color={COLORES.teal} size={14} />
              : <IconoWarning color={COLORES.error} size={14} />}
            <Text style={[estilos.selloTexto, { color: cadena.integra ? COLORES.teal : COLORES.error }]}>
              {cadena.integra ? "Libro integro" : "Alterado"}
            </Text>
          </View>
        )}
      />

      <ScrollView
        contentContainerStyle={{ padding: ESP.l, paddingTop: ESP.xs, paddingBottom: ESP.xxl * 2 }}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(); }} />}
        showsVerticalScrollIndicator={false}
      >
        <Mensaje texto={error} tipo="error" />
        <Mensaje texto={mensaje} />

        {(campanas || []).length === 0 && (
          <Vacio titulo="Sin campanas activas" detalle="Las campanas monetarias apareceran aqui" />
        )}

        {(campanas || []).map((c, i) => (
          <Aparecer key={c.id_campana} retraso={i * 50}>
            <TouchableOpacity activeOpacity={0.85} onPress={() => abrirDetalle(c)}>
              <Tarjeta style={seleccionada?.id_campana === c.id_campana ? estilos.activa : null}>
                <View style={estilos.filaEntre}>
                  <Text style={estilos.nombre}>{c.nombre}</Text>
                  <Text style={estilos.porcentaje}>{c.porcentaje}%</Text>
                </View>
                <Text style={estilos.detalle}>{c.emergencia}</Text>
                <BarraProgreso porcentaje={c.porcentaje} color={c.porcentaje >= 100 ? COLORES.teal : COLORES.coral} />
                <View style={[estilos.filaEntre, { marginTop: ESP.s }]}>
                  <Text style={estilos.cifra}>{pesos(c.recaudado)} <Text style={estilos.cifraSub}>de {pesos(c.meta_monto)}</Text></Text>
                  <Text style={estilos.cifraSub}>Saldo {pesos(c.saldo)}</Text>
                </View>
              </Tarjeta>
            </TouchableOpacity>
          </Aparecer>
        ))}

        {seleccionada && (
          <View style={{ marginTop: ESP.s }}>
            <View style={estilos.filaEntre}>
              <Text style={estilos.seccion}>Libro mayor</Text>
              <View style={{ flexDirection: "row", gap: ESP.s }}>
                <Boton titulo="Aportar" color={COLORES.coral} tamaño="pequeno"
                  onPress={() => { limpiarFormulario(); setModalAporte(true); }} />
                {esCoordinador && (
                  <Boton titulo="Registrar gasto" color={COLORES.navy} tamaño="pequeno"
                    onPress={() => { limpiarFormulario(); setModalEgreso(true); }} />
                )}
              </View>
            </View>

            {movimientos === null && <Cargando />}
            {movimientos?.length === 0 && (
              <Vacio titulo="Sin movimientos" detalle="Se el primero en aportar a esta campana" />
            )}
            {(movimientos || []).map((m) => (
              <Tarjeta key={m.id_movimiento} style={{ paddingVertical: ESP.m }}>
                <View style={estilos.filaEntre}>
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                    {m.tipo === "APORTE"
                      ? <IconoCorazon color={COLORES.teal} size={16} />
                      : <IconoCaja color={COLORES.coral} size={16} />}
                    <Text style={[estilos.movMonto, { color: m.tipo === "APORTE" ? COLORES.teal : COLORES.coral, marginLeft: 6 }]}>
                      {m.tipo === "APORTE" ? "+" : "-"}{pesos(m.monto)}
                    </Text>
                  </View>
                  <Text style={estilos.movFecha}>{tiempoRelativo(m.fecha)}</Text>
                </View>
                <Text style={estilos.detalle}>
                  {m.tipo === "APORTE" ? `Aporte de ${m.usuario}` : `${m.proveedor} — ${m.descripcion || "compra"}`}
                  {m.id_donacion ? " · items ingresados a bodega" : ""}
                </Text>
                <View style={[estilos.filaEntre, { marginTop: 6 }]}>
                  <Text style={estilos.hash} numberOfLines={1}>sha256 {m.hash_actual.slice(0, 16)}...</Text>
                  {m.tiene_foto ? (
                    <TouchableOpacity onPress={() => verFoto(m)}>
                      <Text style={estilos.verBoleta}>{m.tipo === "APORTE" ? "Ver comprobante" : "Ver boleta"}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </Tarjeta>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Aporte */}
      <ModalDeslizante visible={modalAporte} onCerrar={() => setModalAporte(false)} titulo="Registrar aporte">
        <Text style={estilos.ayuda}>
          Transfiere a la cuenta oficial de la campana y registra aqui el monto con tu comprobante.
        </Text>
        <Campo etiqueta="Monto transferido (CLP)" value={monto} keyboardType="number-pad"
          onChangeText={(t) => setMonto(t.replace(/[^0-9]/g, ""))} placeholder="10000" />
        <View style={{ flexDirection: "row", gap: ESP.s, marginBottom: ESP.m }}>
          <Boton titulo="Foto del comprobante" variante="fantasma" color={COLORES.navy} onPress={() => tomarFoto(true)} />
          <Boton titulo="Galeria" variante="fantasma" color={COLORES.navy} onPress={() => tomarFoto(false)} />
        </View>
        {foto && <Image source={{ uri: foto }} style={estilos.previa} />}
        <Mensaje texto={error} tipo="error" />
        <Boton titulo={enviando ? "Registrando..." : "Registrar en el libro publico"}
          color={COLORES.coral} onPress={enviarAporte} deshabilitado={enviando} />
      </ModalDeslizante>

      {/* Egreso */}
      <ModalDeslizante visible={modalEgreso} onCerrar={() => setModalEgreso(false)} titulo="Registrar gasto con boleta">
        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
          <Campo etiqueta="Monto (CLP)" value={monto} keyboardType="number-pad"
            onChangeText={(t) => setMonto(t.replace(/[^0-9]/g, ""))} placeholder="40000" />
          <Campo etiqueta="Proveedor" value={proveedor} onChangeText={setProveedor} placeholder="Supermercado Lider" />
          <Campo etiqueta="Descripcion" value={descripcion} onChangeText={setDescripcion} placeholder="20 frazadas polar" />
          <View style={{ flexDirection: "row", gap: ESP.s, marginBottom: ESP.m }}>
            <Boton titulo="Foto de la boleta" variante="fantasma" color={COLORES.navy} onPress={() => tomarFoto(true)} />
            <Boton titulo="Galeria" variante="fantasma" color={COLORES.navy} onPress={() => tomarFoto(false)} />
          </View>
          {foto && <Image source={{ uri: foto }} style={estilos.previa} />}
          <Text style={estilos.ayuda}>Items comprados (entran directo a bodega):</Text>
          {items.map((it) => (
            <View key={it.id_item} style={estilos.itemFila}>
              <Text style={estilos.detalle}>{it.nombre}</Text>
              <TextInput
                style={estilos.itemCantidad}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={COLORES.textoTerciario}
                value={cantidades[it.id_item] || ""}
                onChangeText={(t) => setCantidades({ ...cantidades, [it.id_item]: t.replace(/[^0-9]/g, "") })}
              />
            </View>
          ))}
          <Mensaje texto={error} tipo="error" />
          <Boton titulo={enviando ? "Registrando..." : "Registrar gasto"}
            color={COLORES.navy} onPress={enviarEgreso} deshabilitado={enviando} />
        </ScrollView>
      </ModalDeslizante>

      {/* Visor de boleta */}
      <ModalDeslizante visible={!!fotoModal} onCerrar={() => setFotoModal(null)}
        titulo={fotoModal?.tipo === "APORTE" ? "Comprobante" : "Boleta"}>
        {fotoModal && (
          <View>
            <Image source={{ uri: fotoModal.foto }} style={estilos.fotoGrande} resizeMode="contain" />
            <Text style={estilos.hash}>Huella sha256: {fotoModal.hash_foto}</Text>
            <Text style={estilos.ayuda}>
              Esta huella esta encadenada al libro mayor: si la imagen se altera, la verificacion lo detecta.
            </Text>
          </View>
        )}
      </ModalDeslizante>
    </View>
  );
}

const estilos = StyleSheet.create({
  sello: {
    flexDirection: "row", alignItems: "center", borderWidth: 1.5,
    borderRadius: RADIO.pill, paddingHorizontal: 10, paddingVertical: 4, gap: 4,
  },
  selloTexto: { ...TIPO.micro, fontWeight: "800" },
  filaEntre: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nombre: { ...TIPO.subtitulo, color: COLORES.texto, flex: 1, marginRight: ESP.s },
  porcentaje: { fontSize: 16, fontWeight: "800", color: COLORES.navy },
  detalle: { ...TIPO.secundario, color: COLORES.textoSecundario, marginTop: 2, flex: 1 },
  cifra: { ...TIPO.cuerpo, fontWeight: "800", color: COLORES.texto },
  cifraSub: { ...TIPO.secundario, fontWeight: "500", color: COLORES.textoSecundario },
  activa: { borderColor: COLORES.navy, borderWidth: 2 },
  seccion: { ...TIPO.subtitulo, color: COLORES.texto, marginVertical: ESP.m },
  movMonto: { fontSize: 16, fontWeight: "800" },
  movFecha: { ...TIPO.micro, color: COLORES.textoTerciario },
  hash: { ...TIPO.micro, color: COLORES.textoTerciario, fontFamily: "monospace", flex: 1, marginRight: ESP.s },
  verBoleta: { ...TIPO.secundario, color: COLORES.azul, fontWeight: "700" },
  ayuda: { ...TIPO.secundario, color: COLORES.textoSecundario, marginBottom: ESP.m },
  previa: { width: "100%", height: 140, borderRadius: RADIO.m, marginBottom: ESP.m },
  fotoGrande: { width: "100%", height: 320, borderRadius: RADIO.m, marginBottom: ESP.s },
  itemFila: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 6,
  },
  itemCantidad: {
    borderWidth: 1, borderColor: COLORES.borde, borderRadius: RADIO.s,
    width: 70, padding: 7, textAlign: "center", backgroundColor: COLORES.superficie,
    color: COLORES.texto,
  },
});
