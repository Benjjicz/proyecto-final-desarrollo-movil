import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LUGARES_CATALOGO } from '../../servicios/visitas';
import { OrigenVisita } from '../../tipos/visita';

export default function PantallaRegistrarVisita() {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [modo, setModo] = useState<OrigenVisita | null>(null);
  const [enFoco, setEnFoco] = useState(false);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);

  const [escribiendoOtro, setEscribiendoOtro] = useState(false);
  const [lugarCustom, setLugarCustom] = useState('');

  const cerrojo = useRef(false);

  // Apaga la cámara automáticamente cuando la pantalla pierde el foco
  useFocusEffect(
    useCallback(() => {
      setEnFoco(true);
      cerrojo.current = false;
      return () => {
        setEnFoco(false);
      };
    }, [])
  );

  const irADetalle = (idLugar: string, origen: OrigenVisita) => {
    if (cerrojo.current) return;
    cerrojo.current = true;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    router.replace({
      pathname: '/recorrido/detalle',
      params: { lugarId: idLugar, origen: origen },
    });
  };

  const habilitarCamara = async () => {
    try {
      if (permiso?.canAskAgain === false) {
        await Linking.openSettings();
      } else {
        await pedirPermiso();
      }
    } catch {
      Alert.alert(
        'No pudimos abrir los permisos',
        'Revisá el permiso de cámara desde los ajustes del teléfono.'
      );
    }
  };

  const procesarEscaneoQR = (resultado: { data: string }) => {
    if (cerrojo.current) return;
    try {
      const codigo = resultado.data.trim();
      // Validación con Regex como hizo tu compañero, pero fallando en silencio sin romper la cámara
      const coincidencia = /^COLON:([a-zA-Z0-9_-]{1,100})$/.exec(codigo);
      if (!coincidencia) {
        return; // Falla silenciosamente si es un QR ajeno o roto
      }

      const idLugar = coincidencia[1];
      irADetalle(idLugar, 'qr');
    } catch (error) {
      console.error('Error al procesar QR', error);
    }
  };

  const simularGPS = () => {
    irADetalle('lug-004', 'gps');
  };

  const registrarLugarPersonalizado = () => {
    if (lugarCustom.trim().length === 0) {
      Alert.alert('Falta el nombre', 'Escribí el nombre del lugar que visitaste.');
      return;
    }
    irADetalle(`custom-${lugarCustom.trim()}`, 'manual');
  };

  // --- MODO ESCANEAR QR ---
  if (modo === 'qr') {
    if (!permiso) {
      return (
        <View style={styles.contenedorCentro}>
          <ActivityIndicator size="large" color="#000" accessibilityLabel="Consultando permiso de cámara" />
        </View>
      );
    }

    if (!permiso.granted) {
      return (
        <View style={styles.contenedorCentro}>
          <Text style={styles.tituloMenu}>Permiso de Cámara</Text>
          <Text style={styles.textoMensaje}>
            Necesitamos acceso a la cámara para leer el código QR del cartel turístico. Si preferís no activarla, podés usar el registro manual.
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            style={styles.botonPrincipal}
            onPress={habilitarCamara}
          >
            <Text style={styles.textoBoton}>
              {permiso.canAskAgain ? 'Otorgar Permiso' : 'Abrir Ajustes del Teléfono'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            style={styles.botonSecundario}
            onPress={() => setModo('manual')}
          >
            <Text style={styles.textoBoton}>Ir a Registro Manual</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.contenedor}>
        <Text style={styles.texto}>Escaneá el código QR del lugar</Text>
        <Text style={styles.subtexto}>Apuntá al cartel oficial (formato COLON:id)</Text>

        {errorCamara ? (
          <View style={styles.contenedorCentro}>
            <Text style={styles.textoMensaje}>{errorCamara}</Text>
          </View>
        ) : (
          enFoco && (
            <CameraView
              style={styles.camara}
              facing="back"
              onBarcodeScanned={procesarEscaneoQR}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onMountError={() => setErrorCamara('No pudimos iniciar la cámara.')}
            />
          )
        )}

        <TouchableOpacity
          accessibilityRole="button"
          style={styles.botonSecundario}
          onPress={() => setModo(null)}
        >
          <Text style={styles.textoBoton}>Cancelar y Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- MODO MANUAL ---
  if (modo === 'manual') {
    if (escribiendoOtro) {
      return (
        <View style={styles.contenedorCentro}>
          <Text style={styles.tituloMenu}>¿Qué lugar visitaste?</Text>
          <TextInput
            accessibilityLabel="Nombre del lugar visitado"
            style={styles.inputCustom}
            placeholder="Ej: Heladería El Sol"
            placeholderTextColor="#666"
            value={lugarCustom}
            onChangeText={setLugarCustom}
            maxLength={80}
            autoFocus
          />
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.botonPrincipal}
            onPress={registrarLugarPersonalizado}
          >
            <Text style={styles.textoBoton}>Continuar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.botonSecundario}
            onPress={() => setEscribiendoOtro(false)}
          >
            <Text style={styles.textoBoton}>Volver a la lista</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.contenedor}>
        <Text style={styles.texto}>Elegí el lugar de la lista</Text>

        <FlatList
          data={LUGARES_CATALOGO}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.botonLista}
              onPress={() => irADetalle(item.id, 'manual')}
            >
              <Text style={styles.textoBotonLista}>{item.nombre}</Text>
              <Text style={styles.direccionLista}>{item.direccion}</Text>
            </TouchableOpacity>
          )}
          ListFooterComponent={
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.botonOtro}
              onPress={() => setEscribiendoOtro(true)}
            >
              <Text style={styles.textoBotonOtro}>+ Agregar otro lugar no listado</Text>
            </TouchableOpacity>
          }
        />

        <TouchableOpacity
          accessibilityRole="button"
          style={styles.botonSecundario}
          onPress={() => setModo(null)}
        >
          <Text style={styles.textoBoton}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- MENÚ PRINCIPAL DE LOS 3 CAMINOS ---
  return (
    <View style={styles.contenedorCentro}>
      <Text style={styles.tituloMenu}>¿Cómo querés registrar tu visita?</Text>

      <TouchableOpacity
        accessibilityRole="button"
        style={styles.botonPrincipal}
        onPress={() => setModo('qr')}
      >
        <Text style={styles.textoBoton}>📷 Escanear código QR</Text>
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityRole="button"
        style={styles.botonPrincipal}
        onPress={simularGPS}
      >
        <Text style={styles.textoBoton}>📍 Estoy acá (Usar GPS)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityRole="button"
        style={styles.botonPrincipal}
        onPress={() => setModo('manual')}
      >
        <Text style={styles.textoBoton}>✍️ Buscar en la lista (Manual)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityRole="button"
        style={styles.botonSecundario}
        onPress={() => router.back()}
      >
        <Text style={styles.textoBoton}>Volver a Mi Recorrido</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#fff' },
  contenedorCentro: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  tituloMenu: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center', color: '#000' },
  textoMensaje: { textAlign: 'center', fontSize: 18, marginBottom: 25, color: '#222', lineHeight: 26 },
  texto: { fontSize: 24, paddingTop: 20, paddingHorizontal: 20, textAlign: 'center', color: '#000', fontWeight: 'bold' },
  subtexto: { fontSize: 16, paddingBottom: 15, textAlign: 'center', color: '#444' },
  camara: { flex: 1, marginHorizontal: 15, borderRadius: 12, overflow: 'hidden' },
  botonPrincipal: { backgroundColor: '#000', padding: 22, borderRadius: 10, marginBottom: 18 },
  botonSecundario: { backgroundColor: '#444', padding: 18, marginVertical: 10, borderRadius: 10 },
  textoBoton: { color: '#FFF', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  botonLista: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  textoBotonLista: { fontSize: 22, color: '#000', fontWeight: 'bold' },
  direccionLista: { fontSize: 16, color: '#555', marginTop: 4 },
  botonOtro: { padding: 22, backgroundColor: '#f0f0f0', borderBottomWidth: 1, borderBottomColor: '#ccc' },
  textoBotonOtro: { fontSize: 20, color: '#000', fontWeight: 'bold' },
  inputCustom: { fontSize: 22, borderColor: '#000', borderWidth: 2, borderRadius: 8, padding: 18, marginBottom: 25, color: '#000' },
});