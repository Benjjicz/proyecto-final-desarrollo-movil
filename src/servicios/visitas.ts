import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import * as Location from 'expo-location';
import Storage from 'expo-sqlite/kv-store';

import { obtenerLugarPorId } from './lugares';
import type { Coordenadas, Lugar } from '../tipos/lugar';
import type {
  OrigenVisita,
  VisitaLocal,
} from '../tipos/visita';

const CLAVE_VISITAS = 'mi-ciudad:visitas-locales';
const RADIO_VISITA_METROS = 100;

interface NuevaVisita {
  lugarId: string;
  nota: string;
  fotoUri?: string | null;
}

function esVisitaLocal(valor: unknown): valor is VisitaLocal {
  if (typeof valor !== 'object' || valor === null) {
    return false;
  }

  const visita = valor as Record<string, unknown>;

  const origenValido =
    visita.origen === 'manual' ||
    visita.origen === 'qr' ||
    visita.origen === 'gps';

  return (
    typeof visita.id === 'string' &&
    typeof visita.lugarId === 'string' &&
    typeof visita.fechaHora === 'string' &&
    Number.isFinite(Date.parse(visita.fechaHora)) &&
    origenValido &&
    (visita.fotoUri === null ||
      typeof visita.fotoUri === 'string') &&
    (visita.nota === null ||
      typeof visita.nota === 'string') &&
    typeof visita.sincronizada === 'boolean'
  );
}

export async function obtenerVisitasLocales(): Promise<
  VisitaLocal[]
> {
  const guardado = await Storage.getItem(CLAVE_VISITAS);

  if (guardado === null) {
    return [];
  }

  const datos: unknown = JSON.parse(guardado);

  if (
    !Array.isArray(datos) ||
    !datos.every(esVisitaLocal)
  ) {
    throw new Error('El formato de las visitas no es válido.');
  }

  return [...datos].sort(
    (a, b) =>
      Date.parse(b.fechaHora) - Date.parse(a.fechaHora)
  );
}

function copiarFoto(uri: string, visitaId: string): File {
  const carpeta = new Directory(Paths.document, 'fotos-visitas');

  carpeta.create({
    idempotent: true,
    intermediates: true,
  });

  const origen = new File(uri);
  const extension = /^\.[a-z0-9]{1,10}$/i.test(origen.extension)
    ? origen.extension
    : '.img';

  const destino = new File(carpeta, `${visitaId}${extension}`);

  try {
    origen.copy(destino);
    return destino;
  } catch (error) {
    if (destino.exists) {
      try {
        destino.delete();
      } catch {
        // Conservamos el error original.
      }
    }

    throw error;
  }
}

let escrituraPendiente: Promise<void> = Promise.resolve();

function guardarVisita(
  entrada: NuevaVisita,
  origen: OrigenVisita
): Promise<VisitaLocal> {
  const operacion = escrituraPendiente.then(async () => {
    const lugarId = entrada.lugarId.trim();
    const nota = entrada.nota.trim();

    if (!lugarId) {
      throw new Error('Falta seleccionar el lugar.');
    }

    if (nota.length > 300) {
      throw new Error('La nota admite hasta 300 caracteres.');
    }

    const visitas = await obtenerVisitasLocales();
    const id = Crypto.randomUUID();

    let fotoGuardada: File | null = null;

    try {
      if (entrada.fotoUri) {
        fotoGuardada = copiarFoto(entrada.fotoUri, id);
      }

      const nuevaVisita: VisitaLocal = {
        id,
        lugarId,
        fechaHora: new Date().toISOString(),
        origen,
        fotoUri: fotoGuardada?.uri ?? null,
        nota: nota || null,
        sincronizada: false,
      };

      await Storage.setItem(
        CLAVE_VISITAS,
        JSON.stringify([nuevaVisita, ...visitas])
      );

      return nuevaVisita;
    } catch (error) {
      if (fotoGuardada?.exists) {
        try {
          fotoGuardada.delete();
        } catch {
          // La limpieza no debe ocultar el error de guardado.
        }
      }

      throw error;
    }
  });

  escrituraPendiente = operacion.then(
    () => undefined,
    () => undefined
  );

  return operacion;
}

export function registrarVisitaManual(
  entrada: NuevaVisita
): Promise<VisitaLocal> {
  return guardarVisita(entrada, 'manual');
}

export async function buscarLugarPorQr(
  codigo: string
): Promise<Lugar> {
  const coincidencia = /^COLON:([a-zA-Z0-9_-]{1,100})$/.exec(
    codigo.trim()
  );

  if (!coincidencia) {
    throw new Error('Este QR no pertenece a Mi Ciudad.');
  }

  const respuesta = await obtenerLugarPorId(coincidencia[1]);
  const lugar = respuesta.datos;

  if (!lugar.activo || lugar.codigoQr !== codigo.trim()) {
    throw new Error('El QR no corresponde a un lugar disponible.');
  }

  return lugar;
}

export async function registrarVisitaPorQr(
  codigo: string,
  nota: string
): Promise<VisitaLocal> {
  const lugar = await buscarLugarPorQr(codigo);

  return guardarVisita(
    {
      lugarId: lugar.id,
      nota,
      fotoUri: null,
    },
    'qr'
  );
}

function distanciaMetros(
  origen: Coordenadas,
  destino: Coordenadas
): number {
  const radianes = (grados: number) => grados * Math.PI / 180;

  const latitud1 = radianes(origen.latitud);
  const latitud2 = radianes(destino.latitud);
  const diferenciaLatitud = radianes(
    destino.latitud - origen.latitud
  );
  const diferenciaLongitud = radianes(
    destino.longitud - origen.longitud
  );

  const calculo =
    Math.sin(diferenciaLatitud / 2) ** 2 +
    Math.cos(latitud1) *
      Math.cos(latitud2) *
      Math.sin(diferenciaLongitud / 2) ** 2;

  const limitado = Math.min(1, Math.max(0, calculo));

  return 6371000 * 2 * Math.atan2(
    Math.sqrt(limitado),
    Math.sqrt(1 - limitado)
  );
}

export async function registrarVisitaPorGps(
  entrada: NuevaVisita
): Promise<VisitaLocal> {
  const respuesta = await obtenerLugarPorId(entrada.lugarId);
  const lugar = respuesta.datos;

  if (!lugar.activo) {
    throw new Error('Este lugar no está disponible.');
  }

  const permiso = await Location.requestForegroundPermissionsAsync();

  if (!permiso.granted) {
    throw new Error(
      'No tenemos permiso de ubicación. Podés habilitarlo en los ajustes de Expo Go o registrar la visita manualmente.'
    );
  }

  const serviciosActivos = await Location.hasServicesEnabledAsync();

  if (!serviciosActivos) {
    throw new Error(
      'Activá la ubicación del teléfono o elegí el registro manual.'
    );
  }

  let posicion: Location.LocationObject;

  try {
    posicion = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
  } catch {
    throw new Error(
      'No pudimos obtener tu ubicación. Probá nuevamente o usá el registro manual.'
    );
  }

  const { latitude, longitude, accuracy } = posicion.coords;

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(posicion.timestamp) ||
    Date.now() - posicion.timestamp > 60000
  ) {
    throw new Error(
      'No recibimos una ubicación reciente y válida. Intentá nuevamente.'
    );
  }

  const distancia = distanciaMetros(
    { latitud: latitude, longitud: longitude },
    lugar.coordenadas
  );

  if (distancia > RADIO_VISITA_METROS) {
    const textoDistancia = distancia >= 1000
      ? `${(distancia / 1000).toFixed(1)} km`
      : `${Math.round(distancia)} metros`;

    throw new Error(
      `Estás aproximadamente a ${textoDistancia} del lugar. Para registrarlo por GPS tenés que estar a menos de ${RADIO_VISITA_METROS} metros. También podés usar el registro manual.`
    );
  }

  if (
    accuracy === null ||
    !Number.isFinite(accuracy) ||
    accuracy < 0 ||
    distancia + accuracy > RADIO_VISITA_METROS
  ) {
    throw new Error(
      'La precisión de la ubicación no alcanza para confirmar la cercanía. Probá al aire libre o usá el registro manual.'
    );
  }

  return guardarVisita(entrada, 'gps');
}