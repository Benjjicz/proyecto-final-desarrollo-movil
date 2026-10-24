import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { elegirFotoDeGaleria, tomarFotoConCamara } from '../../servicios/archivos';
import { obtenerLugarPorId } from '../../servicios/lugares';
import { registrarVisitaManual, registrarVisitaPorGps } from '../../servicios/visitas';
import type { Lugar } from '../../tipos/lugar';

export default function RegistrarVisitaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ocupadoRef = useRef(false);

  const [lugar, setLugar] = useState<Lugar | null>(null);
  const [nota, setNota] = useState('');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [usarGps, setUsarGps] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    async function cargarLugar() {
      if (id) {
        const respuesta = await obtenerLugarPorId(id);
        setLugar(respuesta.datos);
      }
      setCargando(false);
    }
    cargarLugar();
  }, [id]);

  async function guardarVisita() {
    if (!lugar || guardando) return;
    setGuardando(true);
    try {
      const entrada = { lugarId: lugar.id, nota, fotoUri };
      if (usarGps) {
        await registrarVisitaPorGps(entrada);
      } else {
        await registrarVisitaManual(entrada);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/recorrido');
    } catch (problema) {
      Alert.alert('No pudimos guardar', problema instanceof Error ? problema.message : 'Error');
      setGuardando(false);
    }
  }

  if (cargando) return <View style={styles.centrado}><ActivityIndicator size="large" color="#14665C" /></View>;

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
          <Text style={styles.etiqueta}>MI RECORRIDO</Text>
          <Text style={styles.titulo}>Guardá este momento.</Text>

          <View style={styles.tarjeta}><Text style={styles.nombreLugar}>{lugar?.nombre}</Text></View>

          <View style={styles.opcionGps}>
            <Text style={styles.tituloGps}>Verificar cercanía por GPS</Text>
            <Switch value={usarGps} onValueChange={setUsarGps} trackColor={{ false: '#849993', true: '#14665C' }} />
          </View>

          <Text style={styles.label}>Una foto · opcional</Text>
          {fotoUri ? (
            <View>
              <Image source={{ uri: fotoUri }} style={styles.foto} />
              <Pressable onPress={() => setFotoUri(null)} style={styles.quitarFoto}><Text style={styles.textoQuitar}>Quitar foto</Text></Pressable>
            </View>
          ) : (
            <View style={styles.accionesFoto}>
              <Pressable onPress={async () => setFotoUri(await tomarFotoConCamara())} style={styles.botonSecundario}><Text style={styles.textoSecundario}>Sacar Foto</Text></Pressable>
              <Pressable onPress={async () => setFotoUri(await elegirFotoDeGaleria())} style={styles.botonSecundario}><Text style={styles.textoSecundario}>Galería</Text></Pressable>
            </View>
          )}

          <Text style={[styles.label, styles.separacion]}>Tu nota · opcional</Text>
          <TextInput style={styles.entrada} value={nota} onChangeText={setNota} placeholder="¿Qué te gustó?" multiline maxLength={300} editable={!guardando} />
          <Text style={styles.contador}>{nota.length}/300</Text>

          <Pressable disabled={guardando} onPress={guardarVisita} style={styles.boton}>
            <Text style={styles.textoBoton}>{guardando ? 'Guardando…' : 'Guardar visita'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F2' },
  contenido: { padding: 24, paddingBottom: 40 },
  centrado: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F7F2' },
  etiqueta: { fontSize: 13, letterSpacing: 2, fontWeight: 'bold', color: '#14665C' },
  titulo: { fontSize: 32, fontWeight: 'bold', color: '#183B42', marginTop: 12 },
  tarjeta: { padding: 22, borderRadius: 20, backgroundColor: '#E7EEE8', marginVertical: 20 },
  nombreLugar: { fontSize: 22, fontWeight: 'bold', color: '#183B42' },
  opcionGps: { padding: 18, borderRadius: 18, borderWidth: 1, borderColor: '#CBD7D0', marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between' },
  tituloGps: { fontSize: 18, fontWeight: 'bold', color: '#183B42' },
  label: { fontSize: 18, fontWeight: 'bold', color: '#183B42', marginBottom: 12 },
  separacion: { marginTop: 20 },
  foto: { width: '100%', aspectRatio: 4 / 3, borderRadius: 18, backgroundColor: '#E7EEE8' },
  accionesFoto: { flexDirection: 'row', justifyContent: 'space-between' },
  botonSecundario: { flex: 0.48, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: '#849993', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  textoSecundario: { fontSize: 16, fontWeight: 'bold', color: '#183B42' },
  quitarFoto: { minHeight: 40, justifyContent: 'center', marginTop: 5 },
  textoQuitar: { fontSize: 16, color: '#A32020', fontWeight: 'bold' },
  entrada: { minHeight: 120, borderWidth: 1, borderColor: '#849993', borderRadius: 16, padding: 16, backgroundColor: '#FFFFFF', fontSize: 18, textAlignVertical: 'top' },
  contador: { fontSize: 14, color: '#586C70', textAlign: 'right', marginTop: 8 },
  boton: { minHeight: 52, borderRadius: 16, backgroundColor: '#174F49', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  textoBoton: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' }
});