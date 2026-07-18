
import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert,
} from "react-native";
import { api } from "../api";
import { COLORES, ESP, TIPO, SOMBRA, RADIO } from "../tema";
import {
  Tarjeta, Boton, Cargando, Vacio, Encabezado, Aparecer,
  Mensaje, Etiqueta, Toast, SelectorSegmento,
} from "../componentes";
import { IconoSol, IconoAtardecer, IconoLuna, IconoCalendario, IconoCerrar } from "../iconos";

const BLOQUE_META = {
  MANANA: { label: "Mañana", hora: "08:00–13:00", color: COLORES.naranja, Icono: IconoSol },
  TARDE: { label: "Tarde", hora: "13:00–18:00", color: COLORES.azul, Icono: IconoAtardecer },
  NOCHE: { label: "Noche", hora: "18:00–22:00", color: COLORES.navy, Icono: IconoLuna },
};

export default function Turnos() {
  const [datos, setDatos] = useState(null);
  const [albergues, setAlbergues] = useState([]);
  const [selAlbergue, setSelAlbergue] = useState(null);
  const [fecha, setFecha] = useState(hoy());
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [toast, setToast] = useState(null);
  const [vista, setVista] = useState("proximos");

  function hoy() { return new Date().toISOString().slice(0, 10); }

  const cargar = useCallback(async () => {
    try {
      const [t, a] = await Promise.all([api("/turnos/mios"), api("/albergues")]);
      setDatos(t);
      setAlbergues(a);
      if (!selAlbergue && a.length > 0) setSelAlbergue(a[0].id_albergue);
    } catch { /* silencioso */ }
    setCargando(false);
  }, [selAlbergue]);

  useEffect(() => { cargar(); }, [cargar]);

  const agendar = async (bloque) => {
    setEnviando(true);
    try {
      await api("/turnos", {
        method: "POST",
        body: JSON.stringify({ id_albergue: selAlbergue, fecha, bloque }),
      });
      await cargar();
      setToast({ mensaje: `Turno de ${BLOQUE_META[bloque].label} agendado`, tipo: "exito" });
    } catch (e) {
      setToast({ mensaje: e.message, tipo: "error" });
    }
    setEnviando(false);
  };

  const cancelar = (idTurno) => {
    Alert.alert(
      "Cancelar turno",
      "¿Estás seguro? Esta acción no se puede deshacer.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Sí, cancelar",
          style: "destructive",
          onPress: async () => {
            try {
              await api(`/turnos/${idTurno}`, { method: "DELETE" });
              await cargar();
              setToast({ mensaje: "Turno cancelado", tipo: "exito" });
            } catch (e) {
              setToast({ mensaje: e.message, tipo: "error" });
            }
          },
        },
      ]
    );
  };

  if (cargando) return <Cargando />;

  const proximos = datos?.proximos || [];
  const pasados = datos?.pasados || [];

  // Generar los proximos 7 dias
  const dias = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dias.push(d.toISOString().slice(0, 10));
  }

  const diaNombres = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const mesNombres = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  return (
    <View style={{ flex: 1, backgroundColor: COLORES.fondo }}>
      <Toast visible={!!toast} mensaje={toast?.mensaje} tipo={toast?.tipo} onOcultar={() => setToast(null)} />

      <ScrollView contentContainerStyle={{ paddingBottom: ESP.xxl * 2 }} showsVerticalScrollIndicator={false}>
        <Encabezado titulo="Turnos" subtitulo={`${datos?.total || 0} turnos registrados`} />

        {/* Calendario horizontal */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: ESP.l, paddingBottom: ESP.m, gap: ESP.s }}>
          {dias.map((d) => {
            const dt = new Date(d + "T12:00:00");
            const activo = d === fecha;
            const tieneProximo = proximos.some(t => t.fecha === d);
            return (
              <TouchableOpacity
                key={d}
                style={[estilos.diaCard, activo && estilos.diaCardActivo]}
                onPress={() => setFecha(d)}
                activeOpacity={0.8}
              >
                <Text style={[estilos.diaNombre, activo && { color: COLORES.blanco }]}>
                  {diaNombres[dt.getDay()]}
                </Text>
                <Text style={[estilos.diaNum, activo && { color: COLORES.blanco }]}>
                  {dt.getDate()}
                </Text>
                <Text style={[estilos.diaMes, activo && { color: COLORES.sobreOscuro }]}>
                  {mesNombres[dt.getMonth()]}
                </Text>
                {tieneProximo && <View style={[estilos.diaDot, activo && { backgroundColor: COLORES.blanco }]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Seleccion de albergue */}
        <View style={{ paddingHorizontal: ESP.l, marginBottom: ESP.m }}>
          <Text style={estilos.seccion}>Albergue</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: ESP.s }}>
            {albergues.map((a) => (
              <TouchableOpacity
                key={a.id_albergue}
                style={[estilos.albergueChip, selAlbergue === a.id_albergue && estilos.albergueChipActivo]}
                onPress={() => setSelAlbergue(a.id_albergue)}
              >
                <Text style={[estilos.albergueChipTexto, selAlbergue === a.id_albergue && { color: COLORES.blanco }]}>
                  {a.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Bloques horarios */}
        <View style={{ paddingHorizontal: ESP.l, marginBottom: ESP.l }}>
          <Text style={estilos.seccion}>Agendar para {fecha}</Text>
          {Object.entries(BLOQUE_META).map(([clave, meta]) => {
            const yaAgendado = proximos.some(t => t.fecha === fecha && t.bloque === clave);
            return (
              <Aparecer key={clave}>
                <TouchableOpacity
                  style={[estilos.bloqueCard, yaAgendado && { borderColor: meta.color + "50", backgroundColor: meta.color + "08" }]}
                  onPress={() => !yaAgendado && !enviando && agendar(clave)}
                  disabled={yaAgendado || enviando}
                  activeOpacity={0.8}
                >
                  <View style={[estilos.bloqueIcono, { backgroundColor: meta.color + "15" }]}>
                    <meta.Icono color={meta.color} size={20} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={estilos.bloqueLabel}>{meta.label}</Text>
                    <Text style={estilos.bloqueHora}>{meta.hora}</Text>
                  </View>
                  {yaAgendado
                    ? <Etiqueta texto="Agendado" color={meta.color} />
                    : <Text style={estilos.bloqueAccion}>Agendar →</Text>
                  }
                </TouchableOpacity>
              </Aparecer>
            );
          })}
        </View>

        {/* Mis turnos */}
        <View style={{ paddingHorizontal: ESP.l }}>
          <SelectorSegmento
            opciones={[
              { valor: "proximos", etiqueta: `Próximos (${proximos.length})` },
              { valor: "pasados", etiqueta: `Historial (${pasados.length})` },
            ]}
            seleccionado={vista}
            onCambio={setVista}
          />

          {(vista === "proximos" ? proximos : pasados).length === 0 ? (
            <Vacio titulo={vista === "proximos" ? "Sin turnos próximos" : "Sin historial"} icono={<IconoCalendario color={COLORES.textoTerciario} size={26} />} />
          ) : (
            (vista === "proximos" ? proximos : pasados).map((t, i) => {
              const meta = BLOQUE_META[t.bloque] || {};
              return (
                <Aparecer key={t.id_turno} retraso={i * 30}>
                  <Tarjeta style={estilos.turnoCard}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={[estilos.turnoIcono, { backgroundColor: (meta.color || COLORES.azul) + "15" }]}>
                        {meta.Icono ? <meta.Icono color={meta.color} size={18} /> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={estilos.turnoAlbergue}>{t.albergue}</Text>
                        <Text style={estilos.turnoFecha}>
                          {t.fecha} · {meta.label || t.bloque}
                        </Text>
                      </View>
                      {vista === "proximos" && (
                        <TouchableOpacity
                          style={estilos.cancelarBtn}
                          onPress={() => cancelar(t.id_turno)}
                        >
                          <IconoCerrar color={COLORES.error} size={14} />
                        </TouchableOpacity>
                      )}
                      {t.estado === "CANCELADO" && (
                        <Etiqueta texto="Cancelado" color={COLORES.textoTerciario} />
                      )}
                    </View>
                  </Tarjeta>
                </Aparecer>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  seccion: { ...TIPO.micro, color: COLORES.textoSecundario, marginBottom: ESP.s, textTransform: "uppercase" },
  diaCard: {
    width: 56, alignItems: "center",
    paddingVertical: ESP.m,
    borderRadius: RADIO.l,
    backgroundColor: COLORES.superficie,
    borderWidth: 1, borderColor: COLORES.bordeSutil,
    ...SOMBRA.suave,
  },
  diaCardActivo: {
    backgroundColor: COLORES.navy,
    borderColor: COLORES.navy,
  },
  diaNombre: { ...TIPO.micro, color: COLORES.textoSecundario },
  diaNum: { ...TIPO.titulo, color: COLORES.texto, marginVertical: 2 },
  diaMes: { ...TIPO.micro, color: COLORES.textoTerciario },
  diaDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: COLORES.coral, marginTop: 4,
  },
  albergueChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: RADIO.pill,
    backgroundColor: COLORES.superficie,
    borderWidth: 1.5, borderColor: COLORES.borde,
  },
  albergueChipActivo: {
    backgroundColor: COLORES.navy,
    borderColor: COLORES.navy,
  },
  albergueChipTexto: { ...TIPO.secundario, fontWeight: "600", color: COLORES.texto },
  bloqueCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORES.superficie,
    borderRadius: RADIO.l,
    padding: ESP.l,
    marginBottom: ESP.s,
    borderWidth: 1.5, borderColor: COLORES.bordeSutil,
  },
  bloqueIcono: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    marginRight: ESP.m,
  },
  bloqueLabel: { ...TIPO.subtitulo, color: COLORES.texto },
  bloqueHora: { ...TIPO.micro, color: COLORES.textoSecundario, marginTop: 2 },
  bloqueAccion: { ...TIPO.secundario, color: COLORES.azul, fontWeight: "600" },
  turnoCard: { marginBottom: ESP.xs },
  turnoIcono: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    marginRight: ESP.m,
  },
  turnoAlbergue: { ...TIPO.cuerpo, fontWeight: "600", color: COLORES.texto },
  turnoFecha: { ...TIPO.micro, color: COLORES.textoSecundario, marginTop: 2 },
  cancelarBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORES.errorFondo,
    alignItems: "center", justifyContent: "center",
  },
});
