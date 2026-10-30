import axios from 'axios';
import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import type { Coordenadas, Lugar } from '../tipos/lugar';
import type { OrigenVisita, VisitaLocal } from '../tipos/visita';
import { guardarFotoLocal, subirFotoAServidor } from './archivos';
import { db } from './db';
import { obtenerLugarPorId } from './lugares';
import { API_BASE_URL, obtenerTokenApi } from './sesion';

const RADIO_VISITA_METROS = 100;
const USUARIO_MOCK = 'usr-201';
const PATRON_ID_VISITA = /^vis-[A-Za-z0-9_-]{3,36}$/;

export interface NuevaVisita {
  lugarId: string;
  nota: string;
  fotoUri?: string | null;
}

function generarIdVisita(): string {
  const limpio = Crypto.randomUUID().replace(/-/g, '').slice(0, 28);
  return `vis-${limpio}`;
}

export async function obtenerVisitasLocales(): Promise<VisitaLocal[]> {
  const resultados = db.getAllSync<any>('SELECT * FROM visitas ORDER BY fechaHora DESC');

  return resultados.map((fila: any) => ({
    id: fila.id,
    lugarId: fila.lugarId,
    fechaHora: fila.fechaHora,
    origen: fila.origen as OrigenVisita,
    fotoUri: fila.fotoUri ?? null,
    nota: fila.nota ?? null,
    sincronizada: fila.sincronizada === 1,
  }));
}

async function guardarVisita(entrada: NuevaVisita, origen: OrigenVisita): Promise<VisitaLocal> {
  const lugarId = entrada.lugarId.trim();
  const notaTexto = entrada.nota.trim();

  if (!lugarId) throw new Error('Falta seleccionar el lugar.');
  if (notaTexto.length > 300) throw new Error('La nota admite hasta 300 caracteres.');

  const notaFinal = notaTexto.length > 0 ? notaTexto : null;
  const id = generarIdVisita();
  const fechaHora = new Date().toISOString();

  let fotoUriFinal: string | null = null;

  try {
    if (entrada.fotoUri) {
      fotoUriFinal = guardarFotoLocal(entrada.fotoUri, id);
    }

    db.runSync(
      `INSERT INTO visitas (id, usuarioId, lugarId, fechaHora, origen, fotoUri, nota, sincronizada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, USUARIO_MOCK, lugarId, fechaHora, origen, fotoUriFinal, notaFinal, 0]
    );

    const nuevaVisita: VisitaLocal = {
      id,
      lugarId,
      fechaHora,
      origen,
      fotoUri: fotoUriFinal,
      nota: notaFinal,
      sincronizada: false,
    };

    void intentarSincronizar();
    return nuevaVisita;
  } catch (error) {
    throw error;
  }
}

export function registrarVisitaManual(entrada: NuevaVisita): Promise<VisitaLocal> {
  return guardarVisita(entrada, 'manual');
}

export async function buscarLugarPorQr(codigo: string): Promise<Lugar> {
  const textoLimpio = codigo.trim();
  
  try {
    const respuesta = await axios.get(`${API_BASE_URL}/lugares/qr/${encodeURIComponent(textoLimpio)}`);
    return respuesta.data.datos;
  } catch (error: any) {
    throw new Error(error.response?.data?.error?.mensaje || 'El código no es válido.');
  }
}

export async function registrarVisitaPorQr(
  codigo: string,
  nota: string,
  fotoUri?: string | null
): Promise<VisitaLocal> {
  const lugar = await buscarLugarPorQr(codigo);
  return guardarVisita({ lugarId: lugar.id, nota, fotoUri }, 'qr');
}

function distanciaMetros(origen: Coordenadas, destino: Coordenadas): number {
  const radianes = (grados: number) => (grados * Math.PI) / 180;
  const latitud1 = radianes(origen.latitud);
  const latitud2 = radianes(destino.latitud);
  const diferenciaLatitud = radianes(destino.latitud - origen.latitud);
  const diferenciaLongitud = radianes(destino.longitud - origen.longitud);

  const calculo =
    Math.sin(diferenciaLatitud / 2) ** 2 +
    Math.cos(latitud1) * Math.cos(latitud2) * Math.sin(diferenciaLongitud / 2) ** 2;

  const limitado = Math.min(1, Math.max(0, calculo));
  return 6371000 * 2 * Math.atan2(Math.sqrt(limitado), Math.sqrt(1 - limitado));
}

export async function registrarVisitaPorGps(entrada: NuevaVisita): Promise<VisitaLocal> {
  const respuesta = await obtenerLugarPorId(entrada.lugarId);
  const lugar = respuesta.datos;
  if (!lugar.activo) throw new Error('Este lugar no está disponible.');

  const permiso = await Location.requestForegroundPermissionsAsync();
  if (!permiso.granted) throw new Error('No tenemos permiso de ubicación.');

  const serviciosActivos = await Location.hasServicesEnabledAsync();
  if (!serviciosActivos) throw new Error('Activá la ubicación del teléfono.');

  let posicion: Location.LocationObject;
  try {
    posicion = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  } catch {
    throw new Error('No pudimos obtener tu ubicación.');
  }

  const { latitude, longitude } = posicion.coords;
  const distancia = distanciaMetros(
    { latitud: latitude, longitud: longitude },
    lugar.coordenadas
  );

  if (distancia > RADIO_VISITA_METROS) {
    throw new Error(`Estás muy lejos (a más de ${RADIO_VISITA_METROS}m).`);
  }

  return guardarVisita(entrada, 'gps');
}

export const intentarSincronizar = async (): Promise<void> => {
  try {
    const estadoRed = await Network.getNetworkStateAsync();
    if (!estadoRed.isConnected || !estadoRed.isInternetReachable) return;

    const token = await obtenerTokenApi();
    if (!token) return;

    const pendientes = db.getAllSync<any>('SELECT * FROM visitas WHERE sincronizada = 0');

    for (const visita of pendientes) {
      try {
        let idValido: string = visita.id;
        if (!PATRON_ID_VISITA.test(idValido)) {
          idValido = generarIdVisita();
          db.runSync('UPDATE visitas SET id = ? WHERE id = ?', [idValido, visita.id]);
        }

        let fotoUrlRemota: string | null = visita.fotoUri ?? null;
        if (
          fotoUrlRemota &&
          !fotoUrlRemota.startsWith('http://') &&
          !fotoUrlRemota.startsWith('https://')
        ) {
          fotoUrlRemota = await subirFotoAServidor(fotoUrlRemota, token);
        }

        const respuesta = await axios.post(
          `${API_BASE_URL}/yo/visitas`,
          {
            id: idValido,
            lugarId: visita.lugarId,
            fechaHora: visita.fechaHora,
            origen: visita.origen,
            fotoUri: fotoUrlRemota,
            nota: visita.nota ?? null,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          }
        );

        if (respuesta.status === 200 || respuesta.status === 201) {
          db.runSync('UPDATE visitas SET sincronizada = 1 WHERE id = ?', [idValido]);
        }
      } catch (errorIndividual: any) {
        console.warn(`No se pudo sincronizar la visita ${visita.id}:`, errorIndividual.message);
      }
    }

    try {
      const respuestaLista = await axios.get(`${API_BASE_URL}/yo/visitas?porPagina=500`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      const visitasServidor: any[] = respuestaLista.data?.datos ?? [];

      for (const remota of visitasServidor) {
        db.runSync(
          `INSERT OR IGNORE INTO visitas (id, usuarioId, lugarId, fechaHora, origen, fotoUri, nota, sincronizada)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            remota.id,
            remota.usuarioId ?? USUARIO_MOCK,
            remota.lugarId,
            remota.fechaHora,
            remota.origen,
            remota.fotoUri ?? null,
            remota.nota ?? null,
          ]
        );
      }
    } catch (errorLista) {
      console.warn('Error descargando lista de visitas:', errorLista);
    }
  } catch (error) {
    console.error('Error general en sincronización:', error);
  }
};

export function limpiarVisitasLocales() {
  try {
    db.runSync('DELETE FROM visitas');
  } catch (error) {
    console.error('Error al limpiar SQLite en el logout:', error);
  }
}