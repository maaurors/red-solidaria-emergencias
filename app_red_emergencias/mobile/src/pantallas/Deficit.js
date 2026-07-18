
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl, Platform } from "react-native";
import { api } from "../api";
import { COLORES, ESP, TIPO, SOMBRA, RADIO, PRIORIDAD_COLOR } from "../tema";
import {
  Tarjeta, Etiqueta, BarraProgreso, Cargando, Vacio, Encabezado,
  ChipFiltro, BarraBusqueda, ContadorAnimado, Aparecer,
} from "../componentes";
import { IconoWarning, IconoCheck } from "../iconos";

const FILTROS_PRIORIDAD = [
  { valor: "TODAS", etiqueta: "Todas" },
  { valor: "ALTA", etiqueta: "Alta" },
  { valor: "MEDIA", etiqueta: "Media" },
  { valor: "BAJA", etiqueta: "Baja" },
];

export default function Deficit() {
  const [datos, setDatos] = useState(null);
  const [filtro, setFiltro] = useState("TODAS");
  const [busqueda, setBusqueda] = useState("");
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setError("");
      const params = new URLSearchParams();
      if (filtro !== "TODAS") params.set("prioridad", filtro);
      if (busqueda.trim()) params.set("q", busqueda.trim());
      const r = await api(`/deficit?${params.toString()}`);
      setDatos(r);
    } catch (e) {
      setError(e.message);
    }
  }, [filtro, busqueda]);

  useEffect(() => { cargar(); }, [cargar]);

  const refrescar = async () => {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  };

  const filas = datos?.filas || [];
  const resumen = datos?.resumen || {};

  // Actualizar contadores en los chips de filtro
  const filtrosConContador = FILTROS_PRIORIDAD.map((f) => ({
    ...f,
    contador: f.valor === "TODAS" ? resumen.total
      : f.valor === "ALTA" ? resumen.urgentes
      : f.valor === "MEDIA" ? resumen.moderadas
      : resumen.bajas,
  }));

  const renderItem = useCallback(({ item, index }) => {
    const avance = item.cantidad_solicitada
      ? Math.round((item.recibido / item.cantidad_solicitada) * 100)
      : 0;

    return (
      <Aparecer retraso={index * 30}>
        <Tarjeta style={estilos.fila}>
          {/* Barra lateral de prioridad */}
          <View style={[estilos.barraLateral, { backgroundColor: PRIORIDAD_COLOR[item.prioridad] }]} />

          <View style={{ flex: 1 }}>
            {/* Fila superior */}
            <View style={estilos.filaTop}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={estilos.itemNombre}>{item.item}</Text>
                <Text style={estilos.albergueNombre}>{item.albergue} — {item.comuna}</Text>
              </View>
              <Etiqueta texto={item.prioridad} color={PRIORIDAD_COLOR[item.prioridad]} />
            </View>

            {/* Categoria */}
            <View style={estilos.categoriaBadge}>
              <Text style={estilos.categoriaTexto}>{item.categoria}</Text>
            </View>

            {/* Barra de progreso */}
            <View style={estilos.progresoFila}>
              <Text style={estilos.progresoTexto}>
                {item.recibido} / {item.cantidad_solicitada} {item.unidad_medida}
              </Text>
              <Text style={[estilos.progresoTexto, {
                color: avance >= 80 ? COLORES.teal : COLORES.coral,
                fontWeight: "700",
              }]}>
                {avance}%
              </Text>
            </View>
            <BarraProgreso
              porcentaje={avance}
              color={avance >= 80 ? COLORES.teal : PRIORIDAD_COLOR[item.prioridad]}
              alto={6}
            />

            {/* Deficit destacado */}
            <View style={estilos.deficitBadge}>
              <Text style={estilos.deficitTexto}>
                Faltan {item.deficit} {item.unidad_medida}
              </Text>
            </View>
          </View>
        </Tarjeta>
      </Aparecer>
    );
  }, []);

  return (
    <View style={estilos.contenedor}>
      <Encabezado
        titulo="Urgencias"
        subtitulo={datos ? `${resumen.total || 0} necesidades pendientes` : "Cargando..."}
      />

      {/* Resumen KPIs */}
      {datos && (
        <View style={estilos.kpiFila}>
          {[
            { label: "Total", valor: resumen.total, color: COLORES.navy },
            { label: "Urgentes", valor: resumen.urgentes, color: COLORES.coral },
            { label: "Moderadas", valor: resumen.moderadas, color: COLORES.naranja },
            { label: "Bajas", valor: resumen.bajas, color: COLORES.teal },
          ].map((k) => (
            <View key={k.label} style={estilos.kpiItem}>
              <ContadorAnimado valor={k.valor || 0} style={[TIPO.cifraPequena, { color: k.color }]} />
              <Text style={estilos.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>
      )}

      <BarraBusqueda valor={busqueda} onCambio={setBusqueda} placeholder="Buscar item o albergue..." />

      <ChipFiltro opciones={filtrosConContador} seleccionado={filtro} onCambio={setFiltro} />

      {datos === null && !error ? (
        <Cargando />
      ) : filas.length === 0 ? (
        <Vacio
          titulo="Sin necesidades pendientes"
          detalle={filtro !== "TODAS" || busqueda ? "Intenta con otro filtro" : "¡Todo cubierto!"}
          icono={<IconoCheck color={COLORES.teal} size={28} />}
        />
      ) : (
        <FlatList
          data={filas}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: ESP.l, paddingTop: ESP.xs, paddingBottom: ESP.xxl }}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[COLORES.navy]} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.fondo },
  kpiFila: {
    flexDirection: "row",
    marginHorizontal: ESP.l,
    marginBottom: ESP.m,
    borderRadius: RADIO.l,
    backgroundColor: COLORES.superficie,
    padding: ESP.m,
    ...SOMBRA.suave,
    borderWidth: 1,
    borderColor: COLORES.bordeSutil,
  },
  kpiItem: { flex: 1, alignItems: "center" },
  kpiLabel: { ...TIPO.micro, color: COLORES.textoSecundario, marginTop: 2 },
  fila: {
    flexDirection: "row",
    paddingLeft: 0,
    overflow: "hidden",
  },
  barraLateral: {
    width: 5,
    borderTopLeftRadius: RADIO.l,
    borderBottomLeftRadius: RADIO.l,
    marginRight: ESP.m,
    alignSelf: "stretch",
  },
  filaTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  itemNombre: { ...TIPO.subtitulo, color: COLORES.texto },
  albergueNombre: { ...TIPO.secundario, color: COLORES.textoSecundario, marginTop: 1 },
  categoriaBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORES.fondo,
    borderRadius: RADIO.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: ESP.s,
  },
  categoriaTexto: { ...TIPO.micro, color: COLORES.textoSecundario },
  progresoFila: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: ESP.m,
  },
  progresoTexto: { ...TIPO.micro, color: COLORES.textoSecundario },
  deficitBadge: {
    alignSelf: "flex-start",
    marginTop: ESP.s,
    backgroundColor: COLORES.warningFondo,
    borderRadius: RADIO.s,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  deficitTexto: { ...TIPO.micro, color: COLORES.warning, fontWeight: "700" },
});
