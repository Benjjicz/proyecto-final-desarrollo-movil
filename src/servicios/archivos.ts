import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

export const elegirFotoDeGaleria = async (): Promise<string | null> => {
  try {
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!resultado.canceled && resultado.assets[0]) {
      return resultado.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error("Error al abrir la galería:", error);
    return null;
  }
};

export const tomarFotoConCamara = async (): Promise<string | null> => {
  try {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      return null;
    }

    const resultado = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!resultado.canceled && resultado.assets[0]) {
      return resultado.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error("Error al abrir la cámara:", error);
    return null;
  }
};

export const guardarFotoLocal = (uriTemporal: string, idVisita: string): File => {
  const directorioVisitas = new Directory(Paths.document, 'visitas');
  
  directorioVisitas.create({
    idempotent: true,
    intermediates: true,
  });

  const archivoOrigen = new File(uriTemporal);
  const extension = /^\.[a-z0-9]{1,10}$/i.test(archivoOrigen.extension)
    ? archivoOrigen.extension
    : '.jpg';

  const archivoDestino = new File(directorioVisitas, `${idVisita}${extension}`);

  try {
    archivoOrigen.copy(archivoDestino);
    return archivoDestino;
  } catch (error) {
    if (archivoDestino.exists) {
      try {
        archivoDestino.delete();
      } catch {
        // Conservamos el error original
      }
    }
    throw error;
  }
};