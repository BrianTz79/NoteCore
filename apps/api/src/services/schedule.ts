import { and, asc, eq } from 'drizzle-orm';
import {
  ImportParseError,
  WEEKDAY_LABELS,
  blocksOverlap,
  normalizeName,
  parseScheduleImport,
  subjectColorForIndex,
  type CreateSubjectInput,
  type ImportConfirmInput,
  type ImportPreview,
  type ImportResult,
  type ScheduleBlockInput,
  type Subject,
  type UpdateSubjectInput,
  type Weekday,
} from '@notecore/shared';
import { db } from '../db/client.js';
import { assertSemesterWritable, getCurrentSemesterId } from './semester.js';
import {
  scheduleBlocks,
  subjects,
  type ScheduleBlockRow,
  type SubjectRow,
} from '../db/schema.js';
import { errors } from '../lib/errors.js';

/**
 * Lógica del horario (FR-005 a FR-010).
 *
 * Principio II: toda la regla vive aquí. Los clientes solo presentan.
 * Principio III: ninguna función confía en un `userId` que venga del cliente; siempre llega
 * del token ya verificado, y toda consulta lo lleva en su `WHERE`.
 */

/**
 * PostgreSQL devuelve `time` como `HH:MM:SS`; el dominio lo usa como `HH:MM`.
 *
 * Se recorta al leer para que el cliente reciba siempre el mismo formato con el que
 * escribe, y no tenga que normalizar por su cuenta.
 */
function toClockTime(value: string): string {
  return value.slice(0, 5);
}

/** Compone la materia con sus sesiones, tal como la consumen web y app. */
function toSubject(row: SubjectRow, blocks: readonly ScheduleBlockRow[]): Subject {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    blocks: blocks.map((block) => ({
      id: block.id,
      subjectId: block.subjectId,
      // El día se guarda como texto; el dominio lo tipa como `Weekday`. La validación de
      // entrada garantiza que solo se escriben valores válidos.
      weekday: block.weekday as Weekday,
      startTime: toClockTime(block.startTime),
      endTime: toClockTime(block.endTime),
      room: block.room,
    })),
  };
}

/**
 * Horario de un semestre (FR-009).
 *
 * Se resuelve en dos consultas en vez de un JOIN para no repetir los datos de la materia
 * por cada sesión. Ambas filtran por `userId` y por semestre.
 *
 * `semesterId` es opcional para que las llamadas corrientes no tengan que resolverlo: sin él
 * se usa el semestre en curso, que es lo que pide toda la aplicación salvo la consulta de un
 * archivado (FR-036).
 */
export async function listSubjects(
  userId: string,
  semesterId?: string,
): Promise<readonly Subject[]> {
  const scope = semesterId ?? (await getCurrentSemesterId(userId));

  const subjectRows = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.userId, userId), eq(subjects.semesterId, scope)))
    .orderBy(asc(subjects.name));

  if (subjectRows.length === 0) return [];

  const blockRows = await db
    .select()
    .from(scheduleBlocks)
    .where(and(eq(scheduleBlocks.userId, userId), eq(scheduleBlocks.semesterId, scope)))
    .orderBy(asc(scheduleBlocks.startTime));

  const bySubject = new Map<string, ScheduleBlockRow[]>();
  for (const block of blockRows) {
    const list = bySubject.get(block.subjectId);
    if (list) list.push(block);
    else bySubject.set(block.subjectId, [block]);
  }

  return subjectRows.map((row) => toSubject(row, bySubject.get(row.id) ?? []));
}

/** Una materia concreta del usuario. Lanza 404 si no existe o es de otra persona. */
export async function getSubject(userId: string, subjectId: string): Promise<Subject> {
  const row = await db.query.subjects.findFirst({
    // Principio III: el `userId` en el filtro es lo que impide leer la materia de otro.
    where: and(eq(subjects.id, subjectId), eq(subjects.userId, userId)),
  });

  if (!row) throw errors.noEncontrado('Esa materia no existe.');

  const blocks = await db
    .select()
    .from(scheduleBlocks)
    .where(and(eq(scheduleBlocks.subjectId, subjectId), eq(scheduleBlocks.userId, userId)))
    .orderBy(asc(scheduleBlocks.startTime));

  return toSubject(row, blocks);
}

/**
 * Comprueba que la materia sea del usuario y esté en un semestre escribible (FR-037).
 *
 * Devuelve su `semesterId`, que es lo que las comprobaciones de nombre y solape necesitan
 * después: así una sola consulta resuelve la pertenencia, la protección del historial y el
 * ámbito, en vez de tres.
 */
async function assertSubjectWritable(userId: string, subjectId: string): Promise<string> {
  const row = await db.query.subjects.findFirst({
    columns: { semesterId: true },
    where: and(eq(subjects.id, subjectId), eq(subjects.userId, userId)),
  });

  if (!row) throw errors.noEncontrado('Esa materia no existe.');

  await assertSemesterWritable(userId, row.semesterId);

  return row.semesterId;
}

/**
 * Comprueba que el nombre no lo tenga ya otra materia del usuario.
 *
 * La comparación ignora mayúsculas y acentos porque para el estudiante "Cálculo" y
 * "calculo" son la misma materia, y tener las dos solo genera confusión al registrar faltas.
 */
async function assertNameAvailable(
  userId: string,
  semesterId: string,
  name: string,
  exceptSubjectId?: string,
): Promise<void> {
  // El choque se busca solo dentro del semestre: "Cálculo" del semestre pasado no impide
  // cursar "Cálculo" otra vez, que es justo lo que pasa cuando se repite una materia.
  const rows = await db
    .select({ id: subjects.id, name: subjects.name })
    .from(subjects)
    .where(and(eq(subjects.userId, userId), eq(subjects.semesterId, semesterId)));

  const target = normalizeName(name);
  const clash = rows.find(
    (row) => normalizeName(row.name) === target && row.id !== exceptSubjectId,
  );

  if (clash) {
    throw errors.validacion('Ya tienes una materia con ese nombre.', [
      { field: 'name', message: 'Ya tienes una materia con ese nombre' },
    ]);
  }
}

/**
 * Rechaza sesiones que se encimen entre sí.
 *
 * Se comprueba contra las sesiones del resto de materias además de las propias: un
 * estudiante no puede estar en dos clases a la vez, y permitirlo haría que el conteo de
 * faltas de la Fase 3 fuera ambiguo.
 */
async function assertNoOverlap(
  userId: string,
  semesterId: string,
  blocks: readonly ScheduleBlockInput[],
  exceptSubjectId?: string,
): Promise<void> {
  // Solo contra las sesiones del mismo semestre: nadie está en dos clases a la vez dentro de
  // un semestre, pero el horario del semestre pasado ocupa esas mismas horas y no estorba.
  const others = await db
    .select({
      subjectId: scheduleBlocks.subjectId,
      weekday: scheduleBlocks.weekday,
      startTime: scheduleBlocks.startTime,
      endTime: scheduleBlocks.endTime,
    })
    .from(scheduleBlocks)
    .where(
      and(eq(scheduleBlocks.userId, userId), eq(scheduleBlocks.semesterId, semesterId)),
    );

  const existing = others
    .filter((row) => row.subjectId !== exceptSubjectId)
    .map((row) => ({
      weekday: row.weekday as Weekday,
      startTime: toClockTime(row.startTime),
      endTime: toClockTime(row.endTime),
    }));

  blocks.forEach((block, index) => {
    // Contra las demás sesiones de la propia petición.
    const selfClash = blocks.find(
      (other, otherIndex) => otherIndex < index && blocksOverlap(other, block),
    );
    if (selfClash) {
      throw errors.validacion(
        `Dos sesiones se enciman: ${WEEKDAY_LABELS[block.weekday]} a las ${block.startTime}.`,
        [{ field: `blocks.${index}`, message: 'Se encima con otra sesión de esta materia' }],
      );
    }

    // Contra las de las demás materias del usuario.
    if (existing.some((other) => blocksOverlap(other, block))) {
      throw errors.validacion(
        `Ya tienes clase el ${WEEKDAY_LABELS[block.weekday]} a las ${block.startTime}.`,
        [{ field: `blocks.${index}`, message: 'Se encima con otra materia' }],
      );
    }
  });
}

/**
 * Siguiente color de la paleta, para que dos materias seguidas no salgan iguales (FR-010).
 *
 * La rotación se cuenta dentro del semestre: si contara todas las materias históricas, el
 * primer color de un semestre nuevo dependería de cuántos semestres lleve la cuenta.
 */
async function nextColor(userId: string, semesterId: string): Promise<string> {
  const rows = await db
    .select({ id: subjects.id })
    .from(subjects)
    .where(and(eq(subjects.userId, userId), eq(subjects.semesterId, semesterId)));
  return subjectColorForIndex(rows.length);
}

/**
 * Da de alta una materia en el semestre en curso.
 *
 * Siempre en el activo: no se pasa `semesterId` desde fuera porque escribir en un semestre
 * concreto es exactamente lo que abriría la puerta a escribir en uno archivado (FR-037).
 */
export async function createSubject(
  userId: string,
  input: CreateSubjectInput,
): Promise<Subject> {
  const semesterId = await getCurrentSemesterId(userId);

  await assertNameAvailable(userId, semesterId, input.name);
  await assertNoOverlap(userId, semesterId, input.blocks);

  const color = input.color ?? (await nextColor(userId, semesterId));

  // Transacción: una materia sin sus sesiones sería un horario a medio escribir.
  const subjectId = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(subjects)
      .values({ userId, semesterId, name: input.name, color })
      .returning({ id: subjects.id });

    if (!created) throw new Error('No se pudo crear la materia');

    if (input.blocks.length > 0) {
      await tx.insert(scheduleBlocks).values(
        input.blocks.map((block) => ({
          userId,
          semesterId,
          subjectId: created.id,
          weekday: block.weekday,
          startTime: block.startTime,
          endTime: block.endTime,
          room: block.room,
        })),
      );
    }

    return created.id;
  });

  return getSubject(userId, subjectId);
}

/**
 * Edita una materia.
 *
 * Cuando llegan `blocks`, sustituyen por completo a las anteriores: es lo que hace el
 * formulario de ambos clientes y es más simple de razonar que un parcheo por sesión.
 */
export async function updateSubject(
  userId: string,
  subjectId: string,
  input: UpdateSubjectInput,
): Promise<Subject> {
  // Confirma que la materia es del usuario antes de tocar nada (Principio III), y de paso
  // trae el semestre al que pertenece.
  const semesterId = await assertSubjectWritable(userId, subjectId);

  if (input.name !== undefined) {
    await assertNameAvailable(userId, semesterId, input.name, subjectId);
  }

  if (input.blocks !== undefined) {
    await assertNoOverlap(userId, semesterId, input.blocks, subjectId);
  }

  await db.transaction(async (tx) => {
    if (input.name !== undefined || input.color !== undefined) {
      await tx
        .update(subjects)
        .set({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.color !== undefined && { color: input.color }),
          updatedAt: new Date(),
        })
        .where(and(eq(subjects.id, subjectId), eq(subjects.userId, userId)));
    }

    if (input.blocks !== undefined) {
      await tx
        .delete(scheduleBlocks)
        .where(
          and(eq(scheduleBlocks.subjectId, subjectId), eq(scheduleBlocks.userId, userId)),
        );

      if (input.blocks.length > 0) {
        await tx.insert(scheduleBlocks).values(
          input.blocks.map((block) => ({
            userId,
            semesterId,
            subjectId,
            weekday: block.weekday,
            startTime: block.startTime,
            endTime: block.endTime,
            room: block.room,
          })),
        );
      }
    }
  });

  return getSubject(userId, subjectId);
}

/**
 * Borra una materia y sus sesiones.
 *
 * Principio VI: esto no es dato histórico archivable, es una corrección del horario en
 * curso —el estudiante se equivocó al capturarlo o dio de baja la materia—, así que se
 * borra de verdad. Lo que sí es historial son los semestres archivados, y ahí esta operación
 * ya no llega: `assertSubjectWritable` la rechaza (FR-037).
 */
export async function deleteSubject(userId: string, subjectId: string): Promise<void> {
  await assertSubjectWritable(userId, subjectId);

  const deleted = await db
    .delete(subjects)
    .where(and(eq(subjects.id, subjectId), eq(subjects.userId, userId)))
    .returning({ id: subjects.id });

  if (deleted.length === 0) throw errors.noEncontrado('Esa materia no existe.');
}

/**
 * Analiza el JSON de la IA sin escribir nada (FR-007, FR-008).
 *
 * Es el paso que le faltaba a la v1: allí el pegado entraba directo a la base de datos y
 * volver a importar duplicaba el horario en silencio.
 */
export async function previewImport(userId: string, raw: string): Promise<ImportPreview> {
  const semesterId = await getCurrentSemesterId(userId);

  // "Ya existe" se mide contra el semestre en curso: una materia del semestre pasado no debe
  // marcarse como duplicada al importar el horario nuevo.
  const existing = await db
    .select({ name: subjects.name })
    .from(subjects)
    .where(and(eq(subjects.userId, userId), eq(subjects.semesterId, semesterId)));

  try {
    return parseScheduleImport(raw, existing.map((row) => row.name));
  } catch (error) {
    // El fallo de formato es culpa del contenido pegado, no del servidor: se traduce a un
    // error de validación con el mensaje que ya viene en español.
    if (error instanceof ImportParseError) {
      throw errors.validacion(error.message, [{ field: 'raw', message: error.message }]);
    }
    throw error;
  }
}

/**
 * Confirma la importación con el modo elegido (FR-007).
 *
 * Todo ocurre dentro de una transacción: si algo falla a mitad, el horario anterior queda
 * intacto. Es lo que exige el plan —importación transaccional que no destruye datos
 * previos ante error—.
 */
export async function confirmImport(
  userId: string,
  input: ImportConfirmInput,
): Promise<ImportResult> {
  const semesterId = await getCurrentSemesterId(userId);
  const preview = await previewImport(userId, input.raw);

  const removed = await db.transaction(async (tx) => {
    let subjectsRemoved = 0;

    if (input.mode === 'reemplazar') {
      /**
       * El borrado se acota al semestre en curso.
       *
       * Sin `semesterId` en el `WHERE`, "reemplazar" arrasaría el horario de todos los
       * semestres archivados de la cuenta: el fallo más destructivo que podía introducir esta
       * fase, y el que el Principio VI prohíbe de plano.
       */
      await tx
        .delete(scheduleBlocks)
        .where(
          and(eq(scheduleBlocks.userId, userId), eq(scheduleBlocks.semesterId, semesterId)),
        );
      const gone = await tx
        .delete(subjects)
        .where(and(eq(subjects.userId, userId), eq(subjects.semesterId, semesterId)))
        .returning({ id: subjects.id });
      subjectsRemoved = gone.length;
    }

    // El color continúa la rotación desde lo que ya hay, para que al añadir no se repitan
    // los colores de las materias existentes (FR-010).
    const remaining = await tx
      .select({ id: subjects.id })
      .from(subjects)
      .where(and(eq(subjects.userId, userId), eq(subjects.semesterId, semesterId)));

    let colorIndex = remaining.length;

    for (const item of preview.subjects) {
      const [created] = await tx
        .insert(subjects)
        .values({
          userId,
          semesterId,
          name: item.name,
          color: subjectColorForIndex(colorIndex),
        })
        .returning({ id: subjects.id });

      if (!created) throw new Error('No se pudo crear la materia importada');
      colorIndex += 1;

      await tx.insert(scheduleBlocks).values(
        item.blocks.map((block) => ({
          userId,
          semesterId,
          subjectId: created.id,
          weekday: block.weekday,
          startTime: block.startTime,
          endTime: block.endTime,
          room: block.room,
        })),
      );
    }

    return subjectsRemoved;
  });

  return {
    mode: input.mode,
    subjectsCreated: preview.subjects.length,
    blocksCreated: preview.totalBlocks,
    subjectsRemoved: removed,
    subjects: await listSubjects(userId),
  };
}

/**
 * Borra el horario del semestre en curso. Se usa desde la interfaz con confirmación previa.
 *
 * Acotado al activo por lo mismo que el modo "reemplazar" de la importación: sin el filtro,
 * vaciaría también el horario de cada semestre archivado.
 */
export async function clearSchedule(userId: string): Promise<number> {
  const semesterId = await getCurrentSemesterId(userId);

  const deleted = await db
    .delete(subjects)
    .where(and(eq(subjects.userId, userId), eq(subjects.semesterId, semesterId)))
    .returning({ id: subjects.id });
  return deleted.length;
}
