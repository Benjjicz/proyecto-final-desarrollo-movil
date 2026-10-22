import { eventosMock } from '../mocks/eventos';
import type { RespuestaLista } from '../tipos/api';
import type { Evento } from '../tipos/evento';

export async function obtenerEventos(): Promise<
  RespuestaLista<Evento>
> {
  const eventos = [...eventosMock].sort(
    (a, b) => Date.parse(a.inicio) - Date.parse(b.inicio)
  );

  return {
    datos: eventos,
    meta: {
      total: eventos.length,
      pagina: 1,
      porPagina: 20,
    },
  };
}

export async function obtenerEventoPorId(
  id: string
): Promise<{ datos: Evento }> {
  const evento = eventosMock.find((elemento) => elemento.id === id);

  if (!evento) {
    throw new Error('No existe ese evento.');
  }

  return { datos: evento };
}