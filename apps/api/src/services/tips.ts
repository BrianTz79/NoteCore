import { and, count, eq, or } from 'drizzle-orm';
import type { TipContext } from '@notecore/shared';
import { db } from '../db/client.js';
import { getCurrentSemesterId } from './semester.js';
import {
  absenceRecords,
  agendaItems,
  contacts,
  semesters,
  shares,
  subjects,
  userSettings,
} from '../db/schema.js';

/**
 * El estado de la cuenta contra el que se eligen los consejos del inicio (Fase 29).
 *
 * ## Por qué es un endpoint y no cinco peticiones desde el cliente
 *
 * Porque el consejo se elige mirando seis cosas a la vez —horario, agenda, faltas, ajustes,
 * contactos, periodos— y pedirlas por separado añadiría cinco viajes a la pantalla que más se
 * abre de la app, para pintar lo accesorio. Resolverlo aquí lo deja en uno.
 *
 * También es lo que hace que web y app coincidan: las dos evalúan las mismas reglas de
 * `shared` sobre el **mismo** contexto, en vez de cada una reuniendo los datos a su manera y
 * llegando a conclusiones distintas.
 *
 * ## Por qué son cuentas y no listas
 *
 * Porque las reglas solo preguntan «¿tiene alguno?» o «¿cuántos?». Devolver las listas enteras
 * mandaría la agenda completa por la red para responder a `pendientes > 0`, y expondría datos
 * que esta respuesta no necesita tocar.
 */
export async function getTipContext(userId: string): Promise<TipContext> {
  const semesterId = await getCurrentSemesterId(userId);

  // Todas en paralelo: son seis lecturas independientes y encadenarlas multiplicaría por seis
  // la latencia de una pantalla que se abre constantemente.
  const [
    materias,
    pendientes,
    faltas,
    ajustes,
    contactosAceptados,
    compartidos,
    periodos,
  ] = await Promise.all([
    db
      .select({ total: count() })
      .from(subjects)
      .where(and(eq(subjects.userId, userId), eq(subjects.semesterId, semesterId))),

    db
      .select({ total: count() })
      .from(agendaItems)
      .where(
        and(
          eq(agendaItems.userId, userId),
          eq(agendaItems.semesterId, semesterId),
          eq(agendaItems.completed, false),
        ),
      ),

    db
      .select({ total: count() })
      .from(absenceRecords)
      .where(
        and(eq(absenceRecords.userId, userId), eq(absenceRecords.semesterId, semesterId)),
      ),

    db.query.userSettings.findFirst({ where: eq(userSettings.userId, userId) }),

    /**
     * Contactos **aceptados**, no solicitudes.
     *
     * La relación se guarda una sola vez con dos columnas de usuario, así que hay que mirar
     * las dos: quien envió la solicitud está en `userAId` y quien la aceptó en `userBId`, o
     * al revés según quién empezó. Filtrar solo por una dejaría a la mitad de los contactos
     * fuera de la cuenta, y el consejo de «busca a tus compañeros» le saldría a alguien que
     * ya los tiene.
     */
    db
      .select({ total: count() })
      .from(contacts)
      .where(
        and(
          eq(contacts.status, 'aceptado'),
          or(eq(contacts.userAId, userId), eq(contacts.userBId, userId)),
        ),
      ),

    db.select({ total: count() }).from(shares).where(eq(shares.userId, userId)),

    db.select({ total: count() }).from(semesters).where(eq(semesters.userId, userId)),
  ]);

  return {
    materias: materias[0]?.total ?? 0,
    pendientes: pendientes[0]?.total ?? 0,
    tieneFaltas: (faltas[0]?.total ?? 0) > 0,
    recordatoriosActivos: ajustes?.remindersEnabled ?? false,
    avisoClaseActivo: ajustes?.classAlertsEnabled ?? false,
    contactos: contactosAceptados[0]?.total ?? 0,
    haCompartido: (compartidos[0]?.total ?? 0) > 0,
    periodos: periodos[0]?.total ?? 0,
  };
}
