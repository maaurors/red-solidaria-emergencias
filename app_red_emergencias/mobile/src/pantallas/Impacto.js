import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, RefreshControl } from "react-native";
import { api } from "../api";
import { COLORES, ESP, TIPO, SOMBRA, RADIO } from "../tema";
import { Tarjeta, Cargando, Encabezado, Aparecer, Mensaje } from "../componentes";
import { IconoEstrella, IconoCopa } from "../iconos";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

const COLORES_PODIO = ["#FFD700", "#C0C0C0", "#CD7F32"]; // Oro, Plata, Bronce

export default function Impacto() {
  const [ranking, setRanking] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(null);

  const cargarRanking = async () => {
    try {
      const data = await api("/estadisticas/ranking");
      setRanking(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useEffect(() => {
    cargarRanking();
  }, []);

  const onRefresh = () => {
    setRefrescando(true);
    cargarRanking();
  };

  if (cargando) return <Cargando />;

  const podio = ranking.slice(0, 3);
  const resto = ranking.slice(3);

  const renderEstrellas = (cantidad) => {
    // Si no tiene estrellas, mostramos 1 estrella gris (para que no quede vacio)
    if (cantidad === 0) {
      return (
        <View style={estilos.estrellasContainer}>
          <IconoEstrella size={14} color={COLORES.textoTerciario} />
          <Text style={estilos.estrellasTexto0}>Aún sin estrellas</Text>
        </View>
      );
    }

    // Maximo 5 estrellas visibles, si tiene mas ponemos "5x" o "+5"
    const limite = Math.min(cantidad, 5);
    const arreglo = Array(limite).fill(0);
    
    return (
      <View style={estilos.estrellasContainer}>
        {arreglo.map((_, i) => (
          <IconoEstrella key={i} size={14} color="#FFD700" relleno={true} />
        ))}
        {cantidad > 5 && <Text style={estilos.estrellasTexto}>+{cantidad - 5}</Text>}
      </View>
    );
  };

  const renderPodioItem = (donante, posicion) => {
    if (!donante) return <View style={estilos.podioItemBase} />;
    
    const colorMedalla = COLORES_PODIO[posicion];
    const iniciales = donante.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
    
    // Alturas del podio: 1ero es el mas alto, 2do medio, 3ro bajo
    const alturas = [130, 100, 80];
    const altura = alturas[posicion];

    return (
      <View style={[estilos.podioItemBase, posicion === 0 && { zIndex: 10 }]}>
        <Aparecer retraso={posicion * 150} estilo={{ alignItems: "center" }}>
          
          {posicion === 0 && (
            <View style={{ marginBottom: -10, zIndex: 5 }}>
              <IconoCopa size={28} color={colorMedalla} />
            </View>
          )}

          <View style={[estilos.avatarPodio, { borderColor: colorMedalla }]}>
            {donante.avatar ? (
              <Image source={{ uri: donante.avatar }} style={estilos.avatarImgPodio} />
            ) : (
              <Text style={estilos.avatarTextoPodio}>{iniciales}</Text>
            )}
            <View style={[estilos.medallaNumero, { backgroundColor: colorMedalla }]}>
              <Text style={estilos.medallaTexto}>{posicion + 1}</Text>
            </View>
          </View>
          
          <Text style={estilos.nombrePodio} numberOfLines={1}>{donante.nombre.split(" ")[0]}</Text>
          <Text style={estilos.unidadesPodio}>{donante.total_unidades} pts</Text>

          {/* Columna del podio */}
          <View style={[estilos.columnaPodio, { height: altura }]}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={estilos.columnaEstrellas}>{donante.estrellas}</Text>
              <View style={{ marginLeft: 3 }}>
                <IconoEstrella color="#FFFFFF" size={12} relleno />
              </View>
            </View>
          </View>

        </Aparecer>
      </View>
    );
  };

  return (
    <View style={estilos.raiz}>
      <Encabezado 
        titulo="Impacto Solidario" 
        subtitulo="Reconociendo a nuestros mejores donantes" 
      />

      <FlatList
        data={resto}
        keyExtractor={(i) => String(i.id_usuario)}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor={COLORES.coral} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <View>
            {error && <Mensaje texto={error} tipo="error" style={{ margin: ESP.m }} />}
            
            {/* Podio Principal */}
            {podio.length > 0 && (
              <View style={estilos.podioContenedor}>
                {renderPodioItem(podio[1], 1)}
                {renderPodioItem(podio[0], 0)}
                {renderPodioItem(podio[2], 2)}
              </View>
            )}

            {resto.length > 0 && (
              <Text style={estilos.tituloLista}>Otros Héroes</Text>
            )}
          </View>
        )}
        renderItem={({ item, index }) => {
          const iniciales = item.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
          const posicion = index + 4; // Porque los 3 primeros estan en el podio
          
          return (
            <Aparecer retraso={100 + (index * 50)}>
              <Tarjeta style={estilos.fila}>
                <Text style={estilos.posicion}>{posicion}</Text>
                
                <View style={estilos.avatarLista}>
                  {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={estilos.avatarImgLista} />
                  ) : (
                    <Text style={estilos.avatarTextoLista}>{iniciales}</Text>
                  )}
                </View>

                <View style={estilos.infoLista}>
                  <Text style={estilos.nombreLista}>{item.nombre}</Text>
                  {renderEstrellas(item.estrellas)}
                </View>

                <View style={estilos.estadisticasLista}>
                  <Text style={estilos.unidadesLista}>{item.total_unidades}</Text>
                  <Text style={estilos.unidadesLabel}>ítems</Text>
                </View>
              </Tarjeta>
            </Aparecer>
          );
        }}
        ListEmptyComponent={() => (
          !cargando && !error && (
            <Mensaje texto="Aún no hay donantes registrados." tipo="info" style={{ margin: ESP.m }} />
          )
        )}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: COLORES.fondo },
  
  // Estilos Podio
  podioContenedor: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: ESP.m,
    paddingTop: ESP.xl,
    paddingBottom: ESP.m,
    marginVertical: ESP.m,
    height: 280, // Altura fija para que la animacion no mueva el layout
  },
  podioItemBase: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    marginHorizontal: 4,
  },
  avatarPodio: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: COLORES.navy,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    marginBottom: ESP.s,
    ...SOMBRA.media,
  },
  avatarImgPodio: { width: 60, height: 60, borderRadius: 30 },
  avatarTextoPodio: { ...TIPO.h2, color: COLORES.blanco },
  medallaNumero: {
    position: "absolute",
    bottom: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORES.fondo,
  },
  medallaTexto: { fontSize: 11, fontWeight: "900", color: COLORES.blanco },
  nombrePodio: { ...TIPO.cuerpo, fontWeight: "700", color: COLORES.texto, marginBottom: 2 },
  unidadesPodio: { ...TIPO.micro, color: COLORES.textoSecundario, marginBottom: ESP.s },
  columnaPodio: {
    width: "100%",
    backgroundColor: COLORES.superficie,
    borderTopLeftRadius: RADIO.m,
    borderTopRightRadius: RADIO.m,
    alignItems: "center",
    justifyContent: "center",
    ...SOMBRA.baja,
  },
  columnaEstrellas: { fontSize: 18, fontWeight: "800", color: COLORES.navy },

  // Estilos Lista
  tituloLista: {
    ...TIPO.h2,
    color: COLORES.navy,
    marginHorizontal: ESP.l,
    marginTop: ESP.l,
    marginBottom: ESP.m,
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: ESP.l,
    marginBottom: ESP.m,
    padding: ESP.m,
  },
  posicion: {
    width: 24,
    ...TIPO.secundario,
    fontWeight: "800",
    color: COLORES.textoTerciario,
  },
  avatarLista: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORES.coral,
    alignItems: "center",
    justifyContent: "center",
    marginRight: ESP.m,
  },
  avatarImgLista: { width: 44, height: 44, borderRadius: 22 },
  avatarTextoLista: { ...TIPO.cuerpo, fontWeight: "800", color: COLORES.blanco },
  infoLista: { flex: 1 },
  nombreLista: { ...TIPO.cuerpo, fontWeight: "700", color: COLORES.texto, marginBottom: 4 },
  estrellasContainer: { flexDirection: "row", alignItems: "center" },
  estrellasTexto: { ...TIPO.micro, color: "#FFD700", fontWeight: "800", marginLeft: 4 },
  estrellasTexto0: { ...TIPO.micro, color: COLORES.textoTerciario, marginLeft: 4 },
  estadisticasLista: { alignItems: "flex-end" },
  unidadesLista: { ...TIPO.subtitulo, color: COLORES.navy, fontWeight: "800" },
  unidadesLabel: { ...TIPO.micro, color: COLORES.textoSecundario },
});
