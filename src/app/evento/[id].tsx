import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccionesEvento } from '../../components/acciones-evento';
import { obtenerEventoPorId } from '../../servicios/eventos';
import { obtenerLugarPorId } from '../../servicios/lugares';
import type { Evento } from '../../tipos/evento';
import type { Lugar } from '../../tipos/lugar';

const etiquetas = {
  programado: 'Programado',
  suspendido: 'Suspendido',
  cancelado: 'Cancelado',
  finalizado: 'Finalizado',
};

function mostrarFecha(fecha: string) {
  return new Date(fecha).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'full',
    timeStyle: 'short',
  });
}

export default function EventoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [evento, setEvento] = useState<Evento | null>(null);
  const [lugar, setLugar] = useState<Lugar | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    async function cargarEvento() {
      setCargando(true);
      setError(null);
      setEvento(null);
      setLugar(null);

      try {
        if (!id) {
          throw new Error('Falta el evento.');
        }

        const respuesta = await obtenerEventoPorId(id);
        let asociado: Lugar | null = null;

        if (respuesta.datos.lugarId !== null) {
          try {
            const resultado = await obtenerLugarPorId(
              respuesta.datos.lugarId
            );
            asociado = resultado.datos;
          } catch {
            // Mostramos el evento aunque su lugar no esté disponible.
          }
        }

        if (activo) {
          setEvento(respuesta.datos);
          setLugar(asociado);
        }
      } catch {
        if (activo) {
          setError('No pudimos cargar el evento.');
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarEvento();

    return () => {
      activo = false;
    };
  }, [id]);

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator
          size="large"
          color="#14665C"
          accessibilityLabel="Cargando evento"
        />
      </View>
    );
  }

  if (error || !evento) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.texto}>
          {error ?? 'Evento no disponible.'}
        </Text>
      </View>
    );
  }

  const duracion = evento.fin
    ? Math.round(
        (Date.parse(evento.fin) - Date.parse(evento.inicio)) / 60000
      )
    : null;

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <Text style={styles.etiqueta}>AGENDA DE COLÓN</Text>
        <Text style={styles.titulo}>{evento.titulo}</Text>

        <View style={styles.estado}>
          <Text style={styles.textoEstado}>
            {etiquetas[evento.estado]}
          </Text>
        </View>

        <Text style={styles.texto}>{evento.descripcion}</Text>

        <Text style={styles.label}>Cuándo</Text>
        <Text style={styles.texto}>
          {mostrarFecha(evento.inicio)}
        </Text>

        {evento.fin !== null && (
          <Text style={styles.texto}>
            Finaliza: {mostrarFecha(evento.fin)}
          </Text>
        )}

        {duracion !== null && duracion >= 0 && (
          <Text style={styles.texto}>
            Duración: {duracion} minutos
          </Text>
        )}

        <Text style={styles.label}>Dónde</Text>
        <Text style={styles.texto}>
          {lugar
            ? `${lugar.nombre} · ${lugar.direccion}`
            : evento.direccionLibre ??
              'La información del lugar no está disponible.'}
        </Text>

        {lugar && (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: '/lugar/[id]',
                params: { id: lugar.id },
              })
            }
            style={styles.boton}
          >
            <Text style={styles.textoBoton}>Ver lugar</Text>
          </Pressable>
        )}

        <Text style={styles.label}>Entrada</Text>
        <Text style={styles.texto}>
          {evento.precio === null
            ? 'Precio no informado'
            : evento.precio === 0
              ? 'Actividad gratuita'
              : `$${evento.precio.toLocaleString('es-AR')}`}
        </Text>

        <AccionesEvento key={evento.id} evento={evento} />

        <Text style={styles.aviso}>
          Evento ficticio para el TP. Los eventos guardados todavía
          no se sincronizan con una cuenta.
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
  estado: {
    alignSelf: 'flex-start',
    backgroundColor: '#E7EEE8',
    padding: 12,
    borderRadius: 12,
    marginVertical: 18,
  },
  textoEstado: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#183B42',
  },
  texto: {
    fontSize: 18,
    lineHeight: 28,
    color: '#586C70',
    marginTop: 10,
  },
  label: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#183B42',
    marginTop: 26,
  },
  boton: {
    minHeight: 48,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#174F49',
    alignItems: 'center',
    marginTop: 18,
  },
  textoBoton: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  aviso: {
    fontSize: 15,
    lineHeight: 23,
    color: '#586C70',
    marginTop: 32,
  },
});