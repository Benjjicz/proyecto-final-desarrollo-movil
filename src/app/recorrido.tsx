import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { obtenerLugares } from '../servicios/lugares';
import { obtenerVisitasLocales } from '../servicios/visitas';
import type { Lugar } from '../tipos/lugar';
import type { VisitaLocal } from '../tipos/visita';

function FotoVisita({ uri }: { uri: string }) {
  const [fallo, setFallo] = useState(false);

  if (fallo) {
    return (
      <Text style={styles.descripcion}>
        No pudimos abrir la foto de esta visita.
      </Text>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={styles.foto}
      resizeMode="cover"
      accessibilityLabel="Foto de la visita"
      onError={() => setFallo(true)}
    />
  );
}

export default function RecorridoScreen() {
  const [visitas, setVisitas] = useState<VisitaLocal[]>([]);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let activo = true;

      async function cargarRecorrido() {
        setCargando(true);
        setError(null);

        try {
          const [registros, respuestaLugares] = await Promise.all([
            obtenerVisitasLocales(),
            obtenerLugares(),
          ]);

          if (activo) {
            setVisitas(registros);
            setLugares(respuestaLugares.datos);
          }
        } catch {
          if (activo) {
            setError('No pudimos cargar tu recorrido.');
          }
        } finally {
          if (activo) {
            setCargando(false);
          }
        }
      }

      cargarRecorrido();

      return () => {
        activo = false;
      };
    }, [intento])
  );

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator
          size="large"
          color="#14665C"
          accessibilityLabel="Cargando recorrido"
        />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.descripcion}>{error}</Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => setIntento((valor) => valor + 1)}
          style={styles.boton}
        >
          <Text style={styles.textoBoton}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <FlatList
        data={visitas}
        keyExtractor={(visita) => visita.id}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={
          <View style={styles.encabezado}>
            <Text style={styles.etiqueta}>TUS RECUERDOS</Text>
            <Text style={styles.titulo}>Cada parada cuenta.</Text>
            <Text style={styles.descripcion}>
              {visitas.length}{' '}
              {visitas.length === 1
                ? 'visita guardada'
                : 'visitas guardadas'}
              . Primero aparecen las más recientes.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const lugar = lugares.find(
            (elemento) => elemento.id === item.lugarId
          );

          return (
            <View style={styles.tarjeta}>
              <Text style={styles.fecha}>
                {new Date(item.fechaHora).toLocaleString('es-AR', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: 'America/Argentina/Buenos_Aires',
                })}
              </Text>

              <Text style={styles.nombre}>
                {lugar?.nombre ?? 'Lugar fuera del catálogo'}
              </Text>

              {item.fotoUri !== null && (
                <FotoVisita
                  key={item.fotoUri}
                  uri={item.fotoUri}
                />
              )}

              {item.nota !== null && (
                <Text style={styles.nota}>{item.nota}</Text>
              )}

              <Text style={styles.estado}>
                Guardada en este teléfono
              </Text>

              {lugar && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ver detalle de ${lugar.nombre}`}
                  onPress={() =>
                    router.push({
                      pathname: '/lugar/[id]',
                      params: { id: lugar.id },
                    })
                  }
                  style={styles.enlace}
                >
                  <Text style={styles.textoEnlace}>
                    Ver lugar →
                  </Text>
                </Pressable>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.tarjeta}>
            <Text style={styles.nombre}>
              Tu recorrido empieza con una visita
            </Text>
            <Text style={styles.descripcion}>
              Abrí el detalle de un lugar y tocá “Registrar”
              en la parte superior.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F2',
  },
  centrado: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F7F2',
  },
  lista: {
    padding: 24,
    paddingBottom: 40,
  },
  encabezado: {
    marginBottom: 26,
  },
  etiqueta: {
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#14665C',
  },
  titulo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#183B42',
    marginTop: 12,
  },
  descripcion: {
    fontSize: 17,
    lineHeight: 26,
    color: '#586C70',
    marginTop: 12,
  },
  tarjeta: {
    backgroundColor: '#FFFFFF',
    padding: 22,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E1E6DE',
    marginBottom: 18,
  },
  fecha: {
    fontSize: 15,
    color: '#586C70',
    marginBottom: 10,
  },
  nombre: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#183B42',
  },
  foto: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
    marginTop: 18,
    backgroundColor: '#E7EEE8',
  },
  nota: {
    fontSize: 18,
    lineHeight: 27,
    color: '#385354',
    marginTop: 14,
  },
  estado: {
    fontSize: 14,
    color: '#24594B',
    marginTop: 18,
  },
  enlace: {
    minHeight: 48,
    justifyContent: 'center',
    marginTop: 8,
  },
  textoEnlace: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#14665C',
  },
  boton: {
    minHeight: 48,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#174F49',
    marginTop: 20,
  },
  textoBoton: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});