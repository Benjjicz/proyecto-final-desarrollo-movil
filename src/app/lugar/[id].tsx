import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReproductorAudioguia } from '../../components/reproductor-audioguia';
import { obtenerLugarPorId } from '../../servicios/lugares';
import {
  guardarEstadoFavorito,
  obtenerFavoritosLocales,
} from '../../servicios/favoritos';
import type { Lugar } from '../../tipos/lugar';

const diasSemana = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

export default function DetalleLugarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [lugar, setLugar] = useState<Lugar | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [esFavorito, setEsFavorito] = useState(false);
  const [cargandoFavorito, setCargandoFavorito] = useState(true);
  const [errorFavorito, setErrorFavorito] =
    useState<string | null>(null);
  const [guardandoFavorito, setGuardandoFavorito] = useState(false);

  useEffect(() => {
    let activo = true;

    async function cargarLugar() {
      setCargando(true);
      setError(null);
      setLugar(null);

      try {
        if (!id) {
          throw new Error('Falta el identificador del lugar.');
        }

        const respuesta = await obtenerLugarPorId(id);

        if (activo) {
          setLugar(respuesta.datos);
        }
      } catch {
        if (activo) {
          setError('No pudimos encontrar ese lugar.');
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    async function cargarFavorito() {
      setCargandoFavorito(true);
      setErrorFavorito(null);
      setEsFavorito(false);

      try {
        const favoritos = await obtenerFavoritosLocales();

        if (activo) {
          setEsFavorito(favoritos.includes(id));
        }
      } catch {
        if (activo) {
          setErrorFavorito('No pudimos leer tus favoritos.');
        }
      } finally {
        if (activo) {
          setCargandoFavorito(false);
        }
      }
    }

    cargarLugar();
    cargarFavorito();

    return () => {
      activo = false;
    };
  }, [id]);

  async function cambiarFavorito() {
    if (
      !lugar ||
      cargandoFavorito ||
      guardandoFavorito ||
      errorFavorito
    ) {
      return;
    }

    setGuardandoFavorito(true);

    try {
      const nuevoEstado = !esFavorito;
      await guardarEstadoFavorito(lugar.id, nuevoEstado);
      setEsFavorito(nuevoEstado);
    } catch {
      Alert.alert(
        'No se pudo guardar',
        'No pudimos actualizar el favorito. Intentá nuevamente.'
      );
    } finally {
      setGuardandoFavorito(false);
    }
  }

  async function abrirEnlace(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        'No se pudo abrir',
        'No pudimos abrir la aplicación correspondiente.'
      );
    }
  }

  function comoLlegar(modo: 'walking' | 'driving') {
    if (!lugar) {
      return;
    }

    const destino = encodeURIComponent(
      `${lugar.coordenadas.latitud},${lugar.coordenadas.longitud}`
    );

    abrirEnlace(
      'https://www.google.com/maps/dir/?api=1' +
        `&destination=${destino}&travelmode=${modo}`
    );
  }

  if (cargando) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.centrado}>
        <ActivityIndicator
          size="large"
          color="#14665C"
          accessibilityLabel="Cargando detalle"
        />
      </SafeAreaView>
    );
  }

  if (error || !lugar) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.centrado}>
        <Text style={styles.error}>
          {error ?? 'Lugar no disponible.'}
        </Text>
      </SafeAreaView>
    );
  }

  const favoritoDeshabilitado =
    cargandoFavorito ||
    guardandoFavorito ||
    errorFavorito !== null;

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <Text style={styles.titulo}>{lugar.nombre}</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            selected: esFavorito,
            disabled: favoritoDeshabilitado,
          }}
          disabled={favoritoDeshabilitado}
          onPress={cambiarFavorito}
          style={[
            styles.boton,
            favoritoDeshabilitado && styles.deshabilitado,
          ]}
        >
          <Text style={styles.textoBoton}>
            {cargandoFavorito
              ? 'Leyendo favorito…'
              : guardandoFavorito
                ? 'Guardando…'
                : errorFavorito
                  ? 'Favoritos no disponibles'
                  : esFavorito
                    ? '♥ Quitar de favoritos'
                    : '♡ Guardar favorito'}
          </Text>
        </Pressable>

        {errorFavorito !== null && (
          <Text style={styles.error}>{errorFavorito}</Text>
        )}

        <Text style={styles.descripcion}>{lugar.descripcion}</Text>

        <ReproductorAudioguia
          key={lugar.id}
          audioguia={lugar.audioguia}
        />

        <Text style={styles.etiqueta}>Dirección</Text>
        <Text style={styles.texto}>{lugar.direccion}</Text>

        <Text style={styles.etiqueta}>Cómo llegar</Text>
        <Text style={styles.texto}>
          Abrí Google Maps para consultar el recorrido.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => comoLlegar('walking')}
          style={styles.boton}
        >
          <Text style={styles.textoBoton}>Ir caminando</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => comoLlegar('driving')}
          style={styles.boton}
        >
          <Text style={styles.textoBoton}>Ir en auto</Text>
        </Pressable>

        <Text style={styles.etiqueta}>Entrada</Text>
        <Text style={styles.texto}>
          {lugar.precioEntrada === null
            ? 'Precio no informado'
            : lugar.precioEntrada === 0
              ? 'Gratuita'
              : `$${lugar.precioEntrada.toLocaleString('es-AR')}`}
        </Text>

        <Text style={styles.etiqueta}>Horarios</Text>

        {lugar.horarios.length === 0 ? (
          <Text style={styles.texto}>Horarios no informados.</Text>
        ) : (
          diasSemana.map((nombreDia, numeroDia) => {
            const franjas = lugar.horarios.filter(
              (horario) => horario.dia === numeroDia
            );

            return (
              <View key={nombreDia} style={styles.filaHorario}>
                <Text style={styles.dia}>{nombreDia}</Text>
                <Text style={styles.horas}>
                  {franjas.length === 0
                    ? 'Sin horario cargado'
                    : franjas
                        .map(
                          (horario) =>
                            `${horario.abre} a ${horario.cierra}`
                        )
                        .join(' / ')}
                </Text>
              </View>
            );
          })
        )}

        <Text style={styles.etiqueta}>Teléfono</Text>

        {lugar.telefono === null ? (
          <Text style={styles.texto}>No informado</Text>
        ) : (
          <Pressable
            accessibilityRole="button"
            style={styles.boton}
            onPress={() => abrirEnlace(`tel:${lugar.telefono}`)}
          >
            <Text style={styles.textoBoton}>
              Llamar: {lugar.telefono}
            </Text>
          </Pressable>
        )}

        <Text style={styles.etiqueta}>Sitio web</Text>

        {lugar.sitioWeb === null ? (
          <Text style={styles.texto}>No informado</Text>
        ) : (
          <Pressable
            accessibilityRole="link"
            style={styles.boton}
            onPress={() => {
              if (lugar.sitioWeb !== null) {
                abrirEnlace(lugar.sitioWeb);
              }
            }}
          >
            <Text style={styles.textoBoton}>Abrir sitio web</Text>
          </Pressable>
        )}

        <Text style={styles.etiqueta}>Accesibilidad</Text>
        <Text style={styles.texto}>
          {lugar.accesible
            ? 'Accesible para silla de ruedas'
            : 'No indicado como accesible para silla de ruedas'}
        </Text>

        <Text style={styles.aviso}>
          Datos y ubicaciones ficticias para el desarrollo del TP.
        </Text>
      </ScrollView>
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
  contenido: {
    padding: 24,
    paddingBottom: 40,
  },
  titulo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#183B42',
  },
  descripcion: {
    fontSize: 18,
    lineHeight: 28,
    color: '#586C70',
    marginTop: 16,
  },
  etiqueta: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#183B42',
    marginTop: 26,
  },
  texto: {
    fontSize: 18,
    lineHeight: 27,
    color: '#586C70',
    marginTop: 8,
  },
  filaHorario: {
    marginTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D4DCE5',
  },
  dia: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#183B42',
  },
  horas: {
    fontSize: 17,
    color: '#586C70',
    marginTop: 4,
  },
  boton: {
    minHeight: 48,
    backgroundColor: '#174F49',
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBoton: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  deshabilitado: {
    opacity: 0.5,
  },
  aviso: {
    fontSize: 15,
    lineHeight: 23,
    color: '#586C70',
    marginTop: 32,
  },
  error: {
    fontSize: 18,
    color: '#A32020',
    marginTop: 12,
  },
});