
import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions, Share, Alert } from "react-native";
import MapView, { Marker, Circle as MapCircle } from "react-native-maps";
import * as Location from "expo-location";
import Svg, { Circle as SvgCircle, Path as SvgPath } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../api";
import { COLORES, ESP, TIPO, SOMBRA, RADIO, PRIORIDAD_COLOR } from "../tema";
import { Cargando, Mensaje, Etiqueta, BarraProgreso, Aparecer, ModalDeslizante, Campo, Boton } from "../componentes";
import { IconoNavegar, IconoCorazon, IconoWarning, IconoTendencia, IconoPildora, IconoCaja, IconoHospital, IconoPregunta, IconoCompartir, IconoGps } from "../iconos";

const SEMAFORO = { ROJO: "#D9304F", AMARILLO: "#E8A63C", VERDE: "#2E8B57" };
const SEMAFORO_LABEL = { ROJO: "Urgente", AMARILLO: "Moderado", VERDE: "Cubierto" };
const { height: ALTO_PANTALLA } = Dimensions.get("window");

const REGION_INICIAL = {
  latitude: -33.28,
  longitude: -71.10,
  latitudeDelta: 1.4,
  longitudeDelta: 1.6,
};

// Marcador custom con forma de gota e icono tematico
function MarcadorTematico({ semaforo, tipoRecurso, activo }) {
  const color = SEMAFORO[semaforo] || SEMAFORO.VERDE;
  
  const Icono = () => {
    switch(tipoRecurso) {
      case 'medico': return <IconoPildora color={COLORES.blanco} size={16} />;
      case 'viveres': return <IconoCaja color={COLORES.blanco} size={16} />;
      case 'hospital': return <IconoHospital color={COLORES.blanco} size={16} />;
      default: return <IconoPregunta color={COLORES.blanco} size={16} />;
    }
  };

  return (
    <View style={{ alignItems: "center" }}>
      {/* Banner de estado activo similar a la imagen */}
      {activo && (
        <View style={estilosMarcador.bannerActivo}>
          <Text style={estilosMarcador.bannerTexto}>Atendiendo solicitud</Text>
        </View>
      )}
      
      {/* Pin SVG Customizado */}
      <Svg width={40} height={50} viewBox="0 0 40 50">
        <SvgPath 
          d="M20 0C8.95 0 0 8.95 0 20c0 15 20 30 20 30s20-15 20-30C40 8.95 31.05 0 20 0z" 
          fill={color} 
        />
        <SvgCircle cx="20" cy="20" r="16" fill="rgba(0,0,0,0.2)" />
      </Svg>
      
      {/* Icono Interior */}
      <View style={{ position: 'absolute', top: 12 }}>
        <Icono />
      </View>
    </View>
  );
}

const estilosMarcador = StyleSheet.create({
  bannerActivo: {
    backgroundColor: COLORES.azul,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIO.xs,
    marginBottom: 4,
    ...SOMBRA.suave,
  },
  bannerTexto: {
    color: COLORES.blanco,
    ...TIPO.micro,
    fontWeight: "700",
  },
  sismoPin: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORES.error,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: COLORES.blanco,
    ...SOMBRA.suave,
  }
});

function MarcadorSismo({ mag }) {
  const pulso = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const bucle = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1.5, duration: 800, useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    bucle.start();
    return () => bucle.stop();
  }, [pulso]);

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{
        position: "absolute",
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: "rgba(255, 69, 58, 0.3)",
        transform: [{ scale: pulso }],
      }} />
      <View style={estilosSismo.pin}>
        <IconoTendencia color={COLORES.blanco} size={14} arriba={false} />
      </View>
    </View>
  );
}

const estilosSismo = StyleSheet.create({
  pin: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORES.error,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: COLORES.blanco,
    ...SOMBRA.suave,
  }
});

export default function Mapa({ navigation }) {
  const [albergues, setAlbergues] = useState(null);
  const [sismos, setSismos] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [sismoSeleccionado, setSismoSeleccionado] = useState(null);
  const [error, setError] = useState("");
  const mapRef = useRef(null);

  const [modalAcopio, setModalAcopio] = useState(false);
  const [nombreAcopio, setNombreAcopio] = useState("");
  const [comunaAcopio, setComunaAcopio] = useState("");
  const [capacidadAcopio, setCapacidadAcopio] = useState("50");
  const [creandoAcopio, setCreandoAcopio] = useState(false);

  const reportarAcopio = async () => {
    if (!nombreAcopio || !comunaAcopio || !capacidadAcopio) {
      Alert.alert("Error", "Completa nombre, comuna y capacidad.");
      return;
    }
    setCreandoAcopio(true);
    try {
      let loc = null;
      try {
        loc = await Location.getCurrentPositionAsync({});
      } catch (err) {}
      
      const body = {
        nombre: nombreAcopio,
        comuna: comunaAcopio,
        capacidad: parseInt(capacidadAcopio, 10),
        latitud: loc?.coords?.latitude || REGION_INICIAL.latitude,
        longitud: loc?.coords?.longitude || REGION_INICIAL.longitude,
      };
      
      await api("/albergues", { method: "POST", body: JSON.stringify(body) });
      Alert.alert("¡Éxito!", "Acopio reportado. Ahora eres el coordinador de este punto.");
      setModalAcopio(false);
      setNombreAcopio("");
      setComunaAcopio("");
      cargar(); 
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setCreandoAcopio(false);
    }
  };

  const cargar = useCallback(async () => {
    try {
      setError("");
      const datos = await api("/albergues/mapa");
      setAlbergues(datos);
      await AsyncStorage.setItem("@cache_albergues", JSON.stringify(datos));
    } catch (e) {
      try {
        const cache = await AsyncStorage.getItem("@cache_albergues");
        if (cache) {
          setAlbergues(JSON.parse(cache));
          setError("Modo Sin Conexión: Mostrando los últimos albergues seguros conocidos.");
          return;
        }
      } catch (cacheErr) {}
      setError(e.message);
    }
  }, []);

  const cargarSismos = useCallback(async () => {
    try {
      const res = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson");
      const data = await res.json();
      const sismosChile = data.features.filter(f => {
        const [lng, lat] = f.geometry.coordinates;
        // Filtro aproximado de la región de Chile
        return lat >= -56.0 && lat <= -17.0 && lng >= -76.0 && lng <= -66.0;
      });
      setSismos(sismosChile);
    } catch (e) {
      // Silencioso, no queremos interrumpir la app si falla el USGS
      console.log("Error USGS:", e);
    }
  }, []);

  useEffect(() => { 
    cargar(); 
    cargarSismos();
  }, [cargar, cargarSismos]);

  const seleccionar = useCallback((albergue) => {
    setSeleccionado(albergue);
    // Auto-zoom al albergue seleccionado
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: Number(albergue.latitud),
        longitude: Number(albergue.longitud),
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 500);
    }
  }, []);

  if (albergues === null && !error) return <Cargando />;

  // Contadores para la leyenda
  const contadores = {
    ROJO: (albergues || []).filter(a => a.semaforo === "ROJO").length,
    AMARILLO: (albergues || []).filter(a => a.semaforo === "AMARILLO").length,
    VERDE: (albergues || []).filter(a => a.semaforo === "VERDE").length,
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={REGION_INICIAL}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Puntos calientes anónimos de voluntarios (Heatmap simulación GCP) */}
        <MapCircle
          center={{ latitude: -33.25, longitude: -71.12 }}
          radius={2000}
          fillColor="rgba(48, 209, 88, 0.2)"
          strokeColor="transparent"
        />
        <MapCircle
          center={{ latitude: -33.30, longitude: -71.08 }}
          radius={1500}
          fillColor="rgba(255, 159, 10, 0.2)"
          strokeColor="transparent"
        />

        {sismos.map((s, idx) => {
          const [lng, lat] = s.geometry.coordinates;
          return (
            <Marker
              key={`sismo-${idx}`}
              coordinate={{ latitude: lat, longitude: lng }}
              onPress={() => setSismoSeleccionado(s)}
              zIndex={999}
            >
              <MarcadorSismo mag={s.properties.mag} />
            </Marker>
          );
        })}

        {(albergues || []).map((a, idx) => {
          // Asignar un icono dummy para demostración si no viene de la BD
          const tipos = ['medico', 'viveres', 'hospital', 'otros'];
          const tipoRecurso = tipos[idx % 4];
          const activo = a.semaforo === "ROJO"; // Simula "Atendiendo solicitud"
          return (
            <Marker
              key={a.id_albergue}
              coordinate={{ latitude: Number(a.latitud), longitude: Number(a.longitud) }}
              onPress={() => seleccionar(a)}
              zIndex={activo ? 99 : 1}
            >
              <MarcadorTematico semaforo={a.semaforo} tipoRecurso={tipoRecurso} activo={activo} />
            </Marker>
          );
        })}
      </MapView>
      
      {/* Controles Flotantes FAB */}
      <View style={estilos.controlesFlotantes}>
        {/* FAB Waze-style para Reportar */}
        <TouchableOpacity 
          style={[estilos.fab, { backgroundColor: COLORES.naranja, marginBottom: ESP.s }]} 
          activeOpacity={0.8} 
          onPress={() => navigation?.cambiarPestana("reportar_emergencia")}
        >
          <IconoWarning color={COLORES.blanco} size={24} />
        </TouchableOpacity>

        <TouchableOpacity style={estilos.fab} activeOpacity={0.8} onPress={async () => {
          try {
            await Share.share({
              message: "Estoy usando Red Solidaria de Emergencias para coordinar ayuda en Chile. Descargala y unete: https://red-emergencias.cl",
              title: "Red Solidaria de Emergencias"
            });
          } catch (e) {
            Alert.alert("Error", "No se pudo compartir.");
          }
        }}>
          <IconoCompartir color={COLORES.azul} size={20} />
          <Text style={estilos.fabTexto}>Compartir</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[estilos.fab, { marginTop: 12, paddingHorizontal: 12 }]} activeOpacity={0.8} onPress={async () => {
          try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
              Alert.alert("Permiso denegado", "Activa la ubicacion en Ajustes para usar esta funcion.");
              return;
            }
            let ubicacion = await Location.getLastKnownPositionAsync({});
            if (!ubicacion) {
              ubicacion = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            }
            if (ubicacion && mapRef.current) {
              mapRef.current.animateToRegion({
                latitude: ubicacion.coords.latitude,
                longitude: ubicacion.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }, 800);
            }
          } catch (e) {
            Alert.alert("Error GPS", "No se pudo obtener tu ubicacion. Verifica que el GPS este activo.");
          }
        }}>
          <IconoGps color={COLORES.azul} size={20} />
          <Text style={estilos.fabTexto}>Mi Ubicación</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[estilos.fab, { marginTop: 12, paddingHorizontal: 12, backgroundColor: COLORES.cyan }]} activeOpacity={0.8} onPress={() => setModalAcopio(true)}>
          <IconoCorazon color={COLORES.navy} size={20} />
          <Text style={[estilos.fabTexto, { color: COLORES.navy, fontWeight: "700" }]}>Añadir Acopio</Text>
        </TouchableOpacity>
      </View>

      {/* Leyenda premium con contadores */}
      <View style={estilos.leyenda}>
        <View style={estilos.leyendaFila}>
          <IconoWarning color={COLORES.error} size={14} />
          <Text style={[estilos.leyendaTexto, { marginLeft: 4 }]}>Radar Sismos USGS</Text>
          <View style={[estilos.leyendaContador, { backgroundColor: COLORES.errorFondo }]}>
            <Text style={[estilos.leyendaContadorTexto, { color: COLORES.error }]}>{sismos.length}</Text>
          </View>
        </View>
        
        <View style={{ height: 1, backgroundColor: COLORES.bordeSutil, marginVertical: 6 }} />

        {Object.entries(SEMAFORO).map(([nombre, color]) => (
          <View key={nombre} style={estilos.leyendaFila}>
            <View style={[estilos.punto, { backgroundColor: color }]} />
            <Text style={estilos.leyendaTexto}>
              {SEMAFORO_LABEL[nombre]}
            </Text>
            <View style={[estilos.leyendaContador, { backgroundColor: color + "20" }]}>
              <Text style={[estilos.leyendaContadorTexto, { color }]}>{contadores[nombre]}</Text>
            </View>
          </View>
        ))}
      </View>

      {error ? (
        <View style={{ position: "absolute", bottom: 20, left: 12, right: 12 }}>
          <Mensaje texto={error} tipo="error" />
        </View>
      ) : null}

      {/* Bottom Sheet para detalle */}
      <ModalDeslizante
        visible={!!seleccionado}
        onCerrar={() => setSeleccionado(null)}
        titulo={seleccionado?.nombre}
      >
        {seleccionado && (
          <View>
            {/* Header info */}
            <View style={estilos.sheetInfo}>
              <Text style={estilos.sheetComuna}>{seleccionado.comuna}</Text>
              <Etiqueta
                texto={SEMAFORO_LABEL[seleccionado.semaforo]}
                color={SEMAFORO[seleccionado.semaforo]}
              />
            </View>

            <Text style={estilos.sheetEmergencia}>
              Emergencia: {seleccionado.emergencia}
            </Text>

            {/* Barra de cobertura general */}
            {seleccionado.cobertura !== undefined && (
              <View style={estilos.coberturaCard}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={estilos.coberturaLabel}>Cobertura general</Text>
                  <Text style={[estilos.coberturaPct, {
                    color: seleccionado.cobertura >= 80 ? COLORES.teal : COLORES.coral,
                  }]}>
                    {seleccionado.cobertura}%
                  </Text>
                </View>
                <BarraProgreso
                  porcentaje={seleccionado.cobertura}
                  color={seleccionado.cobertura >= 80 ? COLORES.teal : COLORES.coral}
                  alto={8}
                />
              </View>
            )}

            {/* Necesidades faltantes */}
            {seleccionado.faltantes.length > 0 && (
              <View style={{ marginTop: ESP.l }}>
                <Text style={estilos.seccionTitulo}>
                  Necesidades pendientes ({seleccionado.faltantes.length})
                </Text>
                {seleccionado.faltantes.map((f, i) => {
                  const avance = f.cantidad_solicitada
                    ? Math.round((f.recibido / f.cantidad_solicitada) * 100)
                    : 0;
                  return (
                    <Aparecer key={i} retraso={i * 40}>
                      <View style={estilos.faltanteCard}>
                        <View style={[estilos.faltanteBarra, { backgroundColor: PRIORIDAD_COLOR[f.prioridad] }]} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                            <Text style={estilos.faltanteItem}>{f.item}</Text>
                            <Etiqueta texto={f.prioridad} color={PRIORIDAD_COLOR[f.prioridad]} />
                          </View>
                          <Text style={estilos.faltanteDeficit}>
                            Faltan {f.deficit} unidades
                          </Text>
                          {f.cantidad_solicitada > 0 && (
                            <BarraProgreso porcentaje={avance} color={PRIORIDAD_COLOR[f.prioridad]} alto={5} />
                          )}
                        </View>
                      </View>
                    </Aparecer>
                  );
                })}
              </View>
            )}

            {seleccionado.faltantes.length === 0 && (
              <View style={estilos.cubierto}>
                <Text style={estilos.cubiertoTexto}>Todas las necesidades cubiertas</Text>
              </View>
            )}
          </View>
        )}
      </ModalDeslizante>

      {/* Bottom Sheet para Sismos (Radar USGS) */}
      <ModalDeslizante
        visible={!!sismoSeleccionado}
        onCerrar={() => setSismoSeleccionado(null)}
        titulo="Alerta Temprana USGS"
      >
        {sismoSeleccionado && (
          <View>
            <View style={estilos.sheetInfo}>
              <Text style={[estilos.sheetComuna, { color: COLORES.error, fontWeight: "700" }]}>
                Mag {sismoSeleccionado.properties.mag}
              </Text>
              <Etiqueta texto="ALERTA PREVENTIVA" color={COLORES.error} />
            </View>
            <Text style={estilos.seccionTitulo}>{sismoSeleccionado.properties.place}</Text>
            <Text style={estilos.sheetEmergencia}>
              Hora: {new Date(sismoSeleccionado.properties.time).toLocaleString()}
            </Text>
            <View style={estilos.coberturaCard}>
              <Text style={[estilos.coberturaLabel, { color: COLORES.texto, marginBottom: 8 }]}>
                Este evento fue detectado por el radar del USGS. Puede que aún no existan albergues o emergencias declaradas oficialmente. Mantente atento.
              </Text>
            </View>
          </View>
        )}
      </ModalDeslizante>

      {/* Modal para Reportar Nuevo Acopio */}
      <ModalDeslizante
        visible={modalAcopio}
        onCerrar={() => setModalAcopio(false)}
        titulo="Reportar Nuevo Acopio"
      >
        <View style={{ paddingBottom: ESP.xl }}>
          <Text style={{ ...TIPO.cuerpo, color: COLORES.textoSecundario, marginBottom: ESP.m }}>
            Añade un punto de recolección comunitario. Usaremos tu ubicación GPS actual. Serás asignado como el Coordinador de este punto.
          </Text>
          <Campo label="Nombre del lugar" valor={nombreAcopio} onChangeText={setNombreAcopio} placeholder="Ej: Junta Vecinal, Gimnasio..." />
          <Campo label="Comuna / Sector" valor={comunaAcopio} onChangeText={setComunaAcopio} placeholder="Ej: Viña del Mar" />
          <Campo label="Capacidad (personas)" valor={capacidadAcopio} onChangeText={setCapacidadAcopio} teclado="numeric" />
          
          <Boton 
            titulo={creandoAcopio ? "Reportando..." : "Registrar Acopio"} 
            color={COLORES.cyan} 
            onPress={reportarAcopio} 
            deshabilitado={creandoAcopio} 
            estilo={{ marginTop: ESP.l }} 
          />
        </View>
      </ModalDeslizante>
    </View>
  );
}

const estilos = StyleSheet.create({
  controlesFlotantes: {
    position: "absolute",
    bottom: 24,
    right: 12,
    alignItems: "flex-end"
  },
  fab: {
    backgroundColor: COLORES.blanco,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIO.pill,
    ...SOMBRA.media,
  },
  fabTexto: {
    ...TIPO.secundario,
    color: COLORES.azul,
    fontWeight: "700",
    marginLeft: 6
  },
  leyenda: {
    position: "absolute", top: 12, right: 12,
    backgroundColor: COLORES.blanco,
    borderRadius: RADIO.m, padding: ESP.m,
    ...SOMBRA.media,
    borderWidth: 1, borderColor: COLORES.bordeSutil,
  },
  leyendaFila: { flexDirection: "row", alignItems: "center", marginVertical: 3 },
  punto: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  leyendaTexto: { fontSize: 12, color: COLORES.texto, fontWeight: "500", flex: 1, marginRight: 8 },
  leyendaContador: {
    borderRadius: RADIO.pill, paddingHorizontal: 6, paddingVertical: 1,
    minWidth: 22, alignItems: "center",
  },
  leyendaContadorTexto: { fontSize: 11, fontWeight: "800" },
  sheetInfo: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: ESP.xs,
  },
  sheetComuna: { ...TIPO.secundario, color: COLORES.textoSecundario },
  sheetEmergencia: { ...TIPO.secundario, color: COLORES.textoSecundario, marginBottom: ESP.m },
  coberturaCard: {
    backgroundColor: COLORES.fondo,
    borderRadius: RADIO.m,
    padding: ESP.m,
  },
  coberturaLabel: { ...TIPO.secundario, color: COLORES.textoSecundario, fontWeight: "600" },
  coberturaPct: { ...TIPO.subtitulo, fontWeight: "800" },
  seccionTitulo: { ...TIPO.subtitulo, color: COLORES.texto, marginBottom: ESP.s },
  faltanteCard: {
    flexDirection: "row",
    backgroundColor: COLORES.fondo,
    borderRadius: RADIO.m,
    padding: ESP.m,
    marginBottom: ESP.s,
    overflow: "hidden",
  },
  faltanteBarra: {
    width: 4,
    borderRadius: 2,
    marginRight: ESP.m,
    alignSelf: "stretch",
  },
  faltanteItem: { ...TIPO.cuerpo, fontWeight: "600", color: COLORES.texto, flex: 1, marginRight: 8 },
  faltanteDeficit: { ...TIPO.secundario, color: COLORES.textoSecundario, marginTop: 2 },
  cubierto: {
    backgroundColor: COLORES.exitoFondo,
    borderRadius: RADIO.m,
    padding: ESP.l,
    alignItems: "center",
    marginTop: ESP.l,
  },
  cubiertoTexto: { ...TIPO.cuerpo, color: COLORES.exito, fontWeight: "600" },
});
