import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API_BASE_URL, cerrarSesionAPI, iniciarSesionAPI, obtenerTokenApi, reingresoBiometrico } from '../servicios/sesion';
import { intentarSincronizar, limpiarVisitasLocales } from '../servicios/visitas';

export default function PantallaCuenta() {
  const [cargando, setCargando] = useState(true);
  const [estaLogueado, setEstaLogueado] = useState(false);

  // Estados del formulario
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [procesando, setProcesando] = useState(false);

  // Al abrir la pestaña, verificamos sesión y pedimos huella
  useEffect(() => {
    verificarSesion();
  }, []);

  const verificarSesion = async () => {
    // 1. Pedimos huella/rostro o PIN si hay un token guardado
    const pasoBiometria = await reingresoBiometrico(); 
    
    if (pasoBiometria) {
      // 2. Si pasó la biometría, validamos que el token no haya expirado (Error 401)
      const token = await obtenerTokenApi();
      try {
        const respuesta = await fetch(`${API_BASE_URL}/yo/visitas`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` }
        });

        if (respuesta.status === 401) {
          // ¡EL TOKEN MURIÓ O FUE REVOCADO! 
          await cerrarSesionAPI();
          limpiarVisitasLocales();
          setEstaLogueado(false);
          Alert.alert('Sesión expirada', 'Tu sesión caducó por seguridad. Volvé a ingresar.');
        } else {
          // Token válido y vigente
          setEstaLogueado(true);
        }
      } catch (error) {
        // Si el fetch falla porque no hay internet (Offline), lo dejamos entrar igual
        setEstaLogueado(true);
      }
    } else {
      // No pasó la biometría o directamente no había token guardado
      setEstaLogueado(false);
    }
    
    setCargando(false);
  };

  const manejarIngreso = async () => {
    if (!email.trim() || !contrasena.trim()) {
      Alert.alert('Datos incompletos', 'Ingresá tu email y contraseña.');
      return;
    }

    setProcesando(true);
    try {
      await iniciarSesionAPI(email.trim(), contrasena);
      
      // Descargamos los datos de la nube automáticamente
      await intentarSincronizar(); 
      
      setEstaLogueado(true);
      Alert.alert('¡Bienvenido!', 'Iniciaste sesión correctamente.');
    } catch (error: any) {
      Alert.alert('Error al ingresar', error.message);
    } finally {
      setProcesando(false);
    }
  };

  const manejarCierreSesion = async () => {
    Alert.alert('Cerrar sesión', '¿Seguro que querés salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Salir', 
        style: 'destructive', 
        onPress: async () => {
          await cerrarSesionAPI();
          limpiarVisitasLocales(); // Limpia la base de datos de SQLite
          setEstaLogueado(false);
          setEmail('');
          setContrasena('');
        }
      }
    ]);
  };

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#174F49" />
      </View>
    );
  }

  // --- VISTA: USUARIO LOGUEADO ---
  if (estaLogueado) {
    return (
      <View style={styles.contenedor}>
        <Stack.Screen options={{ title: 'Mi Cuenta' }} />
        <View style={styles.tarjetaPerfil}>
          <Text style={styles.titulo}>¡Hola!</Text>
          <Text style={styles.descripcion}>Tu sesión está activa y tus visitas se sincronizarán automáticamente con la nube.</Text>
          
          <TouchableOpacity style={[styles.boton, styles.botonPeligro]} onPress={manejarCierreSesion}>
            <Text style={styles.textoBoton}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- VISTA: FORMULARIO DE LOGIN ---
  return (
    <KeyboardAvoidingView 
      style={styles.contenedor} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen options={{ title: 'Ingresar' }} />
      
      <View style={styles.formulario}>
        <Text style={styles.titulo}>Iniciar sesión</Text>
        <Text style={styles.descripcion}>Ingresá para guardar tus recorridos.</Text>

        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput 
          style={styles.input} 
          placeholder="ejemplo@mail.com" 
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Tu contraseña" 
          value={contrasena}
          onChangeText={setContrasena}
          secureTextEntry
        />

        <TouchableOpacity 
          style={styles.boton} 
          onPress={manejarIngreso}
          disabled={procesando}
        >
          {procesando ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.textoBoton}>Ingresar</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#F7F7F2', padding: 24, justifyContent: 'center' },
  centrado: { flex: 1, backgroundColor: '#F7F7F2', justifyContent: 'center', alignItems: 'center' },
  formulario: { backgroundColor: '#FFF', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8E4' },
  tarjetaPerfil: { backgroundColor: '#FFF', padding: 32, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8E4', alignItems: 'center' },
  titulo: { fontSize: 28, fontWeight: 'bold', color: '#183B42', marginBottom: 8, textAlign: 'center' },
  descripcion: { fontSize: 16, color: '#586C70', marginBottom: 24, textAlign: 'center', lineHeight: 22 },
  label: { fontSize: 16, fontWeight: 'bold', color: '#183B42', marginBottom: 8 },
  input: { backgroundColor: '#F7F7F2', borderWidth: 1, borderColor: '#849993', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 20, color: '#000' },
  boton: { backgroundColor: '#174F49', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  botonPeligro: { backgroundColor: '#8B0000', width: '100%', marginTop: 20 },
  textoBoton: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});