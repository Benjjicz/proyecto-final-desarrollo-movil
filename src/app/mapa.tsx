import { useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import * as Location from 'expo-location';
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
import { WebView } from 'react-native-webview';

import { obtenerCategorias } from '../servicios/categorias';
import { obtenerLugares } from '../servicios/lugares';
import type { Categoria } from '../tipos/categoria';
import type { Lugar } from '../tipos/lugar';
import {
  calcularDistanciaMetros,
  mostrarDistancia,
} from '../utilidades/distancias';

export default function MapaScreen() {
  const webview = useRef<WebView>(null);
  const buscandoRef = useRef(false);

  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] =
    useState<string | null>(null);
  const [ubicacion, setUbicacion] =
    useState<Location.LocationObject | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapaListo, setMapaListo] = useState(false);
  const [avisoMapa, setAvisoMapa] = useState<string | null>(null);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);

  useEffect(() => {
    let activo = true;

    async function cargarDatos() {
      try {
        const [respuestaLugares, respuestaCategorias] =
          await Promise.all([
            obtenerLugares(),
            obtenerCategorias(),
          ]);

        if (activo) {
          setLugares(
            respuestaLugares.datos.filter((lugar) => lugar.activo)
          );
          setCategorias(respuestaCategorias.datos);
        }
      } catch {
        if (activo) {
          setError('No pudimos cargar los datos del mapa.');
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarDatos();

    return () => {
      activo = false;
    };
  }, []);

  const lugaresConDistancia = useMemo(
    () =>
      lugares.map((lugar) => ({
        lugar,
        distancia: ubicacion
          ? calcularDistanciaMetros(
              {
                latitud: ubicacion.coords.latitude,
                longitud: ubicacion.coords.longitude,
              },
              lugar.coordenadas
            )
          : null,
      })),
    [lugares, ubicacion]
  );

  const lugaresVisibles = useMemo(() => {
    const filas = lugaresConDistancia.filter(
      ({ lugar }) =>
        categoriaSeleccionada === null ||
        lugar.categoriaId === categoriaSeleccionada
    );

    if (ubicacion) {
      filas.sort(
        (a, b) => (a.distancia ?? 0) - (b.distancia ?? 0)
      );
    }

    return filas;
  }, [lugaresConDistancia, categoriaSeleccionada, ubicacion]);

  const html = useMemo(() => {
    const datos = JSON.stringify(
      lugares.map((lugar) => ({
        id: lugar.id,
        nombre: lugar.nombre,
        categoriaId: lugar.categoriaId,
        latitud: lugar.coordenadas.latitud,
        longitud: lugar.coordenadas.longitud,
      }))
    ).replace(/</g, '\\u003c');

    return `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />

          <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          />

          <style>
            html, body, #mapa {
              height: 100%;
              width: 100%;
              margin: 0;
              padding: 0;
            }

            body {
              font-family: sans-serif;
            }

            .nombre {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 8px;
            }

            .distancia {
              font-size: 16px;
              color: #385354;
              margin-bottom: 12px;
            }

            .detalle {
              min-height: 48px;
              padding: 12px 16px;
              border: none;
              border-radius: 8px;
              background: #174F49;
              color: white;
              font-size: 16px;
            }
          </style>
        </head>

        <body>
          <div id="mapa"></div>

          <script>
            function avisar(tipo, datos) {
              window.ReactNativeWebView.postMessage(
                JSON.stringify({ tipo: tipo, ...datos })
              );
            }

            window.onerror = function () {
              avisar('error', {
                mensaje: 'No pudimos iniciar el mapa.'
              });
            };
          </script>

          <script
            src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
            onerror="avisar('error', {
              mensaje: 'No pudimos descargar el mapa. Revisá tu conexión.'
            })"
          ></script>

          <script>
            const lugares = ${datos};

            const mapa = L.map('mapa').setView(
              [-32.218, -58.142],
              14
            );

            let puntoUsuario = null;
            let circuloPrecision = null;
            let categoriaActual = null;

            const textosDistancia = new Map();
            const marcadores = [];

            const teselas = L.tileLayer(
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              {
                maxZoom: 19,
                attribution:
                  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              }
            ).addTo(mapa);

            teselas.on('tileerror', function () {
              avisar('aviso', {
                mensaje: 'Algunas imágenes del mapa no se pudieron cargar.'
              });
            });

            lugares.forEach(function (lugar) {
              const coordenadas = [
                lugar.latitud,
                lugar.longitud
              ];

              const contenido = document.createElement('div');

              const nombre = document.createElement('div');
              nombre.className = 'nombre';
              nombre.textContent = lugar.nombre;

              const distancia = document.createElement('div');
              distancia.className = 'distancia';
              distancia.textContent =
                'Consultá tu ubicación para ver la distancia.';

              textosDistancia.set(lugar.id, distancia);

              const boton = document.createElement('button');
              boton.className = 'detalle';
              boton.textContent = 'Ver detalle';

              boton.addEventListener('click', function () {
                avisar('detalle', { id: lugar.id });
              });

              contenido.appendChild(nombre);
              contenido.appendChild(distancia);
              contenido.appendChild(boton);

              const marcador = L.marker(coordenadas)
                .addTo(mapa)
                .bindPopup(contenido);

              marcadores.push({
                categoriaId: lugar.categoriaId,
                coordenadas: coordenadas,
                marcador: marcador
              });
            });

            window.verLugares = function () {
              const puntos = marcadores
                .filter(function (elemento) {
                  return categoriaActual === null ||
                    elemento.categoriaId === categoriaActual;
                })
                .map(function (elemento) {
                  return elemento.coordenadas;
                });

              if (puntos.length > 0) {
                mapa.fitBounds(puntos, {
                  padding: [35, 35],
                  maxZoom: 15
                });
              } else {
                mapa.setView([-32.218, -58.142], 14);
              }
            };

            window.filtrarCategoria = function (categoriaId) {
              categoriaActual = categoriaId;
              mapa.closePopup();

              marcadores.forEach(function (elemento) {
                const visible =
                  categoriaId === null ||
                  elemento.categoriaId === categoriaId;

                if (visible) {
                  if (!mapa.hasLayer(elemento.marcador)) {
                    elemento.marcador.addTo(mapa);
                  }
                } else {
                  mapa.removeLayer(elemento.marcador);
                }
              });

              window.verLugares();
            };

            window.mostrarUbicacion = function (
              latitud,
              longitud,
              precision,
              distancias
            ) {
              const posicion = [latitud, longitud];

              if (puntoUsuario) {
                puntoUsuario.setLatLng(posicion);
              } else {
                puntoUsuario = L.circleMarker(posicion, {
                  radius: 9,
                  color: '#FFFFFF',
                  weight: 3,
                  fillColor: '#1769D2',
                  fillOpacity: 1
                })
                  .addTo(mapa)
                  .bindPopup('Tu ubicación al consultar');
              }

              if (circuloPrecision) {
                mapa.removeLayer(circuloPrecision);
                circuloPrecision = null;
              }

              if (typeof precision === 'number' && precision > 0) {
                circuloPrecision = L.circle(posicion, {
                  radius: precision,
                  color: '#1769D2',
                  weight: 1,
                  fillOpacity: 0.1
                }).addTo(mapa);
              }

              distancias.forEach(function (dato) {
                const texto = textosDistancia.get(dato.id);

                if (texto) {
                  texto.textContent =
                    dato.texto + ' en línea recta';
                }
              });

              mapa.setView(posicion, 15);
            };

            window.verLugares();

            setTimeout(function () {
              mapa.invalidateSize();
              avisar('listo', {});
            }, 200);
          </script>
        </body>
      </html>
    `;
  }, [lugares]);

  const fuenteMapa = useMemo(() => ({ html }), [html]);

  useEffect(() => {
    if (!mapaListo) {
      return;
    }

    const categoria = JSON.stringify(categoriaSeleccionada);

    webview.current?.injectJavaScript(`
      if (window.filtrarCategoria) {
        window.filtrarCategoria(${categoria});
      }
      true;
    `);
  }, [categoriaSeleccionada, mapaListo]);

  useEffect(() => {
    if (!ubicacion || !mapaListo) {
      return;
    }

    const argumentos = JSON.stringify([
      ubicacion.coords.latitude,
      ubicacion.coords.longitude,
      ubicacion.coords.accuracy,
      lugaresConDistancia.map((fila) => ({
        id: fila.lugar.id,
        texto: mostrarDistancia(fila.distancia ?? 0),
      })),
    ]);

    webview.current?.injectJavaScript(`
      if (window.mostrarUbicacion) {
        window.mostrarUbicacion(...${argumentos});
      }
      true;
    `);
  }, [ubicacion, mapaListo, lugaresConDistancia]);

  async function mostrarMiUbicacion() {
    if (buscandoRef.current) {
      return;
    }

    buscandoRef.current = true;
    setBuscandoUbicacion(true);

    try {
      const permiso =
        await Location.requestForegroundPermissionsAsync();

      if (!permiso.granted) {
        Alert.alert(
          'Ubicación no habilitada',
          'Podés seguir viendo y filtrando los lugares. Para mostrar distancias, permití la ubicación desde los ajustes de Expo Go.'
        );
        return;
      }

      const serviciosActivos =
        await Location.hasServicesEnabledAsync();

      if (!serviciosActivos) {
        Alert.alert(
          'Activá la ubicación',
          'La ubicación del teléfono está apagada.'
        );
        return;
      }

      const posicion = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUbicacion(posicion);
    } catch {
      Alert.alert(
        'No pudimos obtener tu ubicación',
        'Probá nuevamente. El listado de lugares sigue disponible.'
      );
    } finally {
      buscandoRef.current = false;
      setBuscandoUbicacion(false);
    }
  }

  function mostrarLugares() {
    webview.current?.injectJavaScript(`
      if (window.verLugares) {
        window.verLugares();
      }
      true;
    `);
  }

  function abrirDetalle(id: string) {
    router.push({
      pathname: '/lugar/[id]',
      params: { id },
    });
  }

  function recibirMensaje(texto: string) {
    try {
      const mensaje: unknown = JSON.parse(texto);

      if (
        typeof mensaje !== 'object' ||
        mensaje === null ||
        !('tipo' in mensaje)
      ) {
        return;
      }

      if (mensaje.tipo === 'listo') {
        setMapaListo(true);
        return;
      }

      if (
        mensaje.tipo === 'aviso' &&
        'mensaje' in mensaje &&
        typeof mensaje.mensaje === 'string'
      ) {
        setAvisoMapa(mensaje.mensaje);
        return;
      }

      if (mensaje.tipo === 'error') {
        setError(
          'mensaje' in mensaje &&
            typeof mensaje.mensaje === 'string'
            ? mensaje.mensaje
            : 'No pudimos cargar el mapa.'
        );
        return;
      }

      if (
        mensaje.tipo === 'detalle' &&
        'id' in mensaje &&
        typeof mensaje.id === 'string'
      ) {
        const lugar = lugares.find(
          (elemento) => elemento.id === mensaje.id
        );

        if (lugar) {
          abrirDetalle(lugar.id);
        }
      }
    } catch {
      // Ignoramos mensajes con un formato inesperado.
    }
  }

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator
          size="large"
          color="#14665C"
          accessibilityLabel="Cargando lugares y categorías"
        />
      </View>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <View style={styles.encabezado}>
        <View style={styles.acciones}>
          <Pressable
            accessibilityRole="button"
            disabled={buscandoUbicacion}
            onPress={mostrarMiUbicacion}
            style={[
              styles.boton,
              buscandoUbicacion && styles.deshabilitado,
            ]}
          >
            <Text style={styles.textoBoton}>
              {buscandoUbicacion ? 'Buscando…' : 'Mi ubicación'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={!mapaListo || error !== null}
            onPress={mostrarLugares}
            style={[
              styles.boton,
              (!mapaListo || error !== null) &&
                styles.deshabilitado,
            ]}
          >
            <Text style={styles.textoBoton}>Ver lugares</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categorias}
          style={styles.scrollCategorias}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              selected: categoriaSeleccionada === null,
            }}
            onPress={() => setCategoriaSeleccionada(null)}
            style={[
              styles.categoria,
              categoriaSeleccionada === null &&
                styles.categoriaActiva,
            ]}
          >
            <Text
              style={[
                styles.textoCategoria,
                categoriaSeleccionada === null &&
                  styles.textoCategoriaActivo,
              ]}
            >
              Todas
            </Text>
          </Pressable>

          {categorias.map((categoria) => {
            const seleccionada =
              categoriaSeleccionada === categoria.id;

            return (
              <Pressable
                key={categoria.id}
                accessibilityRole="button"
                accessibilityState={{ selected: seleccionada }}
                onPress={() =>
                  setCategoriaSeleccionada(categoria.id)
                }
                style={[
                  styles.categoria,
                  seleccionada && styles.categoriaActiva,
                ]}
              >
                <Text
                  style={[
                    styles.textoCategoria,
                    seleccionada && styles.textoCategoriaActivo,
                  ]}
                >
                  {categoria.nombre}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.aviso}>
          {ubicacion
            ? 'Distancias aproximadas en línea recta. Tocá Mi ubicación para actualizarlas.'
            : 'Consultá tu ubicación para ordenar los lugares por distancia.'}
        </Text>

        {avisoMapa && (
          <Text style={styles.advertencia}>{avisoMapa}</Text>
        )}
      </View>

      {error ? (
        <View style={styles.centrado}>
          <Text style={styles.advertencia}>{error}</Text>
          <Text style={styles.aviso}>
            Para reintentar, volvé atrás y entrá nuevamente.
          </Text>
        </View>
      ) : (
        <WebView
          ref={webview}
          style={styles.mapa}
          originWhitelist={['*']}
          source={fuenteMapa}
          javaScriptEnabled
          applicationNameForUserAgent="MiCiudadTP/1.0"
          onLoadStart={() => setMapaListo(false)}
          onMessage={(evento) =>
            recibirMensaje(evento.nativeEvent.data)
          }
          onError={() =>
            setError('No pudimos abrir el mapa.')
          }
        />
      )}

      <View style={styles.listaContenedor}>
        <Text style={styles.tituloLista}>
          {ubicacion ? 'Lugares por distancia' : 'Lugares para explorar'}
        </Text>

        <Text style={styles.contador}>
          {lugaresVisibles.length}{' '}
          {lugaresVisibles.length === 1
            ? 'lugar en esta selección'
            : 'lugares en esta selección'}
        </Text>

        <ScrollView>
          {lugaresVisibles.length === 0 && (
            <Text style={styles.aviso}>
              No hay lugares disponibles en esta categoría.
            </Text>
          )}

          {lugaresVisibles.map(({ lugar, distancia }) => (
            <Pressable
              key={lugar.id}
              accessibilityRole="button"
              accessibilityLabel={`Ver detalle de ${lugar.nombre}`}
              onPress={() => abrirDetalle(lugar.id)}
              style={styles.fila}
            >
              <View style={styles.textosFila}>
                <Text style={styles.nombre}>{lugar.nombre}</Text>
                <Text style={styles.descripcion}>
                  {lugar.descripcionCorta}
                </Text>
              </View>

              <Text style={styles.distancia}>
                {distancia === null
                  ? 'Ver →'
                  : mostrarDistancia(distancia)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
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
  },
  encabezado: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  acciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  boton: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#174F49',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBoton: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  deshabilitado: {
    opacity: 0.5,
  },
  scrollCategorias: {
    marginTop: 14,
  },
  categorias: {
    gap: 8,
    paddingVertical: 2,
  },
  categoria: {
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#CBD7D0',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  categoriaActiva: {
    backgroundColor: '#183B42',
    borderColor: '#183B42',
  },
  textoCategoria: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#385354',
  },
  textoCategoriaActivo: {
    color: '#FFFFFF',
  },
  aviso: {
    fontSize: 15,
    lineHeight: 22,
    color: '#586C70',
    marginTop: 10,
  },
  advertencia: {
    fontSize: 16,
    color: '#8A431B',
    marginTop: 10,
  },
  mapa: {
    flex: 1,
    backgroundColor: '#E6EDF3',
  },
  listaContenedor: {
    maxHeight: 230,
    paddingHorizontal: 18,
    paddingTop: 14,
    backgroundColor: '#FFFFFF',
  },
  tituloLista: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#183B42',
  },
  contador: {
    fontSize: 14,
    color: '#586C70',
    marginTop: 5,
    marginBottom: 8,
  },
  fila: {
    minHeight: 64,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E6DE',
  },
  textosFila: {
    flex: 1,
    minWidth: 150,
  },
  nombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#183B42',
  },
  descripcion: {
    fontSize: 15,
    color: '#586C70',
    marginTop: 5,
  },
  distancia: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#14665C',
  },
});