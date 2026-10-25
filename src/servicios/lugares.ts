import { lugaresMock } from '../mocks/lugares';
import type { RespuestaLista } from '../tipos/api';
import type { Lugar } from '../tipos/lugar';
import { obtenerConCache } from './cache-catalogo';
import { API_BASE_URL } from './sesion';

const CLAVE_CACHE = 'mi-ciudad:catalogo-lugares-v1';

async function consultarLugares(): Promise<RespuestaLista<Lugar>> {
  try {
    const respuesta = await fetch(`${API_BASE_URL}/lugares?porPagina=500`);
    if (!respuesta.ok) {
      throw new Error('Error al conectar con la API');
    }
    const json = await respuesta.json();
    return json as RespuestaLista<Lugar>;
  } catch (error) {
    console.warn('Usando lugaresMock como respaldo (sin conexión API).', error);
    return {
      datos: lugaresMock,
      meta: {
        total: lugaresMock.length,
        pagina: 1,
        porPagina: 20,
      },
    };
  }
}

export async function obtenerLugares(): Promise<RespuestaLista<Lugar>> {
  return obtenerConCache<Lugar>(
    CLAVE_CACHE,
    consultarLugares
  );
}

export async function obtenerLugarPorId(id: string): Promise<{ datos: Lugar }> {
  // Forzamos a que actualice y lea de la API o caché fresca
  const respuesta = await obtenerLugares();

  const lugar = respuesta.datos.find((elemento) => elemento.id === id);

  if (!lugar) {
    throw new Error('No existe ese lugar.');
  }

  return { datos: lugar };
}