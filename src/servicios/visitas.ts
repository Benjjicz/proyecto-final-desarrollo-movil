import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import type { Coordenadas, Lugar } from '../tipos/lugar';
import type { OrigenVisita, VisitaLocal } from '../tipos/visita';
import { guardarFotoLocal } from './archivos';
import { db } from './db';
import { obtenerLugarPorId } from './lugares';

const RADIO_VISITA_METROS = 100;
const USUARIO_MOCK = "usr-201";

export interface NuevaVisita {
  lugarId: string;
  nota: string;
  fotoUri?: string | null;
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
  const id = Crypto.randomUUID();
  const fechaHora = new Date().toISOString();
  
  let archivoFotoGuardada: File | null = null;

  try {
    if (entrada.fotoUri) {
      archivoFotoGuardada = guardarFotoLocal(entrada.fotoUri, id);
    }
    const fotoUriFinal = archivoFotoGuardada ? archivoFotoGuardada.uri : null;

    db.runSync(
      `INSERT INTO visitas (id, usuarioId, lugarId, fechaHora, origen, fotoUri, nota, sincronizada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, USUARIO_MOCK, lugarId, fechaHora, origen, fotoUriFinal, notaFinal, 0]
    );

    const nuevaVisita: VisitaLocal = {
      id, lugarId, fechaHora, origen, fotoUri: fotoUriFinal, nota: notaFinal, sincronizada: false
    };

    void intentarSincronizar(); // Disparamos la cola
    return nuevaVisita;
  } catch (error) {
    if (archivoFotoGuardada?.exists) {
      try { archivoFotoGuardada.delete(); } catch {}
    }
    throw error;
  }
}

export function registrarVisitaManual(entrada: NuevaVisita): Promise<VisitaLocal> {
  return guardarVisita(entrada, 'manual');
}

export async function buscarLugarPorQr(codigo: string): Promise<Lugar> {
  const coincidencia = /^COLON:([a-zA-Z0-9_-]{1,100})$/.exec(codigo.trim());
  if (!coincidencia) throw new Error('Este QR no pertenece a Mi Ciudad.');
  
  const respuesta = await obtenerLugarPorId(coincidencia[1]);
  const lugar = respuesta.datos;
  
  if (!lugar.activo || lugar.codigoQr !== codigo.trim()) {
    throw new Error('El QR no corresponde a un lugar disponible.');
  }
  return lugar;
}

export async function registrarVisitaPorQr(codigo: string, nota: string, fotoUri?: string | null): Promise<VisitaLocal> {
  const lugar = await buscarLugarPorQr(codigo);
  return guardarVisita({ lugarId: lugar.id, nota, fotoUri }, 'qr');
}

function distanciaMetros(origen: Coordenadas, destino: Coordenadas): number {
  const radianes = (grados: number) => grados * Math.PI / 180;
  const latitud1 = radianes(origen.latitud);
  const latitud2 = radianes(destino.latitud);
  const diferenciaLatitud = radianes(destino.latitud - origen.latitud);
  const diferenciaLongitud = radianes(destino.longitud - origen.longitud);

  const calculo = Math.sin(diferenciaLatitud / 2) ** 2 +
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

  const { latitude, longitude, accuracy } = posicion.coords;
  const distancia = distanciaMetros({ latitud: latitude, longitude: longitude }, lugar.coordenadas);

  if (distancia > RADIO_VISITA_METROS) throw new Error(`Estás muy lejos (a más de ${RADIO_VISITA_METROS}m).`);
  
  return guardarVisita(entrada, 'gps');
}

export const intentarSincronizar = async (): Promise<void> => {
  try {
    const estadoRed = await Network.getNetworkStateAsync();
    if (!estadoRed.isConnected || !estadoRed.isInternetReachable) return;

    const pendientes = db.getAllSync<any>('SELECT * FROM visitas WHERE sincronizada = 0');
    if (pendientes.length === 0) return;

    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulamos API del profesor
    pendientes.forEach((visita: any) => {
      db.runSync('UPDATE visitas SET sincronizada = 1 WHERE id = ?', [visita.id]);
    });
  } catch (error) {
    console.error("Error en sincronización:", error);
  }
};