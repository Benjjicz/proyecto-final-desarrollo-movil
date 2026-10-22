import { categoriasMock } from '../mocks/categorias';
import type { RespuestaLista } from '../tipos/api';
import type { Categoria } from '../tipos/categoria';
import { obtenerConCache } from './cache-catalogo';

const CLAVE_CACHE = 'mi-ciudad:catalogo-categorias-v1';

async function consultarCategorias(): Promise<
  RespuestaLista<Categoria>
> {
  const categorias = [...categoriasMock].sort(
    (a, b) => a.orden - b.orden
  );

  return {
    datos: categorias,
    meta: {
      total: categorias.length,
      pagina: 1,
      porPagina: 20,
    },
  };
}

export async function obtenerCategorias(): Promise<
  RespuestaLista<Categoria>
> {
  return obtenerConCache<Categoria>(
    CLAVE_CACHE,
    consultarCategorias
  );
}