import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const CLAVE_SESION = 'mi-ciudad.sesion-token';

// Ajustá la IP si es necesario
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.100.8:3000';

export async function iniciarSesionAPI(email: string, contrasena: string) {
  const respuesta = await fetch(`${API_BASE_URL}/auth/ingreso`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email, contrasena }),
  });

  const json = await respuesta.json();

  if (!respuesta.ok) {
    // Captura el mensaje de error exacto del servidor (ej: "Credenciales inválidas")
    throw new Error(json.error?.mensaje || 'Error al iniciar sesión');
  }

  const tokenReal = json.datos?.token;
  if (tokenReal) {
    await SecureStore.setItemAsync(CLAVE_SESION, tokenReal);
    // Retornamos los datos del usuario por si la interfaz los necesita
    return json.datos.usuario; 
  }

  throw new Error('El servidor no devolvió un token válido.');
}

// Esta función la usa visitas.ts para saber si hay sesión antes de sincronizar
export async function obtenerTokenApi(): Promise<string | null> {
  return await SecureStore.getItemAsync(CLAVE_SESION);
}

export async function cerrarSesionAPI(): Promise<void> {
  await SecureStore.deleteItemAsync(CLAVE_SESION);
}

// --- Validación Biométrica (Huella / FaceID / PIN) ---
export async function reingresoBiometrico(): Promise<boolean> {
  // 1. Nos fijamos si hay una sesión guardada
  const token = await obtenerTokenApi();
  if (!token) return false; // Si no hay token, no pasa

  // 2. Revisamos si el hardware soporta biometría y si hay huella configurada
  const tieneHardware = await LocalAuthentication.hasHardwareAsync();
  const tieneHuella = await LocalAuthentication.isEnrolledAsync();

  // Alternativa para el dispositivo que no la tenga (Plan B)
  if (!tieneHardware || !tieneHuella) {
    // Si no tiene lector, ya comprobamos que su token existe y es válido en SecureStore
    return true; 
  }

  // 3. Pedimos la huella. El sistema operativo maneja el fallback (pedir el PIN si falla la huella).
  const resultado = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Desbloqueá Mi Ciudad para continuar',
    fallbackLabel: 'Usar PIN',
    cancelLabel: 'Cancelar'
  });

  return resultado.success;
}