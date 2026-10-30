import axios from 'axios';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const CLAVE_SESION = 'mi-ciudad.sesion-token';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.100.8:3000';

export async function iniciarSesionAPI(email: string, contrasena: string) {
  try {
    const respuesta = await axios.post(`${API_BASE_URL}/auth/ingreso`, { email, contrasena });

    const tokenReal = respuesta.data.datos?.token;
    if (tokenReal) {
      await SecureStore.setItemAsync(CLAVE_SESION, tokenReal);
      return respuesta.data.datos.usuario; 
    }

    throw new Error('El servidor no devolvió un token válido.');
  } catch (error: any) {
    throw new Error(error.response?.data?.error?.mensaje || 'Error al iniciar sesión');
  }
}

export async function obtenerTokenApi(): Promise<string | null> {
  return await SecureStore.getItemAsync(CLAVE_SESION);
}

export async function cerrarSesionAPI(): Promise<void> {
  await SecureStore.deleteItemAsync(CLAVE_SESION);
}

export async function reingresoBiometrico(): Promise<boolean> {
  const token = await obtenerTokenApi();
  if (!token) return false; 

  const tieneHardware = await LocalAuthentication.hasHardwareAsync();
  const tieneHuella = await LocalAuthentication.isEnrolledAsync();

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