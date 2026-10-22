import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { obtenerEventos } from '../servicios/eventos';
import type { Evento } from '../tipos/evento';

const ZONA = 'America/Argentina/Buenos_Aires';

const etiquetas = {
  programado: 'Programado',
  suspendido: 'Suspendido',
  cancelado: 'Cancelado',
  finalizado: 'Finalizado',
};

function claveDia(fecha: string | Date): string {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(fecha));

  const obtener = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value;

  return `${obtener('year')}-${obtener('month')}-${obtener('day')}`;
}

export default function AgendaScreen() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;

    async function cargarEventos() {
      setCargando(true);
      setError(null);

      try {
        const respuesta = await obtenerEventos();

        if (activo) {
          setEventos(respuesta.datos);
        }
      } catch {
        if (activo) {
          setError('No pudimos cargar la agenda.');
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarEventos();

    return () => {
      activo = false;
    };
  }, [intento]);

  const hoy = claveDia(new Date());

  const agrupados = new Map<
    string,
    { titulo: string; data: Evento[] }
  >();

  const ordenados = [...eventos].sort(
    (a, b) => Date.parse(a.inicio) - Date.parse(b.inicio)
  );

  for (const evento of ordenados) {
    const dia = claveDia(evento.inicio);

    if (dia < hoy) {
      continue;
    }

    if (!agrupados.has(dia)) {
      agrupados.set(dia, {
        titulo:
          dia === hoy
            ? 'Hoy'
            : new Date(evento.inicio).toLocaleDateString('es-AR', {
                timeZone: ZONA,
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              }),
        data: [],
      });
    }

    agrupados.get(dia)!.data.push(evento);
  }

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator
          size="large"
          color="#14665C"
          accessibilityLabel="Cargando agenda"
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
      <SectionList
        sections={Array.from(agrupados.values())}
        keyExtractor={(evento) => evento.id}
        contentContainerStyle={styles.lista}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.encabezado}>
            <Text style={styles.etiqueta}>VIVÍ LA CIUDAD</Text>
            <Text style={styles.titulo}>Siempre hay un plan.</Text>
            <Text style={styles.descripcion}>
              Descubrí qué hacer en Colón. Horarios de Argentina.
            </Text>
            <Text style={styles.aviso}>
              Eventos ficticios para el TP.
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.dia}>{section.titulo}</Text>
        )}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ver evento ${item.titulo}`}
            onPress={() =>
              router.push({
                pathname: '/evento/[id]',
                params: { id: item.id },
              })
            }
            style={({ pressed }) => [
              styles.tarjeta,
              pressed && styles.presionado,
            ]}
          >
            <Text style={styles.hora}>
              {new Date(item.inicio).toLocaleTimeString('es-AR', {
                timeZone: ZONA,
                hour: '2-digit',
                minute: '2-digit',
              })}
              {' hs'}
            </Text>

            <Text style={styles.nombre}>{item.titulo}</Text>

            <Text
              style={[
                styles.estado,
                (item.estado === 'suspendido' ||
                  item.estado === 'cancelado') &&
                  styles.estadoAdvertencia,
              ]}
            >
              {etiquetas[item.estado]}
            </Text>

            <Text style={styles.descripcion}>
              {item.precio === null
                ? 'Precio no informado'
                : item.precio === 0
                  ? 'Actividad gratuita'
                  : `$${item.precio.toLocaleString('es-AR')}`}
            </Text>

            <Text style={styles.enlace}>Ver evento →</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.descripcion}>
            No hay eventos cargados desde hoy.
          </Text>
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
    marginBottom: 22,
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
    marginTop: 10,
  },
  aviso: {
    fontSize: 14,
    color: '#586C70',
    marginTop: 10,
  },
  dia: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#183B42',
    marginTop: 14,
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  tarjeta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E1E6DE',
  },
  hora: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#14665C',
    marginBottom: 10,
  },
  nombre: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#183B42',
  },
  estado: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#24594B',
    marginTop: 12,
  },
  estadoAdvertencia: {
    color: '#A32020',
  },
  enlace: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#14665C',
    marginTop: 18,
  },
  boton: {
    minHeight: 48,
    padding: 16,
    backgroundColor: '#174F49',
    borderRadius: 14,
    marginTop: 18,
  },
  textoBoton: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  presionado: {
    opacity: 0.8,
  },
});