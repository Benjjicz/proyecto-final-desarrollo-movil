import { lugaresMock } from '../mocks/lugares';
import type { RespuestaLista } from '../tipos/api';
import type { Lugar } from '../tipos/lugar';
import { obtenerConCache } from './cache-catalogo';

const CLAVE_CACHE = 'mi-ciudad:catalogo-lugares-v1';

async function consultarLugares(): Promise<
  RespuestaLista<Lugar>
> {
  // Cuando tengamos la API, esta función hará la consulta HTTP.
  return {
    datos: lugaresMock,
    meta: {
      total: lugaresMock.length,
      pagina: 1,
      porPagina: 20,
    },
  };
}

export async function obtenerLugares(): Promise<
  RespuestaLista<Lugar>
> {
  return obtenerConCache<Lugar>(
    CLAVE_CACHE,
    consultarLugares
  );
}

export async function obtenerLugarPorId(
  id: string
): Promise<{ datos: Lugar }> {
  const respuesta = await obtenerLugares();

  const lugar = respuesta.datos.find(
    (elemento) => elemento.id === id
  );

  if (!lugar) {
    throw new Error('No existe ese lugar.');
  }

  return { datos: lugar };
}