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