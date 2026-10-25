import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { obtenerLugares } from '../../servicios/lugares';
import type { Lugar } from '../../tipos/lugar';

export default function PantallaMenuRegistro() {
  const [modoManual, setModoManual] = useState(false);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerLugares().then((res: any) => {
      setLugares(res.datos);
      setCargando(false);
    }).catch(() => setCargando(false));
  }, []);

  const irAlGps = () => {
    if (lugares.length === 0) {
      Alert.alert("Cargando", "Esperá un segundo a que carguen los lugares...");
      return;
    }
    router.push({ 
      pathname: '/registrar-visita/[id]', 
      params: { id: lugares[0].id, origen: 'gps' } 
    });
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
      {/* Esto cambia el título de la barra superior */}
      <Stack.Screen options={{ title: 'Nueva Visita' }} />
      
      <Text style={styles.tituloMenu}>¿Cómo querés registrar tu visita?</Text>

      <TouchableOpacity style={styles.botonPrincipal} onPress={() => router.push('/escanear')}>
        <Text style={styles.textoBoton}>Escanear código QR</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.botonPrincipal} onPress={irAlGps}>
        <Text style={styles.textoBoton}>Estoy acá (Usar GPS)</Text>
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
  // Acá aplicamos el verde oscuro oficial de la app
  botonPrincipal: { backgroundColor: '#174F49', padding: 22, borderRadius: 12, marginBottom: 18 },
  botonVolver: { padding: 18, marginVertical: 10, borderRadius: 10, alignItems: 'center' },
  textoBoton: { color: '#FFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  textoBotonSecundario: { color: '#586C70', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  botonLista: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  textoBotonLista: { fontSize: 22, color: '#183B42', fontWeight: 'bold' },
  direccionLista: { fontSize: 16, color: '#586C70', marginTop: 4 },
});