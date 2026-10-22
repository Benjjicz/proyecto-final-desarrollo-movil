import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import type { SesionDemo } from '../tipos/sesion';

const CLAVE_SESION = 'mi-ciudad.sesion-demo';

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
  const token = `demo-${Crypto.randomUUID()}`;

  await SecureStore.setItemAsync(CLAVE_SESION, token);

  return {
    modo: 'demo',
    token,
  };
}

export async function cerrarSesionDemo(): Promise<void> {
  await SecureStore.deleteItemAsync(CLAVE_SESION);
}