import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  cerrarSesionDemo,
  iniciarSesionDemo,
  obtenerSesionDemo,
} from '../servicios/sesion';
import type { SesionDemo } from '../tipos/sesion';

export default function CuentaScreen() {
  const [sesion, setSesion] = useState<SesionDemo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let activo = true;

      async function cargarSesion() {
        setCargando(true);
        setError(null);

        try {
          const guardada = await obtenerSesionDemo();

          if (activo) {
            setSesion(guardada);
          }
        } catch {
          if (activo) {
            setError('No pudimos leer la sesión guardada.');
          }
        } finally {
          if (activo) {
            setCargando(false);
          }
        }
      }

      cargarSesion();

      return () => {
        activo = false;
      };
    }, [intento])
  );

  async function entrar() {
    if (procesando) {
      return;
    }

    setProcesando(true);

    try {
      const nuevaSesion = await iniciarSesionDemo();
      setSesion(nuevaSesion);
    } catch {
      Alert.alert(
        'No pudimos iniciar la sesión',
        'Intentá nuevamente en unos momentos.'
      );
    } finally {
      setProcesando(false);
    }
  }

  async function salir() {
    if (procesando) {
      return;
    }

    setProcesando(true);

    try {
      await cerrarSesionDemo();
      setSesion(null);
    } catch {
      Alert.alert(
        'No pudimos cerrar la sesión',
        'Intentá nuevamente en unos momentos.'
      );
    } finally {
      setProcesando(false);
    }
  }

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator
          size="large"
          color="#14665C"
          accessibilityLabel="Cargando cuenta"
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
      <ScrollView contentContainerStyle={styles.contenido}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTexto}>
            {sesion ? 'D' : 'C'}
          </Text>
        </View>

        <Text style={styles.etiqueta}>TU ESPACIO EN COLÓN</Text>

        <Text style={styles.titulo}>
          {sesion ? '¡Hola, visitante!' : 'Cada paseo, un recuerdo.'}
        </Text>

        <Text style={styles.descripcion}>
          {sesion
            ? 'Tu sesión de demostración está activa en este teléfono.'
            : 'Explorá los lugares y el mapa libremente. Acá vas a poder acceder a tu cuenta.'}
        </Text>

        <View style={styles.tarjeta}>
          <Text style={styles.tituloTarjeta}>
            Versión de demostración
          </Text>

          <Text style={styles.textoTarjeta}>
            Estamos preparando el acceso a la cuenta. Por ahora
            podés probar una sesión local, sin correo ni contraseña.
            No se crea una cuenta real.
          </Text>

          <Text style={styles.textoTarjeta}>
            Tus favoritos siguen guardados en este teléfono.
            Todavía no están asociados a un usuario ni se sincronizan
            con otros dispositivos.
          </Text>
        </View>

        {sesion ? (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/favoritos')}
              style={styles.boton}
            >
              <Text style={styles.textoBoton}>
                ♥ Ver mis favoritos
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={procesando}
              onPress={salir}
              style={[
                styles.botonSecundario,
                procesando && styles.deshabilitado,
              ]}
            >
              <Text style={styles.textoSecundario}>
                {procesando ? 'Cerrando…' : 'Cerrar sesión demo'}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              disabled={procesando}
              onPress={entrar}
              style={[
                styles.boton,
                procesando && styles.deshabilitado,
              ]}
            >
              <Text style={styles.textoBoton}>
                {procesando
                  ? 'Ingresando…'
                  : 'Probar sesión de demostración'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.botonSecundario}
            >
              <Text style={styles.textoSecundario}>
                Seguir explorando
              </Text>
            </Pressable>
          </>
        )}
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
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: '#DCEACD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
  },
  avatarTexto: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#24594B',
  },
  etiqueta: {
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#14665C',
  },
  titulo: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#183B42',
    marginTop: 12,
  },
  descripcion: {
    fontSize: 18,
    lineHeight: 27,
    color: '#586C70',
    marginTop: 16,
  },
  tarjeta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    marginVertical: 28,
    borderWidth: 1,
    borderColor: '#E1E6DE',
  },
  tituloTarjeta: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#183B42',
  },
  textoTarjeta: {
    fontSize: 17,
    lineHeight: 26,
    color: '#586C70',
    marginTop: 12,
  },
  boton: {
    minHeight: 52,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#174F49',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  textoBoton: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  botonSecundario: {
    minHeight: 52,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#849993',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  textoSecundario: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#183B42',
    textAlign: 'center',
  },
  deshabilitado: {
    opacity: 0.6,
  },
});