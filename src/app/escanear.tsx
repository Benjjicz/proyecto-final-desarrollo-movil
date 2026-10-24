import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { elegirFotoDeGaleria, tomarFotoConCamara } from '../servicios/archivos';
import { buscarLugarPorQr, registrarVisitaPorQr } from '../servicios/visitas';
import type { Lugar } from '../tipos/lugar';

export default function EscanearScreen() {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const bloqueado = useRef(false);
  const [enFoco, setEnFoco] = useState(false);
  const [lugar, setLugar] = useState<Lugar | null>(null);
  const [codigo, setCodigo] = useState('');
  const [nota, setNota] = useState('');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useFocusEffect(useCallback(() => { setEnFoco(true); return () => setEnFoco(false); }, []));

  async function escanear(data: string) {
    if (bloqueado.current) return;
    const coincidencia = /^COLON:([a-zA-Z0-9_-]{1,100})$/.exec(data.trim());
    if (!coincidencia) return;

    bloqueado.current = true;
    try {
      const encontrado = await buscarLugarPorQr(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLugar(encontrado);
      setCodigo(data.trim());
    } catch {
      bloqueado.current = false;
    }
  }

  async function guardar() {
    if (!lugar || guardando) return;
    setGuardando(true);
    try {
      await registrarVisitaPorQr(codigo, nota, fotoUri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/recorrido');
    } catch {
      Alert.alert('Error', 'No pudimos registrar la visita.');
      setGuardando(false);
    }
  }

  if (!permiso) return <View style={styles.centrado}><ActivityIndicator size="large" color="#14665C" /></View>;

  if (!permiso.granted) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.titulo}>Escaneá un lugar</Text>
        <Text style={styles.descripcion}>Necesitamos acceso a la cámara para leer el QR del cartel.</Text>
        <Pressable onPress={async () => permiso.canAskAgain ? pedirPermiso() : Linking.openSettings()} style={styles.boton}>
          <Text style={styles.textoBoton}>{permiso.canAskAgain ? 'Permitir cámara' : 'Abrir ajustes'}</Text>
        </Pressable>
      </View>
    );
  }

  if (lugar) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
          <Text style={styles.etiqueta}>LUGAR RECONOCIDO</Text>
          <Text style={styles.titulo}>{lugar.nombre}</Text>
          
          <Text style={styles.label}>Una foto · opcional</Text>
          {fotoUri ? (
            <Image source={{ uri: fotoUri }} style={styles.foto} />
          ) : (
            <View style={styles.filaBotonesFoto}>
              <Pressable onPress={async () => setFotoUri(await tomarFotoConCamara())} style={styles.secundario}>
                <Text style={styles.textoSecundario}>📷 Sacar Foto</Text>
              </Pressable>
              <Pressable onPress={async () => setFotoUri(await elegirFotoDeGaleria())} style={styles.secundario}>
                <Text style={styles.textoSecundario}>🖼️ Galería</Text>
              </Pressable>
            </View>
          )}

          <Text style={styles.label}>Tu nota · opcional</Text>
          <TextInput style={styles.entrada} value={nota} onChangeText={setNota} maxLength={300} multiline placeholder="¿Qué querés recordar?" />

          <Pressable disabled={guardando} onPress={guardar} style={styles.boton}>
            <Text style={styles.textoBoton}>{guardando ? 'Guardando…' : 'Registrar visita'}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <View style={styles.contenido}>
        <Text style={styles.titulo}>Escaneá el QR</Text>
      </View>
      {enFoco && <CameraView style={styles.camara} onBarcodeScanned={({ data }) => escanear(data)} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F2' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#F7F7F2' },
  contenido: { padding: 24 },
  etiqueta: { fontSize: 13, fontWeight: 'bold', letterSpacing: 2, color: '#14665C' },
  titulo: { fontSize: 30, fontWeight: 'bold', color: '#183B42', marginTop: 10, marginBottom: 20 },
  descripcion: { fontSize: 17, textAlign: 'center', color: '#586C70' },
  camara: { flex: 1, marginHorizontal: 20, minHeight: 300, borderRadius: 16, overflow: 'hidden' },
  label: { fontSize: 18, fontWeight: 'bold', color: '#183B42', marginTop: 20, marginBottom: 12 },
  entrada: { minHeight: 120, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#849993', backgroundColor: '#FFF', fontSize: 18, textAlignVertical: 'top' },
  boton: { minHeight: 52, borderRadius: 16, backgroundColor: '#174F49', justifyContent: 'center', alignItems: 'center', marginTop: 22 },
  textoBoton: { fontSize: 17, fontWeight: 'bold', color: '#FFF' },
  secundario: { flex: 0.48, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#849993', alignItems: 'center', backgroundColor: '#FFF' },
  textoSecundario: { fontSize: 16, fontWeight: 'bold', color: '#14665C' },
  filaBotonesFoto: { flexDirection: 'row', justifyContent: 'space-between' },
  foto: { width: '100%', height: 200, borderRadius: 16 }
});