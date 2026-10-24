import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import type { SesionDemo } from '../tipos/sesion';

const CLAVE_SESION = 'mi-ciudad.sesion-demo';

// Cambiá esta IP por la IPv4 de tu computadora si no usás variable de entorno .env
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.100.8:3000';

export async function obtenerSesionDemo(): Promise<SesionDemo | null> {
  const token = await SecureStore.getItemAsync(CLAVE_SESION);

  if (token === null) {
    return null;
  }

  return {
    modo: 'demo',
    token,
  };
}

export async function iniciarSesionDemo(): Promise<SesionDemo> {
  try {
    const respuesta = await fetch(`${API_BASE_URL}/auth/ingreso`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'lucia@mail.com',
        contrasena: 'lucia1234',
      }),
    });

    if (respuesta.ok) {
      const json = await respuesta.json();
      const tokenReal: string | undefined = json?.datos?.token;
      if (tokenReal) {
        await SecureStore.setItemAsync(CLAVE_SESION, tokenReal);
        return {
          modo: 'demo',
          token: tokenReal,
        };
      }
    }
  } catch {
    // Si no hay conexión al iniciar sesión demo, caemos al token local offline
  }

  const token = `demo-${Crypto.randomUUID()}`;
  await SecureStore.setItemAsync(CLAVE_SESION, token);

  return {
    modo: 'demo',
    token,
  };
}

export async function obtenerTokenApi(): Promise<string | null> {
  const tokenGuardado = await SecureStore.getItemAsync(CLAVE_SESION);

  if (tokenGuardado && !tokenGuardado.startsWith('demo-')) {
    return tokenGuardado;
  }

  try {
    const respuesta = await fetch(`${API_BASE_URL}/auth/ingreso`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'lucia@mail.com',
        contrasena: 'lucia1234',
      }),
    });

    if (!respuesta.ok) {
      return null;
    }

    const json = await respuesta.json();
    const tokenReal: string | undefined = json?.datos?.token;

    if (tokenReal) {
      await SecureStore.setItemAsync(CLAVE_SESION, tokenReal);
      return tokenReal;
    }

    return null;
  } catch {
    return null;
  }
}

export async function cerrarSesionDemo(): Promise<void> {
  await SecureStore.deleteItemAsync(CLAVE_SESION);
}