import { and, asc, count, eq } from 'drizzle-orm';
import {
  DEFAULT_SEMESTER_KIND,
  defaultSemesterName,
  defaultWeeksForKind,
  suggestNextSemesterName,
  type CloseSemesterParsed,
  type CalendarDate,
  type RenameSemesterParsed,
  type Semester,
  type SemesterCloseEffect,
  type SemesterCloseResult,
  type SemesterContents,
  type SemesterKind,
  type SemesterStatus,
} from '@notecore/shared';
import { db } from '../db/client.js';
import {
  absenceRecords,
  agendaItems,
  scheduleBlocks,
  semesters,
  subjects,
  type SemesterRow,
} from '../db/schema.js';
import { errors } from '../lib/errors.js';

/**
 * Lógica de los semestres (FR-034 a FR-038).
 *
 * Principio II: qué se archiva, qué se puede escribir y con qué nombre arranca el siguiente
 * se decide aquí. Los clientes reciben el semestre en curso resuelto y solo lo pintan.
 * Principio III: ninguna función confía en un `userId` del cliente; llega del token ya
 * verificado y toda consulta lo lleva en su `WHERE`.
 * Principio VI: cerrar un semestre no borra ni copia una sola fila. Cambia su estado.
 */

/** Hoy como fecha de calendario local. Nunca vía `toISOString()`: en México restaría un día. */
function today(): CalendarDate {
  const now = new Date();
  const year = String(now.getFullYear()).padStart(4, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** `date` de PostgreSQL como `YYYY-MM-DD`, tolerando que el driver devuelva `Date`. */
function toCalendarDateValue(value: string | Date): CalendarDate {
  if (typeof value === 'string') return value.slice(0, 10);
  const year = String(value.getFullYear()).padStart(4, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Cuenta lo que guarda un semestre, para el resumen de la lista y el aviso de cierre.
 *
 * Las cuatro consultas van por separado en lugar de un JOIN con `count(distinct …)`: unir
 * cuatro tablas por el mismo semestre multiplica las filas entre sí, y desenredar eso con
 * `distinct` cuesta más que cuatro conteos que el índice de `(user_id, semester_id)` resuelve
 * directamente.
 */
async function contentsOf(userId: string, semesterId: string): Promise<SemesterContents> {
  const [subjectCount, blockCount, absenceCount, agendaCount] = await Promise.all([
    db
      .select({ value: count() })
      .from(subjects)
      .where(and(eq(subjects.userId, userId), eq(subjects.semesterId, semesterId))),
    db
      .select({ value: count() })
      .from(scheduleBlocks)
      .where(
        and(eq(scheduleBlocks.userId, userId), eq(scheduleBlocks.semesterId, semesterId)),
      ),
    db
      .select({ value: count() })
      .from(absenceRecords)
      .where(
        and(eq(absenceRecords.userId, userId), eq(absenceRecords.semesterId, semesterId)),
      ),
    db
      .select({ value: count() })
      .from(agendaItems)
      .where(and(eq(agendaItems.userId, userId), eq(agendaItems.semesterId, semesterId))),
  ]);

  return {
    subjects: subjectCount[0]?.value ?? 0,
    blocks: blockCount[0]?.value ?? 0,
    absences: absenceCount[0]?.value ?? 0,
    agendaItems: agendaCount[0]?.value ?? 0,
  };
}

/** Compone el semestre tal como lo consumen web y app. */
async function toSemester(userId: string, row: SemesterRow): Promise<Semester> {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as SemesterKind,
    weeks: row.weeks,
    status: row.status as SemesterStatus,
    startedAt: toCalendarDateValue(row.startedAt),
    closedAt: row.closedAt === null ? null : toCalendarDateValue(row.closedAt),
    contents: await contentsOf(userId, row.id),
    createdAt: row.createdAt,
  };
}

/**
 * El semestre en curso del usuario, creándolo si la cuenta aún no tiene ninguno.
 *
 * Se crea al vuelo y no en el registro por lo mismo que los ajustes de la Fase 3: así las
 * cuentas que ya existían no necesitan que nadie se acuerde de insertarles la fila, y ningún
 * cliente tiene que manejar el caso de "todavía no hay semestre".
 *
 * Devuelve la fila cruda —sin conteos— porque es la que consumen las escrituras de las otras
 * fases, y contar el contenido en cada alta de materia sería trabajo tirado.
 */
export async function getCurrentSemesterRow(userId: string): Promise<SemesterRow> {
  const existing = await db.query.semesters.findFirst({
    where: and(eq(semesters.userId, userId), eq(semesters.status, 'activo')),
  });

  if (existing) return existing;

  const now = new Date();
  /**
   * El primero de una cuenta nace como semestre, que es el tipo por defecto (Fase 18).
   *
   * Quien curse cuatrimestres lo cambia desde la pantalla de periodos, o lo elige al cerrar
   * el primero. No se pregunta en el registro: crear la cuenta ya pide bastante, y este es un
   * dato que se corrige en dos toques y que la mayoría no necesita tocar.
   */
  const created = await db
    .insert(semesters)
    .values({
      userId,
      name: defaultSemesterName(now.getFullYear(), now.getMonth() + 1, DEFAULT_SEMESTER_KIND),
      kind: DEFAULT_SEMESTER_KIND,
      weeks: defaultWeeksForKind(DEFAULT_SEMESTER_KIND),
      status: 'activo',
      startedAt: today(),
    })
    /**
     * Dos peticiones simultáneas de una cuenta sin semestre —la app y la web abriéndose a la
     * vez— entrarían aquí las dos. El índice único parcial deja pasar una sola; la otra no
     * falla, se queda sin fila insertada y la lee abajo.
     */
    .onConflictDoNothing()
    .returning();

  const row = created[0];
  if (row) return row;

  const raced = await db.query.semesters.findFirst({
    where: and(eq(semesters.userId, userId), eq(semesters.status, 'activo')),
  });
  if (!raced) throw new Error('No se pudo crear ni leer el semestre en curso');

  return raced;
}

/** Identificador del semestre en curso. Es lo que necesitan las escrituras de otras fases. */
export async function getCurrentSemesterId(userId: string): Promise<string> {
  return (await getCurrentSemesterRow(userId)).id;
}

/** El semestre en curso, con su contenido contado. */
export async function getCurrentSemester(userId: string): Promise<Semester> {
  return toSemester(userId, await getCurrentSemesterRow(userId));
}

/**
 * Todos los semestres del usuario: el activo y los archivados (FR-036).
 *
 * Los archivados se conservan indefinidamente, así que esta lista solo crece. Con un semestre
 * cada seis meses no hay volumen que pagine.
 */
export async function listSemesters(userId: string): Promise<readonly Semester[]> {
  // Asegura que la cuenta tenga su semestre en curso antes de listar: si no, una cuenta
  // recién creada devolvería la lista vacía y la pantalla no tendría nada que mostrar.
  await getCurrentSemesterRow(userId);

  const rows = await db
    .select()
    .from(semesters)
    .where(eq(semesters.userId, userId))
    .orderBy(asc(semesters.createdAt));

  return Promise.all(rows.map((row) => toSemester(userId, row)));
}

/** Un semestre concreto del usuario. Lanza 404 si no existe o es de otra persona. */
export async function getSemester(userId: string, semesterId: string): Promise<Semester> {
  const row = await db.query.semesters.findFirst({
    where: and(eq(semesters.id, semesterId), eq(semesters.userId, userId)),
  });

  if (!row) throw errors.noEncontrado('Ese semestre no existe.');

  return toSemester(userId, row);
}

/**
 * Lo que pasará al cerrar el semestre en curso (FR-038).
 *
 * Se consulta sin comprometerse a nada: es lo que hace de esto una explicación previa y no un
 * mensaje posterior. El cliente la pinta y solo entonces ofrece confirmar.
 */
export async function getCloseEffect(userId: string): Promise<SemesterCloseEffect> {
  const current = await getCurrentSemesterRow(userId);

  /**
   * El tipo propuesto es el del periodo que se cierra, y de él sale el nombre siguiente.
   *
   * Por eso `suggestNextSemesterName` recibe el tipo: en un régimen cuatrimestral el año
   * tiene tres periodos, así que de "2026-3" sale "2027-1" y no "2026-4". Con la regla
   * semestral a secas, quien cursa cuatrimestres vería un nombre equivocado cada tercer
   * cierre.
   */
  const kind = current.kind as SemesterKind;

  return {
    semester: await toSemester(userId, current),
    suggestedName: suggestNextSemesterName(current.name, kind),
    suggestedKind: kind,
    /**
     * Las semanas propuestas son las **del periodo que se cierra**, no las por defecto del
     * tipo: quien ajustó su semestre a 18 semanas porque su plantel es así, lo más probable
     * es que el siguiente también las tenga. Sigue siendo editable, y si cambia de tipo al
     * cerrar, el cliente propone las del tipo nuevo.
     */
    suggestedWeeks: current.weeks,
  };
}

/**
 * Cierra el semestre en curso y abre el siguiente (FR-034, FR-035).
 *
 * Las dos escrituras van en una transacción porque el invariante es que siempre haya
 * exactamente un semestre activo: si el archivado se guardara y la apertura fallara, la
 * cuenta se quedaría sin sitio donde escribir y el estudiante no podría capturar nada. Con la
 * transacción, o se hacen las dos o no se hace ninguna.
 *
 * Nada se copia al nuevo: arranca vacío y el horario se captura o se importa con el flujo de
 * la Fase 2. Nada se borra tampoco —el archivado conserva sus materias, sus faltas y sus
 * actividades donde estaban (Principio VI)—; lo único que cambia es que dejan de ser
 * escribibles (FR-037).
 */
export async function closeSemester(
  userId: string,
  input: CloseSemesterParsed,
): Promise<SemesterCloseResult> {
  const current = await getCurrentSemesterRow(userId);
  const closedOn = today();

  const startedRow = await db.transaction(async (tx) => {
    /**
     * El `WHERE` incluye `status = 'activo'`, no solo el identificador.
     *
     * Es lo que hace idempotente un doble cierre: dos toques rápidos en la app lanzan dos
     * peticiones, y sin esa condición la segunda archivaría de nuevo un semestre ya archivado
     * —reescribiendo su fecha de cierre— y abriría un tercer semestre.
     */
    const archived = await tx
      .update(semesters)
      .set({ status: 'archivado', closedAt: closedOn, updatedAt: new Date() })
      .where(
        and(
          eq(semesters.id, current.id),
          eq(semesters.userId, userId),
          eq(semesters.status, 'activo'),
        ),
      )
      .returning({ id: semesters.id });

    if (archived.length === 0) {
      // Otra petición lo cerró mientras esta iba en camino. Se aborta en lugar de abrir un
      // segundo semestre: el índice único lo rechazaría de todos modos.
      throw errors.validacion('Ese semestre ya está cerrado.');
    }

    /**
     * El tipo del periodo nuevo: el que pidió el cliente, o el del que se cierra.
     *
     * Heredarlo es lo habitual —se sigue en el mismo régimen—, pero se puede cambiar aquí
     * porque cerrar es justo el momento en que alguien cambia de escuela o de plan. El
     * periodo archivado conserva el suyo: nada de esto lo toca (Principio VI).
     */
    const kind: SemesterKind = input.kind ?? (current.kind as SemesterKind);

    /**
     * Las semanas: las que pidió el cliente, o un valor derivado del tipo.
     *
     * Cuando no vienen, se heredan las del periodo que se cierra sólo si el tipo no cambió.
     * Al cambiar de régimen esa herencia sería un error: arrastrar las 16 semanas de un
     * semestre a un cuatrimestre le daría un límite de faltas un tercio más alto del que le
     * toca, y el estudiante no tendría por qué sospecharlo.
     */
    const weeks =
      input.weeks ?? (kind === (current.kind as SemesterKind) ? current.weeks : defaultWeeksForKind(kind));

    const created = await tx
      .insert(semesters)
      .values({
        userId,
        name: input.name,
        kind,
        weeks,
        status: 'activo',
        startedAt: closedOn,
      })
      .returning();

    const row = created[0];
    if (!row) throw new Error('No se pudo abrir el semestre nuevo');
    return row;
  });

  return {
    archived: await getSemester(userId, current.id),
    started: await toSemester(userId, startedRow),
  };
}

/**
 * Edita el periodo activo: su nombre, su tipo o sus semanas (FR-034, Fase 18).
 *
 * Solo el activo: un periodo archivado no se modifica en nada, ni siquiera en el nombre
 * (FR-037). Podría parecer inofensivo, pero es la excepción por la que empiezan todas: en
 * cuanto una escritura se permite sobre el historial, la protección deja de ser una regla y
 * pasa a ser una lista de casos.
 *
 * Cambiar el tipo **no** recalcula las semanas. Quien corrige la etiqueta puede tener ya sus
 * semanas ajustadas a mano, y sobrescribirlas con el valor por defecto del tipo le borraría
 * ese ajuste sin decírselo. Si quiere las del tipo nuevo, las pone: siguen siendo editables.
 */
export async function updateSemester(
  userId: string,
  semesterId: string,
  input: RenameSemesterParsed,
): Promise<Semester> {
  const row = await db.query.semesters.findFirst({
    where: and(eq(semesters.id, semesterId), eq(semesters.userId, userId)),
  });

  if (!row) throw errors.noEncontrado('Ese semestre no existe.');
  if (row.status !== 'activo') throw errors.semestreArchivado(row.kind as SemesterKind);

  const patch: { name?: string; kind?: SemesterKind; weeks?: number; updatedAt: Date } = {
    updatedAt: new Date(),
  };
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.kind !== undefined) patch.kind = input.kind;
  if (input.weeks !== undefined) patch.weeks = input.weeks;

  await db
    .update(semesters)
    .set(patch)
    .where(and(eq(semesters.id, semesterId), eq(semesters.userId, userId)));

  return getSemester(userId, semesterId);
}

/**
 * Comprueba que un semestre acepte escritura antes de tocar nada (FR-037).
 *
 * Es la puerta que protege el historial, y por eso vive en el servidor y no en la interfaz:
 * los clientes esconden los botones de un semestre archivado, pero eso solo evita el error
 * accidental. La garantía es esta función.
 */
export async function assertSemesterWritable(
  userId: string,
  semesterId: string,
): Promise<void> {
  const row = await db.query.semesters.findFirst({
    where: and(eq(semesters.id, semesterId), eq(semesters.userId, userId)),
  });

  if (!row) throw errors.noEncontrado('Ese semestre no existe.');
  if (row.status !== 'activo') throw errors.semestreArchivado(row.kind as SemesterKind);
}
