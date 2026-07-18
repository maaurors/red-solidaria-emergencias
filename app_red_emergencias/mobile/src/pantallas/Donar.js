import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, ScrollView,
  TouchableOpacity
} from "react-native";
import { api } from "../api";
import { COLORES, ESP, TIPO, SOMBRA, RADIO } from "../tema";
import {
  Tarjeta, Mensaje, Cargando, Encabezado,
  ChipFiltro, Aparecer, ContadorAnimado, Toast,
} from "../componentes";
import { IconoMas, IconoMenos, IconoCorazon, IconoCheck, IconoUbicacion } from "../iconos";
import { LinearGradient } from "expo-linear-gradient";
import GraficoPrioridad from "../GraficoPrioridad";

const COLORES_CAT = {
  "Alimentos": COLORES.naranja,
  "Vestuario": COLORES.azul,
  "Higiene": COLORES.teal,
  "Abrigo": COLORES.coral,
  "Medicamentos": COLORES.error,
};

export default function Donar() {
  const [paso, setPaso] = useState(1);
  const [albergues, setAlbergues] = useState([]);
  const [mapaAlbergues, setMapaAlbergues] = useState([]);
  const [albergueSeleccionado, setAlbergueSeleccionado] = useState(null);

  const [items, setItems] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [catFiltro, setCatFiltro] = useState("TODAS");
  const [cantidades, setCantidades] = useState({});
  
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [dataItems, dataAlbergues, dataMapa] = await Promise.all([
          api("/items"),
          api("/albergues"),
          api("/albergues/mapa"),
        ]);
        setItems(dataItems);
        setAlbergues(dataAlbergues);
        setMapaAlbergues(dataMapa);
        const cats = [...new Set(dataItems.map(i => i.categoria))];
        setCategorias(cats);
      } catch (e) { setError(e.message); }
      setCargando(false);
    })();
  }, []);

  const ajustar = useCallback((id, delta) => {
    setCantidades(prev => {
      const actual = prev[id] || 0;
      const nuevo = Math.max(0, actual + delta);
      if (nuevo === 0) {
        const copia = { ...prev };
        delete copia[id];
        return copia;
      }
      return { ...prev, [id]: nuevo };
    });
  }, []);

  const seleccionados = Object.entries(cantidades).filter(([_, c]) => c > 0);
  const totalUnidades = seleccionados.reduce((s, [_, c]) => s + c, 0);

  const enviar = async () => {
    if (seleccionados.length === 0 || !albergueSeleccionado) return;
    setEnviando(true);
    setError("");
    try {
      const r = await api("/donaciones", {
        method: "POST",
        body: JSON.stringify({
          items: seleccionados.map(([id, cantidad]) => ({ id_item: Number(id), cantidad })),
          id_albergue_destino: albergueSeleccionado.id_albergue
        }),
      });
      setExito(r);
      setCantidades({});
      setAlbergueSeleccionado(null);
      setPaso(1);
      setToast({ mensaje: "¡Donación registrada con éxito!", tipo: "exito" });
    } catch (e) {
      setError(e.message);
    }
    setEnviando(false);
  };

  if (cargando) return <Cargando />;

  // Vista de exito
  if (exito) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORES.fondo }}>
        <LinearGradient colors={[COLORES.navy, COLORES.fondo]} style={StyleSheet.absoluteFillObject} />
        <ScrollView contentContainerStyle={estilos.exitoContainer}>
          <Aparecer>
            <View style={estilos.exitoCirculo}>
              <IconoCheck color={COLORES.blanco} size={48} />
            </View>
          </Aparecer>
          <Aparecer retraso={150}>
            <Text style={estilos.exitoTitulo}>¡Eres increíble!</Text>
            <Text style={estilos.exitoDetalle}>Tu compromiso #{exito.id_donacion} está registrado</Text>
          </Aparecer>
          <Aparecer retraso={300} estilo={{ width: "100%" }}>
            <Tarjeta variante="hero" style={estilos.exitoQR}>
              <Text style={estilos.exitoQRLabel}>Código de Entrega</Text>
              <Text style={estilos.exitoQRCodigo}>{exito.codigo_qr}</Text>
              <Text style={estilos.exitoQRNota}>Muestra este código al entregar tu ayuda en el centro de acopio.</Text>
            </Tarjeta>
          </Aparecer>
          <Aparecer retraso={450} estilo={{ width: "100%", marginTop: ESP.l }}>
            <TouchableOpacity onPress={() => setExito(null)}>
              <LinearGradient 
                colors={[COLORES.coral, COLORES.coralClaro]} 
                style={estilos.botonGradiente}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Text style={estilos.botonGradienteTexto}>Donar Más</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Aparecer>
        </ScrollView>
      </View>
    );
  }

  // Paso 1: Seleccionar Albergue
  if (paso === 1) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORES.fondo }}>
        <Toast visible={!!toast} mensaje={toast?.mensaje} tipo={toast?.tipo} onOcultar={() => setToast(null)} />
        <Encabezado titulo="Destino de tu ayuda" subtitulo="Selecciona el centro de acopio al que irás" />
        <Mensaje texto={error} tipo="error" />
        <FlatList
          data={albergues}
          keyExtractor={(a) => String(a.id_albergue)}
          contentContainerStyle={{ paddingHorizontal: ESP.l, paddingBottom: ESP.xxl }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <GraficoPrioridad
              albergues={mapaAlbergues}
              onSeleccionar={(a) => {
                const destino = albergues.find((x) => x.id_albergue === a.id_albergue);
                if (destino) { setAlbergueSeleccionado(destino); setPaso(2); }
              }}
            />
          }
          renderItem={({ item, index }) => (
            <Aparecer retraso={index * 50}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { setAlbergueSeleccionado(item); setPaso(2); }}
              >
                <Tarjeta style={estilos.albergueTarjeta}>
                  <View style={[estilos.iconoChico, { backgroundColor: COLORES.teal + "15" }]}>
                    <IconoUbicacion color={COLORES.teal} size={24} />
                  </View>
                  <View style={{ flex: 1, marginLeft: ESP.m }}>
                    <Text style={estilos.albergueNombre}>{item.nombre}</Text>
                    <Text style={estilos.albergueDir}>{item.direccion}</Text>
                    <View style={estilos.badgeUrgencia}>
                      <Text style={estilos.badgeUrgenciaTexto}>{item.emergencia}</Text>
                    </View>
                  </View>
                </Tarjeta>
              </TouchableOpacity>
            </Aparecer>
          )}
        />
      </View>
    );
  }

  // Paso 2: Seleccionar Items
  const filtrosCat = [
    { valor: "TODAS", etiqueta: "Todas", contador: items.length },
    ...categorias.map(c => ({
      valor: c,
      etiqueta: c,
      contador: items.filter(i => i.categoria === c).length,
    })),
  ];

  const itemsFiltrados = catFiltro === "TODAS"
    ? items
    : items.filter(i => i.categoria === catFiltro);

  return (
    <View style={{ flex: 1, backgroundColor: COLORES.fondo }}>
      <Encabezado 
        titulo="¿Qué vas a donar?" 
        subtitulo={`Destino: ${albergueSeleccionado?.nombre}`} 
        botonVolver={() => setPaso(1)}
      />

      <ChipFiltro opciones={filtrosCat} seleccionado={catFiltro} onCambio={setCatFiltro} />

      <Mensaje texto={error} tipo="error" />

      <FlatList
        data={itemsFiltrados}
        keyExtractor={(i) => String(i.id_item)}
        contentContainerStyle={{ paddingHorizontal: ESP.l, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const cantidad = cantidades[item.id_item] || 0;
          const catColor = COLORES_CAT[item.categoria] || COLORES.azul;
          return (
            <Aparecer retraso={index * 20}>
              <Tarjeta style={[estilos.itemFila, cantidad > 0 && estilos.itemFilaActiva]}>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.itemNombre}>{item.nombre}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                    <View style={[estilos.catDot, { backgroundColor: catColor }]} />
                    <Text style={estilos.itemCat}>
                      {item.categoria} · {item.unidad_medida}
                    </Text>
                  </View>
                </View>

                <View style={estilos.contador}>
                  <TouchableOpacity
                    style={[estilos.contadorBtn, cantidad === 0 && estilos.contadorBtnDisabled]}
                    onPress={() => ajustar(item.id_item, -1)}
                    disabled={cantidad === 0}
                  >
                    <IconoMenos color={cantidad > 0 ? COLORES.coral : COLORES.textoTerciario} size={16} />
                  </TouchableOpacity>
                  <Text style={[estilos.contadorNum, cantidad > 0 && { color: COLORES.navy, fontWeight: "800" }]}>
                    {cantidad}
                  </Text>
                  <TouchableOpacity
                    style={estilos.contadorBtn}
                    onPress={() => ajustar(item.id_item, 1)}
                  >
                    <IconoMas color={COLORES.navy} size={16} />
                  </TouchableOpacity>
                </View>
              </Tarjeta>
            </Aparecer>
          );
        }}
      />

      {seleccionados.length > 0 && (
        <Aparecer estilo={estilos.flotanteWrapper}>
          <View style={[estilos.flotante, SOMBRA.glow(COLORES.coral)]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={estilos.flotanteTitle}>
                {seleccionados.length} {seleccionados.length === 1 ? "ítem" : "ítems"}
              </Text>
              <Text style={estilos.flotanteSub}>
                <ContadorAnimado valor={totalUnidades} style={estilos.flotanteSub} /> unidades totales
              </Text>
            </View>
            <TouchableOpacity onPress={enviar} disabled={enviando}>
              <LinearGradient 
                colors={[COLORES.coral, COLORES.coralClaro]} 
                style={estilos.btnCheckout}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <IconoCorazon color={COLORES.blanco} size={20} />
                <Text style={estilos.btnCheckoutTexto}>
                  {enviando ? "Generando..." : "Confirmar"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Aparecer>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  albergueTarjeta: {
    flexDirection: "row",
    alignItems: "center",
    padding: ESP.l,
    marginBottom: ESP.m,
  },
  iconoChico: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  albergueNombre: { ...TIPO.subtitulo, color: COLORES.texto },
  albergueDir: { ...TIPO.secundario, color: COLORES.textoSecundario, marginTop: 4 },
  badgeUrgencia: {
    backgroundColor: COLORES.error + "20",
    alignSelf: "flex-start",
    paddingHorizontal: ESP.s,
    paddingVertical: 2,
    borderRadius: RADIO.s,
    marginTop: ESP.s,
  },
  badgeUrgenciaTexto: { ...TIPO.micro, color: COLORES.error, fontWeight: "700" },
  itemFila: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ESP.m,
  },
  itemFilaActiva: {
    borderColor: COLORES.navy + "30",
    backgroundColor: COLORES.navy + "06",
  },
  itemNombre: { ...TIPO.cuerpo, fontWeight: "600", color: COLORES.texto },
  catDot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 5 },
  itemCat: { ...TIPO.micro, color: COLORES.textoSecundario },
  contador: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORES.fondo,
    borderRadius: RADIO.m,
    borderWidth: 1,
    borderColor: COLORES.bordeSutil,
    overflow: "hidden",
  },
  contadorBtn: {
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  contadorBtnDisabled: { opacity: 0.4 },
  contadorNum: {
    width: 36,
    textAlign: "center",
    ...TIPO.cuerpo,
    fontWeight: "600",
    color: COLORES.textoTerciario,
  },
  flotanteWrapper: {
    position: "absolute",
    bottom: ESP.m,
    left: ESP.m,
    right: ESP.m,
  },
  flotante: {
    backgroundColor: COLORES.superficieElevada,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: ESP.l,
    paddingVertical: ESP.m,
    borderRadius: RADIO.xl,
    borderWidth: 1,
    borderColor: COLORES.coral + "50",
  },
  flotanteTitle: { ...TIPO.subtitulo, color: COLORES.texto, fontWeight: "700" },
  flotanteSub: { ...TIPO.secundario, color: COLORES.textoSecundario },
  btnCheckout: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: ESP.l,
    paddingVertical: ESP.m,
    borderRadius: RADIO.l,
  },
  btnCheckoutTexto: {
    ...TIPO.subtitulo,
    color: COLORES.blanco,
    marginLeft: ESP.s,
    fontWeight: "700",
  },
  botonGradiente: {
    paddingVertical: ESP.l,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIO.xl,
    paddingHorizontal: ESP.xxl
  },
  botonGradienteTexto: {
    ...TIPO.titulo,
    color: COLORES.blanco,
    fontSize: 18,
  },
  exitoContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: ESP.xl,
  },
  exitoCirculo: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORES.teal,
    alignItems: "center", justifyContent: "center",
    marginBottom: ESP.xl,
    ...SOMBRA.glow(COLORES.teal),
  },
  exitoTitulo: { ...TIPO.display, color: COLORES.texto, textAlign: "center", fontSize: 28 },
  exitoDetalle: { ...TIPO.subtitulo, color: COLORES.textoSecundario, textAlign: "center", marginTop: ESP.xs },
  exitoQR: { marginVertical: ESP.xl, alignItems: "center", paddingVertical: ESP.xxl, backgroundColor: COLORES.superficie, borderColor: COLORES.bordeSutil, borderWidth: 1 },
  exitoQRLabel: { ...TIPO.micro, color: COLORES.textoSecundario, textTransform: "uppercase", letterSpacing: 1 },
  exitoQRCodigo: { ...TIPO.cifra, color: COLORES.cyan, marginTop: ESP.m },
  exitoQRNota: { ...TIPO.secundario, color: COLORES.textoSecundario, marginTop: ESP.m, textAlign: "center", paddingHorizontal: ESP.l },
});
