import * as Location from 'expo-location';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { obtenerLugares } from '../../servicios/lugares';
import type { Lugar } from '../../tipos/lugar';

// Función matemática para calcular distancia en metros
function calcularDistanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radianes = (grados: number) => (grados * Math.PI) / 180;
  const diferenciaLatitud = radianes(lat2 - lat1);
  const diferenciaLongitud = radianes(lon2 - lon1);

  const calculo =
    Math.sin(diferenciaLatitud / 2) ** 2 +
    Math.cos(radianes(lat1)) * Math.cos(radianes(lat2)) * Math.sin(diferenciaLongitud / 2) ** 2;

  return 6371000 * 2 * Math.atan2(Math.sqrt(calculo), Math.sqrt(1 - calculo));
}

export default function PantallaMenuRegistro() {
  const [modoManual, setModoManual] = useState(false);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // Nuevo estado para que el botón de GPS gire mientras busca la señal
  const [buscandoGps, setBuscandoGps] = useState(false);

  useEffect(() => {
    obtenerLugares().then((res: any) => {
      setLugares(res.datos);
      setCargando(false);
    }).catch(() => setCargando(false));
  }, []);

  const irAlGps = async () => {
    if (lugares.length === 0) {
      Alert.alert("Cargando", "Esperá un segundo a que carguen los lugares...");
      return;
    }

    setBuscandoGps(true);
    try {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (!permiso.granted) throw new Error('Necesitamos permiso de ubicación.');

      const servicios = await Location.hasServicesEnabledAsync();
      if (!servicios) throw new Error('Activá la ubicación del teléfono.');

      const posicion = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = posicion.coords;

      let lugarDetectado: Lugar | null = null;
      let distanciaMinima = 101; // Radio máximo de 100 metros

      // Comparamos tu GPS con TODOS los lugares de la lista
      for (const lugar of lugares) {
        if (!lugar.activo) continue;

        const distancia = calcularDistanciaMetros(
          latitude,
          longitude,
          lugar.coordenadas.latitud,
          lugar.coordenadas.longitud
        );

        if (distancia <= 100 && distancia < distanciaMinima) {
          distanciaMinima = distancia;
          lugarDetectado = lugar;
        }
      }

      // Si terminó de buscar y no encontró nada cerca
      if (!lugarDetectado) {
        throw new Error('No estás a menos de 100 metros de ningún lugar turístico registrado.');
      }

      // Si encontró uno, navegamos a la siguiente pantalla pasándole EL ID DETECTADO
      router.push({ 
        pathname: '/registrar-visita/[id]', 
        params: { id: lugarDetectado.id, origen: 'gps' } 
      });

    } catch (error: any) {
      let mensajeError = error.message;

      // Atajamos el error crudo de Expo Location (GPS apagado o sin señal satelital)
      if (mensajeError.includes('unsatisfied device settings') || mensajeError.includes('Location request failed')) {
        mensajeError = 'No pudimos obtener tu ubicación. Asegurate de tener el GPS encendido en tu teléfono.';
      }

      Alert.alert("Atención", mensajeError);
    } finally {
      setBuscandoGps(false);
    }
  };

  if (modoManual) {
    return (
      <View style={styles.contenedor}>
        <Stack.Screen options={{ title: 'Buscar lugar' }} />
        <Text style={styles.texto}>Elegí el lugar de la lista</Text>
        {cargando ? (
          <ActivityIndicator size="large" color="#174F49" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={lugares}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.botonLista}
                onPress={() => router.push({ pathname: '/registrar-visita/[id]', params: { id: item.id, origen: 'manual' } })}
              >
                <Text style={styles.textoBotonLista}>{item.nombre}</Text>
                <Text style={styles.direccionLista}>{item.direccion}</Text>
              </TouchableOpacity>
            )}
          />
        )}
        <TouchableOpacity style={styles.botonVolver} onPress={() => setModoManual(false)}>
          <Text style={styles.textoBotonSecundario}>Volver atrás</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.contenedorCentro}>
      <Stack.Screen options={{ title: 'Nueva Visita' }} />
      
      <Text style={styles.tituloMenu}>¿Cómo querés registrar tu visita?</Text>

      <TouchableOpacity style={styles.botonPrincipal} onPress={() => router.push('/escanear')}>
        <Text style={styles.textoBoton}>Escanear código QR</Text>
      </TouchableOpacity>

      {/* Botón de GPS actualizado con spinner de carga */}
      <TouchableOpacity 
        style={styles.botonPrincipal} 
        onPress={irAlGps}
        disabled={buscandoGps}
      >
        {buscandoGps ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.textoBoton}>Estoy acá (Usar GPS)</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.botonPrincipal} onPress={() => setModoManual(true)}>
        <Text style={styles.textoBoton}>Buscar en la lista (Manual)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.botonVolver} onPress={() => router.back()}>
        <Text style={styles.textoBotonSecundario}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#F7F7F2' },
  contenedorCentro: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#F7F7F2' },
  tituloMenu: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center', color: '#183B42' },
  texto: { fontSize: 24, paddingTop: 40, paddingBottom: 20, paddingHorizontal: 20, color: '#183B42', fontWeight: 'bold' },
  botonPrincipal: { backgroundColor: '#174F49', padding: 22, borderRadius: 12, marginBottom: 18 },
  botonVolver: { padding: 18, marginVertical: 10, borderRadius: 10, alignItems: 'center' },
  textoBoton: { color: '#FFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  textoBotonSecundario: { color: '#586C70', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  botonLista: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  textoBotonLista: { fontSize: 22, color: '#183B42', fontWeight: 'bold' },
  direccionLista: { fontSize: 16, color: '#586C70', marginTop: 4 },
});