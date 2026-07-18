
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from "react-native";
import { api } from "../api";
import { COLORES, ESP, TIPO, SOMBRA, RADIO } from "../tema";
import {
  Tarjeta, Cargando, Vacio, Encabezado, Aparecer,
  Etiqueta, BarraProgreso, ContadorAnimado, SelectorSegmento,
  ModalDeslizante, TimelineItem, MetricaGrande,
} from "../componentes";
import { IconoCorazon, IconoStats, IconoMapa, IconoCaja } from "../iconos";

const ESTADO_COLOR = {
  RECIBIDA: COLORES.azul,
  EN_BODEGA: COLORES.naranja,
  DISTRIBUIDA: COLORES.teal,
};
const ESTADO_LABEL = {
  RECIBIDA: "Recibida",
  EN_BODEGA: "En bodega",
  DISTRIBUIDA: "Distribuida",
};

export default function MisDonaciones() {
  const [datos, setDatos] = useState(null);
  const [refrescando, setRefrescando] = useState(false);
  const [segmento, setSegmento] = useState("todo");
  const [detalle, setDetalle] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const r = await api("/donaciones/mias");
      setDatos(r);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const refrescar = async () => {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  };

  if (!datos) return <Cargando />;

  const { donaciones, destinos, estadisticas } = datos;
  const stats = estadisticas || {};

  // Agrupar donaciones por id_donacion
  const agrupadas = [];
  const vistas = new Set();
  donaciones.forEach((d) => {
    if (vistas.has(d.id_donacion)) return;
    vistas.add(d.id_donacion);
    const items = donaciones.filter(x => x.id_donacion === d.id_donacion);
    const destinosD = destinos.filter(x => x.id_donacion === d.id_donacion);
    agrupadas.push({ ...d, items, destinos: destinosD });
  });

  // Filtrar por segmento
  const filtradas = segmento === "todo" ? agrupadas
    : agrupadas.filter(d => d.estado === segmento.toUpperCase());

  return (
    <View style={{ flex: 1, backgroundColor: COLORES.fondo }}>
      <Encabezado titulo="Mis aportes" subtitulo={`${stats.total_donaciones || 0} donaciones realizadas`} />

      {/* KPIs personales */}
      <View style={estilos.kpis}>
        <MetricaGrande
          cifra={stats.total_unidades || 0}
          subtitulo="Unidades"
          color={COLORES.coral}
          icono={<IconoCorazon color={COLORES.coral} size={20} />}
        />
        <View style={{ width: ESP.s }} />
        <MetricaGrande
          cifra={stats.total_donaciones || 0}
          subtitulo="Donaciones"
          color={COLORES.navy}
          icono={<IconoCaja color={COLORES.navy} size={20} />}
        />
        <View style={{ width: ESP.s }} />
        <MetricaGrande
          cifra={stats.albergues_impactados || 0}
          subtitulo="Albergues"
          color={COLORES.teal}
          icono={<IconoMapa color={COLORES.teal} size={20} />}
        />
      </View>

      {/* Segmentos */}
      <View style={{ paddingHorizontal: ESP.l }}>
        <SelectorSegmento
          opciones={[
            { valor: "todo", etiqueta: "Todas" },
            { valor: "recibida", etiqueta: "Recibidas" },
            { valor: "en_bodega", etiqueta: "En bodega" },
          ]}
          seleccionado={segmento}
          onCambio={setSegmento}
        />
      </View>

      {filtradas.length === 0 ? (
        <Vacio titulo="Sin donaciones" detalle="Tus aportes aparecerán aquí" />
      ) : (
        <FlatList
          data={filtradas}
          keyExtractor={(d) => String(d.id_donacion)}
          contentContainerStyle={{ paddingHorizontal: ESP.l, paddingBottom: ESP.xxl }}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[COLORES.navy]} />}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: d, index }) => (
            <Aparecer retraso={index * 40}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => setDetalle(d)}>
                <Tarjeta>
                  <View style={estilos.donaFila}>
                    <View style={{ flex: 1 }}>
                      <Text style={estilos.donaFecha}>{d.fecha}</Text>
                      <Text style={estilos.donaCodigo}>RSE-DON-{d.id_donacion}</Text>
                    </View>
                    <Etiqueta texto={ESTADO_LABEL[d.estado] || d.estado} color={ESTADO_COLOR[d.estado] || COLORES.azul} />
                  </View>
                  <View style={estilos.donaItems}>
                    {d.items.slice(0, 3).map((it, i) => (
                      <Text key={i} style={estilos.donaItem}>
                        {it.donado}× {it.item}
                      </Text>
                    ))}
                    {d.items.length > 3 && (
                      <Text style={estilos.donaItemMas}>+{d.items.length - 3} más</Text>
                    )}
                  </View>
                </Tarjeta>
              </TouchableOpacity>
            </Aparecer>
          )}
        />
      )}

      {/* Modal de detalle con trazabilidad */}
      <ModalDeslizante
        visible={!!detalle}
        onCerrar={() => setDetalle(null)}
        titulo={detalle ? `Donación #${detalle.id_donacion}` : ""}
      >
        {detalle && (
          <View>
            <View style={estilos.detalleHeader}>
              <Text style={estilos.detalleFecha}>{detalle.fecha}</Text>
              <Text style={estilos.donaCodigo}>RSE-DON-{detalle.id_donacion}</Text>
            </View>

            <Text style={estilos.detalleSeccion}>Ruta de tu Donación</Text>
            <View style={estilos.timelineContainer}>
              <Aparecer retraso={100}>
                <TimelineItem 
                  titulo="Donación Recibida" 
                  subtitulo={`Aprobada el ${detalle.fecha}`}
                  color={COLORES.teal}
                  esUltimo={false}
                />
              </Aparecer>
              
              <Aparecer retraso={200}>
                <TimelineItem 
                  titulo="Clasificada en Bodega Central" 
                  subtitulo={detalle.estado === 'RECIBIDA' ? 'En espera...' : 'Lista para despacho'}
                  color={detalle.estado === 'RECIBIDA' ? COLORES.bordeSutil : COLORES.naranja}
                  esUltimo={detalle.destinos.length === 0}
                />
              </Aparecer>

              {detalle.destinos.map((dest, i) => (
                <Aparecer key={i} retraso={300 + (i * 100)}>
                  <TimelineItem
                    color={COLORES.teal}
                    titulo={`Entregada en ${dest.albergue}`}
                    subtitulo={`${dest.cantidad_asignada} unidades · ${dest.fecha_asignacion}`}
                    esUltimo={i === detalle.destinos.length - 1}
                  />
                </Aparecer>
              ))}
            </View>

            <Text style={[estilos.detalleSeccion, { marginTop: ESP.l }]}>Artículos donados</Text>
            {detalle.items.map((it, i) => {
              const pct = it.donado > 0 ? Math.round((it.asignado / it.donado) * 100) : 0;
              return (
                <Aparecer key={i} retraso={i * 40}>
                  <View style={estilos.detalleItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={estilos.detalleItemNombre}>{it.item}</Text>
                      <Text style={estilos.detalleItemCant}>
                        {it.donado} {it.unidad_medida}
                      </Text>
                    </View>
                    <View style={{ width: 60 }}>
                      <Text style={[estilos.detalleItemPct, { color: pct >= 100 ? COLORES.teal : COLORES.naranja }]}>
                        {pct}% asign.
                      </Text>
                    </View>
                  </View>
                </Aparecer>
              );
            })}
          </View>
        )}
      </ModalDeslizante>
    </View>
  );
}

const estilos = StyleSheet.create({
  kpis: { flexDirection: "row", paddingHorizontal: ESP.l, marginBottom: ESP.m },
  donaFila: { flexDirection: "row", alignItems: "center" },
  donaFecha: { ...TIPO.subtitulo, color: COLORES.texto },
  donaCodigo: { ...TIPO.micro, color: COLORES.textoTerciario, marginTop: 2 },
  donaItems: { marginTop: ESP.s },
  donaItem: { ...TIPO.secundario, color: COLORES.textoSecundario, marginVertical: 1 },
  donaItemMas: { ...TIPO.micro, color: COLORES.azul, fontWeight: "600", marginTop: 4 },
  detalleHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: ESP.l },
  detalleFecha: { ...TIPO.secundario, color: COLORES.textoSecundario },
  detalleSeccion: { ...TIPO.subtitulo, color: COLORES.texto, marginBottom: ESP.s },
  detalleItem: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORES.fondo, borderRadius: RADIO.m,
    padding: ESP.m, marginBottom: ESP.s,
  },
  detalleItemNombre: { ...TIPO.cuerpo, fontWeight: "600", color: COLORES.texto },
  detalleItemCant: { ...TIPO.micro, color: COLORES.textoSecundario, marginTop: 2 },
  detalleItemPct: { ...TIPO.micro, fontWeight: "800", textAlign: "right" },
  timelineContainer: {
    backgroundColor: COLORES.superficie,
    padding: ESP.l,
    borderRadius: RADIO.l,
    ...SOMBRA.suave,
    borderWidth: 1,
    borderColor: COLORES.bordeSutil,
    marginTop: ESP.s
  }
});
