import { Directory, File, Paths } from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE_URL } from './sesion';

export const elegirFotoDeGaleria = async (): Promise<string | null> => {
  try {
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.75,
    });
    return !resultado.canceled && resultado.assets[0] ? resultado.assets[0].uri : null;
  } catch (error) {
    console.error("Error al abrir galería:", error);
    return null;
  }
};

export const tomarFotoConCamara = async (): Promise<string | null> => {
  try {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) return null;

    const resultado = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.75,
    });
    return !resultado.canceled && resultado.assets[0] ? resultado.assets[0].uri : null;
  } catch (error) {
    console.error("Error al abrir cámara:", error);
    return null;
  }
};

export const guardarFotoLocal = (uriTemporal: string, idVisita: string): string => {
  const carpeta = new Directory(Paths.document, 'fotos-visitas');
  carpeta.create({ idempotent: true, intermediates: true });

  const origen = new File(uriTemporal);
  const extension = /^\.[a-z0-9]{1,10}$/i.test(origen.extension) ? origen.extension : '.jpg';
  const destino = new File(carpeta, `${idVisita}${extension}`);

  try {
    origen.copy(destino);
    return destino.uri;
  } catch (error) {
    if (destino.exists) {
      try { destino.delete(); } catch {}
    }
    throw error;
  }
};

export const subirFotoAServidor = async (fotoUriLocal: string, token: string): Promise<string> => {
  // Si la foto ya es una URL remota, no la volvemos a subir
  if (fotoUriLocal.startsWith('http://') || fotoUriLocal.startsWith('https://')) {
    return fotoUriLocal;
  }

  const nombreArchivo = fotoUriLocal.split('/').pop() || 'visita.jpg';
  const extension = nombreArchivo.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType =
    extension === 'png'
      ? 'image/png'
      : extension === 'webp'
      ? 'image/webp'
      : 'image/jpeg';

  // Usamos el uploader legacy de Expo que esquiva el bug de FormData en React Native
  const respuesta = await FileSystemLegacy.uploadAsync(`${API_BASE_URL}/archivos`, fotoUriLocal, {
    httpMethod: 'POST',
    uploadType: FileSystemLegacy.FileSystemUploadType.MULTIPART,
    fieldName: 'archivo',
    mimeType: mimeType,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (respuesta.status < 200 || respuesta.status >= 300) {
    throw new Error(`Error al subir foto (${respuesta.status}): ${respuesta.body}`);
  }

  // uploadAsync devuelve el body como string, así que lo parseamos a JSON
  const json = JSON.parse(respuesta.body);
  return json.datos.url;
};