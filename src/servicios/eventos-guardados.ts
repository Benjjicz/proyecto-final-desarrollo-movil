import { Platform } from 'react-native';
import Storage from 'expo-sqlite/kv-store';

import type { Evento } from '../tipos/evento';
import type { EventoGuardado } from '../tipos/evento-guardado';

const CANAL = 'recordatorios-eventos';

let notificaciones:
  | typeof import('expo-notifications')
  | null = null;

async function cargarNotificaciones() {
  if (notificaciones) {
    return notificaciones;
  }

  try {
    const modulo = await import('expo-notifications');

    modulo.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    notificaciones = modulo;
    return modulo;
  } catch {
    throw new Error(
      'Las notificaciones no están disponibles en esta instalación de Expo Go. Podés seguir guardando eventos sin recordatorio.'
    );
  }
}

function clave(eventoId: string) {
  return `mi-ciudad:evento-guardado:${eventoId}`;
}

async function escribir(registro: EventoGuardado) {
  await Storage.setItem(
    clave(registro.eventoId),
    JSON.stringify(registro)
  );
}

export async function obtenerEventoGuardado(
  eventoId: string
): Promise<EventoGuardado | null> {
  const texto = await Storage.getItem(clave(eventoId));

  if (texto === null) {
    return null;
  }

  const datos: unknown = JSON.parse(texto);

  if (
    typeof datos !== 'object' ||
    datos === null ||
    !('eventoId' in datos) ||
    datos.eventoId !== eventoId ||
    !('inicio' in datos) ||
    typeof datos.inicio !== 'string' ||
    !('notificacionId' in datos) ||
    (datos.notificacionId !== null &&
      typeof datos.notificacionId !== 'string')
  ) {
    throw new Error('El evento guardado tiene un formato inválido.');
  }

  return {
    eventoId,
    inicio: datos.inicio,
    notificacionId: datos.notificacionId,
  };
}

export async function guardarEvento(
  evento: Evento
): Promise<EventoGuardado> {
  const existente = await obtenerEventoGuardado(evento.id);

  if (existente) {
    return existente;
  }

  const registro: EventoGuardado = {
    eventoId: evento.id,
    inicio: evento.inicio,
    notificacionId: null,
  };

  await escribir(registro);
  return registro;
}

async function pedirPermisoNotificaciones() {
  const modulo = await cargarNotificaciones();

  if (Platform.OS === 'android') {
    await modulo.setNotificationChannelAsync(CANAL, {
      name: 'Recordatorios de eventos',
      importance: modulo.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  let permiso = await modulo.getPermissionsAsync();

  if (!permiso.granted && permiso.canAskAgain) {
    permiso = await modulo.requestPermissionsAsync();
  }

  const autorizado =
    permiso.granted ||
    permiso.ios?.status ===
      modulo.IosAuthorizationStatus.PROVISIONAL;

  if (!autorizado) {
    throw new Error(
      'Las notificaciones no están habilitadas. El evento puede seguir guardado sin recordatorio.'
    );
  }

  return modulo;
}

export async function activarRecordatorio(
  evento: Evento
): Promise<EventoGuardado> {
  if (evento.estado !== 'programado') {
    throw new Error(
      'Solo podés activar avisos para eventos programados.'
    );
  }

  const fechaAviso = new Date(
    Date.parse(evento.inicio) - 15 * 60 * 1000
  );

  if (
    !Number.isFinite(fechaAviso.getTime()) ||
    fechaAviso.getTime() <= Date.now()
  ) {
    throw new Error(
      'Este evento ya comenzó o faltan menos de 15 minutos. Podés guardarlo sin programar este aviso.'
    );
  }

  const modulo = await pedirPermisoNotificaciones();
  const registro = await guardarEvento(evento);

  if (registro.notificacionId !== null) {
    await modulo.cancelScheduledNotificationAsync(
      registro.notificacionId
    );

    await escribir({
      ...registro,
      notificacionId: null,
    });
  }

  if (fechaAviso.getTime() <= Date.now()) {
    throw new Error('Ya pasó el horario del recordatorio.');
  }

  const notificacionId = await modulo.scheduleNotificationAsync({
    content: {
      title: 'Tu próximo plan en Colón',
      body: `${evento.titulo} empieza en 15 minutos.`,
      sound: 'default',
      data: { eventoId: evento.id },
    },
    trigger: {
      type: modulo.SchedulableTriggerInputTypes.DATE,
      date: fechaAviso,
      channelId: CANAL,
    },
  });

  const actualizado: EventoGuardado = {
    eventoId: evento.id,
    inicio: evento.inicio,
    notificacionId,
  };

  try {
    await escribir(actualizado);
  } catch (error) {
    await modulo.cancelScheduledNotificationAsync(
      notificacionId
    );
    throw error;
  }

  return actualizado;
}

export async function cancelarRecordatorio(
  eventoId: string
): Promise<EventoGuardado | null> {
  const registro = await obtenerEventoGuardado(eventoId);

  if (!registro) {
    return null;
  }

  if (registro.notificacionId !== null) {
    const modulo = await cargarNotificaciones();

    await modulo.cancelScheduledNotificationAsync(
      registro.notificacionId
    );
  }

  const actualizado: EventoGuardado = {
    ...registro,
    notificacionId: null,
  };

  await escribir(actualizado);
  return actualizado;
}

export async function quitarEventoGuardado(
  eventoId: string
): Promise<void> {
  await cancelarRecordatorio(eventoId);
  await Storage.removeItem(clave(eventoId));
}

export async function probarNotificacion(): Promise<void> {
  const modulo = await pedirPermisoNotificaciones();
  const identificador = 'mi-ciudad-prueba-recordatorio';

  await modulo.cancelScheduledNotificationAsync(identificador);

  await modulo.scheduleNotificationAsync({
    identifier: identificador,
    content: {
      title: '¡Mi Ciudad te avisa!',
      body: 'La prueba de notificaciones locales funciona.',
      sound: 'default',
    },
    trigger: {
      type: modulo.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 10,
      repeats: false,
      channelId: CANAL,
    },
  });
}