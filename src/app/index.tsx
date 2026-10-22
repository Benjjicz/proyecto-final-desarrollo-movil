import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { obtenerCategorias } from '../servicios/categorias';
import { obtenerLugares } from '../servicios/lugares';
import type { Categoria } from '../tipos/categoria';
import type { Lugar } from '../tipos/lugar';

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

interface PortadaProps {
  imagen: string | null;
  categoria: string;
  esPlaya: boolean;
}

function PortadaLugar({
  imagen,
  categoria,
  esPlaya,
}: PortadaProps) {
  const [falloImagen, setFalloImagen] = useState(false);

  useEffect(() => {
    setFalloImagen(false);
  }, [imagen]);

  if (imagen && !falloImagen) {
    return (
      <Image
        source={{ uri: imagen }}
        style={styles.imagen}
        resizeMode="cover"
        onError={() => setFalloImagen(true)}
        accessible={false}
      />
    );
  }

  return (
    <View
      style={[
        styles.portada,
        esPlaya && styles.portadaPlaya,
      ]}
      accessible={false}
    >
      <View style={styles.circuloPortada} />
      <View style={styles.curvaPortada} />

      <Text style={styles.textoPortada}>{categoria}</Text>
      <Text style={styles.subtextoPortada}>
        COLÓN · ENTRE RÍOS
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] =
    useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;

    async function cargarDatos() {
      setCargando(true);
      setError(null);

      try {
        const [respuestaLugares, respuestaCategorias] =
          await Promise.all([
            obtenerLugares(),
            obtenerCategorias(),
          ]);

        if (activo) {
          setLugares(respuestaLugares.datos);
          setCategorias(respuestaCategorias.datos);
        }
      } catch {
        if (activo) {
          setError('No pudimos cargar los lugares.');
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
  }, [intento]);

  const lugaresFiltrados = lugares.filter((lugar) => {
    const coincideNombre = normalizar(lugar.nombre).includes(
      normalizar(busqueda)
    );

    const coincideCategoria =
      categoriaSeleccionada === null ||
      lugar.categoriaId === categoriaSeleccionada;

    return lugar.activo && coincideNombre && coincideCategoria;
  });

  const hayFiltros =
    busqueda.trim().length > 0 ||
    categoriaSeleccionada !== null;

  function limpiarFiltros() {
    setBusqueda('');
    setCategoriaSeleccionada(null);
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={cargando || error ? [] : lugaresFiltrados}
        keyExtractor={(lugar) => lugar.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.lista}
        ListHeaderComponent={
          <>
            <View style={styles.barraSuperior}>
              <View style={styles.marca}>
                <View style={styles.logo}>
                  <Text style={styles.logoTexto}>C</Text>
                </View>

                <View>
                  <Text style={styles.nombreApp}>Mi Ciudad</Text>
                  <Text style={styles.ubicacion}>Colón, Entre Ríos</Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ver mis favoritos"
                onPress={() => router.push('/favoritos')}
                style={styles.botonFavoritos}
              >
                <Text style={styles.favoritosTexto}>
                  ♥ Favoritos
                </Text>
              </Pressable>
            </View>

            <View style={styles.bienvenida}>
              <Text style={styles.antetitulo}>
                TU PRÓXIMA ESCAPADA
              </Text>

              <Text style={styles.titulo}>
                Colón te espera.
              </Text>

              <Text style={styles.introduccion}>
                Río, naturaleza y momentos para llevarte con vos.
                Descubrí por dónde empezar.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Explorar lugares en el mapa"
              onPress={() => router.push('/mapa')}
              style={({ pressed }) => [
                styles.banner,
                pressed && styles.presionado,
              ]}
            >
              <View
                style={styles.decoracionBanner}
                pointerEvents="none"
              />

              <Text style={styles.bannerEtiqueta}>
                EXPLORÁ A TU RITMO
              </Text>

              <Text style={styles.bannerTitulo}>
                Un lugar nuevo{'\n'}en cada paseo.
              </Text>

              <Text style={styles.bannerDescripcion}>
                Encontrá los lugares en el mapa y elegí tu próxima parada.
              </Text>

              <View style={styles.bannerBoton}>
                <Text style={styles.bannerBotonTexto}>
                  Abrir mapa →
                </Text>
              </View>
            </Pressable>

            <View style={styles.seccion}>
              <Text style={styles.tituloSeccion}>
                ¿Qué querés descubrir?
              </Text>

              <Text style={styles.descripcionSeccion}>
                Buscá un lugar o elegí una categoría.
              </Text>
            </View>

            <TextInput
              style={styles.buscador}
              placeholder="Buscar un lugar..."
              placeholderTextColor="#637477"
              value={busqueda}
              onChangeText={setBusqueda}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Buscar lugares por nombre"
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
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
                    styles.categoriaTexto,
                    categoriaSeleccionada === null &&
                      styles.categoriaTextoActivo,
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
                        styles.categoriaTexto,
                        seleccionada && styles.categoriaTextoActivo,
                      ]}
                    >
                      {categoria.nombre}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.encabezadoResultados}>
              <Text style={styles.tituloResultados}>
                {hayFiltros ? 'Tus resultados' : 'Lugares para conocer'}
              </Text>

              {!cargando && !error && (
                <Text style={styles.contador}>
                  {lugaresFiltrados.length}{' '}
                  {lugaresFiltrados.length === 1 ? 'lugar' : 'lugares'}
                </Text>
              )}
            </View>
          </>
        }
        renderItem={({ item }) => {
          const categoria = categorias.find(
            (elemento) => elemento.id === item.categoriaId
          );

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ver detalle de ${item.nombre}`}
              onPress={() =>
                router.push({
                  pathname: '/lugar/[id]',
                  params: { id: item.id },
                })
              }
              style={({ pressed }) => [
                styles.tarjeta,
                pressed && styles.presionado,
              ]}
            >
              <PortadaLugar
                imagen={item.imagenes[0] ?? null}
                categoria={categoria?.nombre ?? 'Descubrí Colón'}
                esPlaya={item.categoriaId === 'cat-playas'}
              />

              <View style={styles.cuerpoTarjeta}>
                <Text style={styles.etiquetaCategoria}>
                  {categoria?.nombre ?? 'Lugar'}
                </Text>

                <Text style={styles.nombreLugar}>
                  {item.nombre}
                </Text>

                <Text style={styles.descripcionLugar}>
                  {item.descripcionCorta}
                </Text>

                <View style={styles.pieTarjeta}>
                  <Text style={styles.precio}>
                    {item.precioEntrada === null
                      ? 'Consultar entrada'
                      : item.precioEntrada === 0
                        ? 'Entrada gratuita'
                        : `$${item.precioEntrada.toLocaleString('es-AR')}`}
                  </Text>

                  <Text style={styles.verDetalle}>
                    Ver detalle →
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          cargando ? (
            <View style={styles.estado}>
              <ActivityIndicator
                size="large"
                color="#14665C"
                accessibilityLabel="Cargando lugares"
              />
              <Text style={styles.estadoTexto}>
                Preparando tu próxima salida…
              </Text>
            </View>
          ) : error ? (
            <View style={styles.estado}>
              <Text style={styles.estadoTitulo}>{error}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setIntento((valor) => valor + 1)}
                style={styles.botonEstado}
              >
                <Text style={styles.botonEstadoTexto}>
                  Reintentar
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.estado}>
              <Text style={styles.estadoTitulo}>
                {hayFiltros
                  ? 'No encontramos coincidencias'
                  : 'Todavía no hay lugares disponibles'}
              </Text>

              <Text style={styles.estadoTexto}>
                {hayFiltros
                  ? 'Probá con otro nombre o cambiá la categoría.'
                  : 'Volvé a consultar más adelante.'}
              </Text>

              {hayFiltros && (
                <Pressable
                  accessibilityRole="button"
                  onPress={limpiarFiltros}
                  style={styles.botonEstado}
                >
                  <Text style={styles.botonEstadoTexto}>
                    Limpiar filtros
                  </Text>
                </Pressable>
              )}
            </View>
          )
        }
        ListFooterComponent={
          <View style={styles.pie}>
            <Text style={styles.pieTitulo}>
              Mi Ciudad · Colón
            </Text>
            <Text style={styles.pieTexto}>
              Una guía para descubrir, pasear y volver.
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
  lista: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  barraSuperior: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
  },
  marca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#14665C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTexto: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  nombreApp: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#183B42',
  },
  ubicacion: {
    fontSize: 14,
    color: '#586C70',
    marginTop: 2,
  },
  botonFavoritos: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: '#E7EEE8',
    justifyContent: 'center',
  },
  favoritosTexto: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#24544B',
  },
  bienvenida: {
    paddingTop: 18,
    paddingBottom: 24,
  },
  antetitulo: {
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#14665C',
  },
  titulo: {
    fontSize: 38,
    fontWeight: 'bold',
    letterSpacing: -1,
    color: '#183B42',
    marginTop: 10,
  },
  introduccion: {
    fontSize: 18,
    lineHeight: 27,
    color: '#586C70',
    marginTop: 12,
  },
  banner: {
    backgroundColor: '#174F49',
    borderRadius: 26,
    padding: 24,
    overflow: 'hidden',
  },
  decoracionBanner: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#24655C',
    right: -100,
    top: -90,
  },
  bannerEtiqueta: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#D4EBCF',
  },
  bannerTitulo: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
  },
  bannerDescripcion: {
    fontSize: 17,
    lineHeight: 25,
    color: '#E0EDE8',
    marginTop: 12,
  },
  bannerBoton: {
    alignSelf: 'flex-start',
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#E3EFCB',
    borderRadius: 14,
    marginTop: 22,
    justifyContent: 'center',
  },
  bannerBotonTexto: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#183B42',
  },
  seccion: {
    marginTop: 32,
    marginBottom: 18,
  },
  tituloSeccion: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#183B42',
  },
  descripcionSeccion: {
    fontSize: 16,
    color: '#586C70',
    marginTop: 8,
  },
  buscador: {
    minHeight: 56,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#849993',
    borderRadius: 17,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 18,
    color: '#183B42',
  },
  scrollCategorias: {
    marginTop: 16,
    marginBottom: 24,
  },
  categorias: {
    gap: 10,
    paddingVertical: 2,
  },
  categoria: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD7D0',
    justifyContent: 'center',
  },
  categoriaActiva: {
    backgroundColor: '#183B42',
    borderColor: '#183B42',
  },
  categoriaTexto: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#385354',
  },
  categoriaTextoActivo: {
    color: '#FFFFFF',
  },
  encabezadoResultados: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 18,
  },
  tituloResultados: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#183B42',
  },
  contador: {
    fontSize: 15,
    color: '#586C70',
  },
  tarjeta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E1E6DE',
    marginBottom: 20,
  },
  presionado: {
    opacity: 0.85,
  },
  imagen: {
    width: '100%',
    height: 180,
  },
  portada: {
    minHeight: 160,
    backgroundColor: '#DCEACD',
    padding: 24,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  portadaPlaya: {
    backgroundColor: '#CFE8EC',
  },
  circuloPortada: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F6EDC9',
    top: -35,
    right: 25,
  },
  curvaPortada: {
    position: 'absolute',
    width: 300,
    height: 150,
    borderRadius: 100,
    backgroundColor: '#B6D3C9',
    right: -150,
    bottom: -70,
  },
  textoPortada: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#234F4C',
  },
  subtextoPortada: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#385954',
    marginTop: 8,
  },
  cuerpoTarjeta: {
    padding: 20,
  },
  etiquetaCategoria: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#14665C',
    marginBottom: 8,
  },
  nombreLugar: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#183B42',
  },
  descripcionLugar: {
    fontSize: 17,
    lineHeight: 25,
    color: '#586C70',
    marginTop: 10,
  },
  pieTarjeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8ECE5',
    paddingTop: 16,
    marginTop: 18,
  },
  precio: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#24594B',
  },
  verDetalle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#183B42',
  },
  estado: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  estadoTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#183B42',
    textAlign: 'center',
  },
  estadoTexto: {
    fontSize: 17,
    lineHeight: 25,
    color: '#586C70',
    textAlign: 'center',
    marginTop: 12,
  },
  botonEstado: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#183B42',
    marginTop: 18,
  },
  botonEstadoTexto: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  pie: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 12,
  },
  pieTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#385354',
  },
  pieTexto: {
    fontSize: 14,
    color: '#586C70',
    textAlign: 'center',
    marginTop: 6,
  },
});