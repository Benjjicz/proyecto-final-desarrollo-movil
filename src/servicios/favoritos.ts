import Storage from 'expo-sqlite/kv-store';

const CLAVE_FAVORITOS = 'mi-ciudad:favoritos-locales';

export async function obtenerFavoritosLocales(): Promise<string[]> {
  const guardado = await Storage.getItem(CLAVE_FAVORITOS);

  if (guardado === null) {
    return [];
  }

  const datos: unknown = JSON.parse(guardado);

  if (
    !Array.isArray(datos) ||
    !datos.every((id) => typeof id === 'string')
  ) {
    throw new Error('El formato de los favoritos no es válido.');
  }

  return datos;
}

export async function guardarEstadoFavorito(
  lugarId: string,
  esFavorito: boolean
): Promise<void> {
  const favoritos = await obtenerFavoritosLocales();

  const nuevosFavoritos = esFavorito
    ? [...new Set([...favoritos, lugarId])]
    : favoritos.filter((id) => id !== lugarId);

  await Storage.setItem(
    CLAVE_FAVORITOS,
    JSON.stringify(nuevosFavoritos)
  );
}