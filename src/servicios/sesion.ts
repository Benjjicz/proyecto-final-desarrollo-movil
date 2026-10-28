import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const CLAVE_SESION = 'mi-ciudad.sesion-token';

// Se exporta para que cuenta.tsx pueda usarla y verificar el error 401
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
    throw new Error(json.error?.mensaje || 'Error al iniciar sesión');
  }

  const tokenReal = json.datos?.token;
  if (tokenReal) {
    await SecureStore.setItemAsync(CLAVE_SESION, tokenReal);
    return json.datos.usuario; 
  }

  throw new Error('El servidor no devolvió un token válido.');
}

export async function obtenerTokenApi(): Promise<string | null> {
  return await SecureStore.getItemAsync(CLAVE_SESION);
}

export async function cerrarSesionAPI(): Promise<void> {
  await SecureStore.deleteItemAsync(CLAVE_SESION);
}

// --- Validación Biométrica (Huella / FaceID / PIN) ---
export async function reingresoBiometrico(): Promise<boolean> {
  const token = await obtenerTokenApi();
  if (!token) return false; 

  const tieneHardware = await LocalAuthentication.hasHardwareAsync();
  const tieneHuella = await LocalAuthentication.isEnrolledAsync();

  // Alternativa (Plan B) exigida por el PDF si el dispositivo es viejo
  if (!tieneHardware || !tieneHuella) {
    return true; 
  }

  const resultado = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Desbloqueá Mi Ciudad para continuar',
    fallbackLabel: 'Usar PIN',
    cancelLabel: 'Cancelar'
  });

  return resultado.success;
}