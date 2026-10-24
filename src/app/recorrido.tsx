import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { obtenerLugares } from '../servicios/lugares';
import { intentarSincronizar, obtenerVisitasLocales } from '../servicios/visitas';
import type { Lugar } from '../tipos/lugar';
import type { VisitaLocal } from '../tipos/visita';

function FotoVisita({ uri }: { uri: string }) {
  const [fallo, setFallo] = useState(false);

  if (fallo) {
    return (
      <View style={styles.placeholderErrorFoto}>
        <Text style={styles.textoErrorFoto}>No pudimos abrir la foto</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={styles.miniatura}
      resizeMode="cover"
      accessibilityLabel="Foto de la visita"
      onError={() => setFallo(true)}
    />
  );
}

export default function PantallaMiRecorrido() {
  const [visitas, setVisitas] = useState<VisitaLocal[]>([]);
  const [lugares, setLugares] = useState<Lugar[]>([]);

  useFocusEffect(
    useCallback(() => {
      let activo = true;

      const cargarYSincronizar = async () => {
        const [registros, respuestaLugares] = await Promise.all([
          obtenerVisitasLocales(),
          obtenerLugares(),
        ]);
        
        if (activo) {
          setVisitas(registros);
          setLugares(respuestaLugares.datos);
        }

        await intentarSincronizar();
        const datosActualizados = await obtenerVisitasLocales();
        if (activo) setVisitas(datosActualizados);
      };

      cargarYSincronizar();

      return () => { activo = false; };
    }, [])
  );

  const renderItem = ({ item }: { item: VisitaLocal }) => {
    const lugar = lugares.find(l => l.id === item.lugarId);
    const fechaFormateada = new Date(item.fechaHora).toLocaleString('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    return (
      <View style={styles.tarjeta}>
        {item.fotoUri !== null && <FotoVisita key={item.fotoUri} uri={item.fotoUri} />}

        <View style={styles.infoTarjeta}>
          <View style={styles.filaEncabezadoTarjeta}>
            <Text style={styles.textoFecha}>{fechaFormateada}</Text>
            <Text style={styles.etiquetaOrigen}>{item.origen.toUpperCase()}</Text>
          </View>

          <Text style={styles.nombreLugar}>{lugar?.nombre ?? 'Lugar personalizado'}</Text>

          {item.nota !== null && (
            <Text style={styles.textoNota}>{item.nota}</Text>
          )}

          <Text
            style={[
              styles.textoSincronizacion,
              { color: item.sincronizada ? '#14665C' : '#B85D00' },
            ]}
          >
            {item.sincronizada ? '✓ Sincronizada en la nube' : '⏳ Pendiente (Offline)'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>Mi Recorrido</Text>
      <Text style={styles.contadorVisitas}>
        {visitas.length} {visitas.length === 1 ? 'visita registrada' : 'visitas registradas'}
      </Text>

      {/* CORRECCIÓN: Agregado "as any" para evitar el error de tipado estricto en Expo Router */}
      <Link href={"/registrar-visita" as any} asChild>
        <TouchableOpacity accessibilityRole="button" style={styles.boton}>
          <Text style={styles.textoBoton}>+ Registrar visita</Text>
        </TouchableOpacity>
      </Link>

      <FlatList
        data={visitas}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <Text style={styles.textoMensaje}>Todavía no tenés visitas registradas.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#F7F7F2', padding: 24 },
  titulo: { fontSize: 32, fontWeight: 'bold', color: '#183B42', marginTop: 12 },
  contadorVisitas: { fontSize: 17, color: '#586C70', marginBottom: 20, marginTop: 12 },
  boton: { backgroundColor: '#174F49', padding: 16, borderRadius: 14, marginBottom: 20 },
  textoBoton: { color: '#FFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  textoMensaje: { fontSize: 18, color: '#555', textAlign: 'center', marginTop: 30, lineHeight: 26 },
  tarjeta: { backgroundColor: '#FFFFFF', padding: 22, marginBottom: 18, borderRadius: 22, borderWidth: 1, borderColor: '#E1E6DE' },
  miniatura: { width: '100%', aspectRatio: 4/3, borderRadius: 16, marginBottom: 18, backgroundColor: '#E7EEE8' },
  placeholderErrorFoto: { width: '100%', height: 80, borderRadius: 10, marginBottom: 12, backgroundColor: '#EEE', justifyContent: 'center', alignItems: 'center' },
  textoErrorFoto: { fontSize: 15, color: '#666' },
  infoTarjeta: { flex: 1 },
  filaEncabezadoTarjeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  textoFecha: { fontSize: 15, color: '#586C70', fontWeight: '600' },
  etiquetaOrigen: { fontSize: 13, fontWeight: 'bold', backgroundColor: '#E0E0E0', color: '#000', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  nombreLugar: { fontSize: 23, fontWeight: 'bold', color: '#183B42' },
  textoNota: { fontSize: 18, color: '#385354', marginTop: 14, lineHeight: 27 },
  textoSincronizacion: { fontSize: 14, marginTop: 18, fontWeight: 'bold' },
});