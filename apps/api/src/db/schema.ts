import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  time,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Esquema de base de datos.
 *
 * Principio III: toda tabla de dominio lleva `userId` con clave foránea a `users`, y toda
 * consulta filtra por el usuario autenticado.
 */

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Identificador de acceso. Se guarda ya normalizado a minúsculas. */
  email: text('email').notNull().unique(),
  /** `@usuario` público, único (FR-004). También en minúsculas. */
  username: text('username').notNull().unique(),
  displayName: text('display_name').notNull(),
  /** Hash bcrypt. Nunca sale de la API en ninguna respuesta. */
  passwordHash: text('password_hash').notNull(),
  /**
   * Campos del perfil ampliado (FR-045). Todos opcionales: el usuario llena lo que quiera.
   *
   * Viven en `users` y no en una tabla aparte porque son atributos de la persona, uno por
   * cuenta, y siempre se leen junto al nombre. Una tabla `profiles` con relación 1:1 añadiría
   * un JOIN a la consulta más frecuente de la sección social sin separar nada que se consulte
   * por su cuenta.
   *
   * Son `null` cuando no se llenan, nunca cadena vacía: "no lo puse" y "lo puse vacío" no son
   * cosas distintas para el usuario, y tener dos representaciones obliga a cada pantalla a
   * comprobar las dos.
   */
  bio: text('bio'),
  career: text('career'),
  school: text('school'),
  age: integer('age'),
  /**
   * Quién puede ver el perfil ampliado y las publicaciones (FR-045).
   *
   * Por defecto `contactos`, el valor prudente: publicar algo y descubrir después que era
   * público no tiene arreglo, mientras que abrirlo cuando uno quiere es un toque. Es lo que
   * hace que el requisito se cumpla por defecto y no solo si el usuario configura.
   */
  profileVisibility: text('profile_visibility').notNull().default('contactos'),
  /**
   * Cuándo se anonimizó esta fila al borrar la cuenta (Fase 20). `null` en una cuenta viva.
   *
   * ## Qué es una fila anonimizada, y por qué no es una cuenta desactivada
   *
   * Cuando alguien borra su cuenta, todos sus datos se destruyen —horario, faltas, agenda,
   * periodos, publicaciones, comparticiones, ajustes, contactos y sesiones— y **esta fila se
   * vacía**: el correo y el `@usuario` pasan a valores aleatorios sin significado, el nombre
   * a «Usuario eliminado», la contraseña a un hash que ninguna contraseña satisface, y todos
   * los campos de perfil a `null`. Lo que queda es un identificador y una fecha: no hay nada
   * que permita reasociar la fila con la persona que fue.
   *
   * Eso **no** es la desactivación que Google prohíbe. Lo prohibido es congelar la cuenta
   * dejando los datos dentro para poder revivirla; aquí no queda ningún dato que revivir, y
   * la política de privacidad (Fase 19) lo explica antes de ofrecer el borrado. Retener datos
   * plenamente anonimizados, declarándolo, es lo que la política de Play permite.
   *
   * ## Por qué la fila sobrevive en lugar de borrarse
   *
   * Por los mensajes. Un mensaje que Ana le mandó a Beto vive en la conversación de Beto y
   * también es suyo: borrar la fila de Ana con el `cascade` que había se llevaría medio hilo
   * de Beto y dejaría sus respuestas colgando de nada. Y `conversations` guarda el par de
   * personas con un índice único sobre las dos columnas, así que reapuntar los hilos de todas
   * las cuentas borradas a un **único** centinela global haría chocar dos hilos distintos de
   * Beto —uno con Ana, otro con Carlos, ambos ahora «con el centinela»— contra ese índice.
   *
   * Una lápida por cuenta borrada resuelve las dos cosas a la vez: cada hilo conserva su par
   * distinto y su forma, y no hay ninguna cascada que atraviese hacia los datos de un tercero.
   */
  anonymizedAt: timestamp('anonymized_at', { withTimezone: true }),
  /**
   * Si esta cuenta puede ver el panel de números del operador (Fase 25).
   *
   * `false` para todo el mundo, y se activa **a mano con SQL** solo para la cuenta de quien
   * mantiene el proyecto. No hay ninguna ruta de la API que lo ponga a `true`: convertir a
   * alguien en administrador tiene que exigir acceso a la base de datos, porque un endpoint
   * que conceda ese permiso es, por definición, el endpoint que hay que comprometer para
   * verlo todo.
   *
   * Vive aquí y no en una lista del `.env` porque así la autorización está donde está todo lo
   * demás —y cambiarla no exige reiniciar el contenedor—, ni en una contraseña propia del
   * panel, que sería una segunda credencial que mantener y rotar rompiendo que la sesión sea
   * una sola cosa en todo el producto.
   */
  isAdmin: boolean('is_admin').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Sesiones abiertas. Una fila por dispositivo con sesión iniciada.
 *
 * Existe para que FR-002 se cumpla de verdad: cerrar sesión en la web borra su fila y deja
 * intacta la de la app. Guardar el hash del refresh token —y no el token— evita que quien
 * lea la base de datos pueda suplantar sesiones.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      // Si se borra la cuenta, se van sus sesiones. Es la única cascada del esquema:
      // las sesiones no son datos históricos (Principio VI), son estado efímero.
      .references(() => users.id, { onDelete: 'cascade' }),
    /** SHA-256 del refresh token vigente. Rota en cada renovación. */
    refreshTokenHash: text('refresh_token_hash').notNull(),
    /** `web` o `mobile`, para que el usuario reconozca el dispositivo. */
    client: text('client').notNull(),
    /**
     * Qué versión del cliente usó esta sesión la última vez (Fase 25).
     *
     * En la app es el `versionCode` de Android como texto («4»); en la web, la versión del
     * paquete. `null` en las sesiones que existían antes de esta fase y en cualquier cliente
     * que no mande la cabecera `x-notecore-version` — que es información en sí misma, no un
     * fallo: una sesión sin versión es una que no ha vuelto a usarse desde entonces.
     *
     * Vive en la sesión y no en el usuario porque la misma persona puede tener el teléfono en
     * una versión vieja y el navegador al día: guardarlo por cuenta obligaría a que una de las
     * dos sobrescribiera a la otra, y la pregunta que esto responde —cuánta gente se quedó
     * atrás— dejaría de tener respuesta.
     *
     * Es un dato de operación, no de producto: nadie lo ve en su lista de dispositivos, y solo
     * lo agrega el panel de la Fase 25. Se declara en la política de privacidad igual que el
     * resto de lo que guarda esta tabla.
     */
    clientVersion: text('client_version'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    // Listar las sesiones del usuario y limpiar las caducadas son las dos consultas
    // que se hacen sobre esta tabla.
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_expires_at_idx').on(table.expiresAt),
  ],
);

/**
 * Semestres del estudiante (FR-034 a FR-038).
 *
 * Un semestre es el **ámbito** de lo académico, no una copia de ello: las materias, las
 * faltas y las actividades llevan `semester_id` y se quedan donde están cuando el semestre se
 * archiva. Lo único que cambia al cerrarlo es su `status`.
 *
 * Se descartó archivar copiando el contenido a una tabla de instantáneas —como hace
 * `shares.payload`— porque vaciar las tablas al cerrar es justo la operación de rutina que
 * destruye historial y que el Principio VI prohíbe, y porque un archivo con otra forma que lo
 * vivo obligaría a cada pantalla a tener dos caminos de pintado (FR-036).
 *
 * Las fechas son `date` y no `timestamp`, por lo mismo que la fecha de una falta: "el
 * semestre empezó el 17 de agosto" es un día de calendario, no un instante.
 */
export const semesters = pgTable(
  'semesters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Nombre que le puso el estudiante: "2026-1", "Quinto semestre". */
    name: text('name').notNull(),
    /**
     * `semestre` o `cuatrimestre`, tal como los define `SEMESTER_KINDS` en `shared`.
     *
     * Va en el periodo y no en los ajustes del usuario: si fuera de la cuenta, cambiarlo
     * reetiquetaría también los periodos ya cerrados, y un archivado se cursó bajo el régimen
     * que tenía (Principio VI). Por defecto `semestre`, que es lo que eran todos los periodos
     * anteriores a la Fase 18 y lo que siguen siendo.
     *
     * El modelo mantiene el nombre `semesters` para la tabla y `semester_id` para las
     * referencias: el vocabulario cambia en la interfaz, no en el esquema. Renombrar a un
     * término neutro tocaría los tres clientes y datos ya en producción sin diferencia alguna
     * para quien usa el producto.
     */
    kind: text('kind').notNull().default('semestre'),
    /**
     * Semanas de clase de este periodo, base del límite sugerido (FR-013).
     *
     * Estuvo en `user_settings` hasta la Fase 18, como ajuste único de la cuenta. Con dos
     * tipos de periodo conviviendo eso deja de servir: poner 12 semanas al abrir un
     * cuatrimestre recalcularía también el límite del semestre archivado. La migración copió
     * el valor global de cada usuario a sus periodos, así que ningún límite existente cambió
     * de número.
     */
    weeks: integer('weeks').notNull().default(16),
    /**
     * `activo` o `archivado`, tal como los define `SEMESTER_STATUSES` en `shared`.
     *
     * A diferencia de la caducidad de un compartido, este estado sí se guarda: no se deriva
     * de ninguna fecha sino de un acto explícito del estudiante al cerrar el semestre.
     */
    status: text('status').notNull().default('activo'),
    startedAt: date('started_at').notNull(),
    /** Día en que se cerró. `null` mientras siga activo. */
    closedAt: date('closed_at'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('semesters_user_id_idx').on(table.userId),
    /**
     * Un solo semestre activo por usuario.
     *
     * Lo impone la base de datos y no solo el servicio porque es el invariante del que
     * cuelga todo lo demás: si dos quedaran activos, "el semestre en curso" dejaría de estar
     * definido y las materias nuevas irían a uno u otro según el orden de la consulta. Dos
     * cierres lanzados a la vez desde app y web son exactamente el caso que lo provocaría, y
     * la comprobación previa de ambos pasaría antes de que ninguno escribiera.
     *
     * Es un índice único parcial: solo restringe las filas activas, así que un usuario puede
     * acumular todos los archivados que quiera (FR-036).
     */
    uniqueIndex('semesters_one_active_per_user')
      .on(table.userId)
      .where(sql`${table.status} = 'activo'`),
  ],
);

/**
 * Materias del horario (FR-005).
 *
 * Lleva `userId` directo, no heredado de otra tabla: así toda consulta filtra por el
 * usuario autenticado sin necesidad de un JOIN previo (Principio III).
 */
export const subjects = pgTable(
  'subjects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /**
     * Semestre al que pertenece la materia (FR-035).
     *
     * `cascade` sigue a la cuenta, no al semestre: un semestre no se borra nunca —se archiva
     * (Principio VI)—, así que esta cascada solo se dispara al eliminar el usuario entero.
     */
    semesterId: uuid('semester_id')
      .notNull()
      .references(() => semesters.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** Color con el que se distingue en la vista semanal (FR-010). Formato `#rrggbb`. */
    color: text('color').notNull(),
    /**
     * Límite de faltas fijado a mano por el estudiante (FR-015).
     *
     * `null` significa "usa la sugerencia calculada": no se guarda el 20% ya resuelto
     * porque cambiaría al editar el horario o las semanas del semestre, y quedaría un
     * número obsoleto. Guardando solo lo que el usuario decidió, la sugerencia se recalcula
     * siempre y se distingue de un ajuste deliberado (Principio VII).
     */
    absenceLimit: integer('absence_limit'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Listar el horario del semestre en curso es, con diferencia, la consulta más frecuente:
    // va sobre las dos columnas porque desde la Fase 7 siempre se piden juntas.
    index('subjects_user_semester_idx').on(table.userId, table.semesterId),
  ],
);

/**
 * Sesiones de clase: un día de la semana con hora de inicio, fin y aula.
 *
 * `userId` se repite aquí aunque se pueda deducir de `subjects` porque permite filtrar y
 * borrar por usuario sin JOIN, y porque deja el aislamiento explícito en cada fila
 * (Principio III).
 *
 * Las horas se guardan como `time` de PostgreSQL —hora de reloj sin fecha ni zona—: una
 * clase de los lunes a las 07:00 es un horario recurrente, no un instante. Con `timestamp`
 * el horario se desplazaría al cambiar de huso.
 */
export const scheduleBlocks = pgTable(
  'schedule_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /**
     * Semestre al que pertenece la sesión.
     *
     * Se repite aquí aunque se deduzca de `subjects` por lo mismo que `userId`: permite
     * filtrar la rejilla del semestre en curso sin JOIN, y deja el ámbito explícito en cada
     * fila.
     */
    semesterId: uuid('semester_id')
      .notNull()
      .references(() => semesters.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      // Borrar una materia se lleva sus sesiones: no tienen sentido por separado.
      .references(() => subjects.id, { onDelete: 'cascade' }),
    /** `lunes` … `sabado`, tal como los define `WEEKDAYS` en `shared`. */
    weekday: text('weekday').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    room: text('room'),
  },
  (table) => [
    index('schedule_blocks_user_semester_idx').on(table.userId, table.semesterId),
    index('schedule_blocks_subject_id_idx').on(table.subjectId),
  ],
);

/**
 * Inasistencias registradas (FR-011, FR-012, FR-017).
 *
 * Una fila por sesión a la que se faltó, nunca por día: una materia puede tener dos clases
 * el mismo día, y sin el bloque no se podría saber si se faltó a una o a las dos. El "día
 * completo" de FR-011 se guarda como varias filas, una por clase de ese día.
 *
 * La fecha es `date` de PostgreSQL —día de calendario sin hora ni zona—: "falté el 3 de
 * septiembre" es un día, no un instante. Con `timestamp` la falta se desplazaría de día al
 * cambiar de huso.
 */
export const absenceRecords = pgTable(
  'absence_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /**
     * Semestre en el que se registró la falta (FR-035).
     *
     * Es lo que permite que el conteo de FR-012 se limite al semestre en curso: sin él, las
     * faltas de semestres pasados seguirían sumando contra el límite del actual.
     */
    semesterId: uuid('semester_id')
      .notNull()
      .references(() => semesters.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    /**
     * Sesión a la que se faltó.
     *
     * Si el estudiante reorganiza su horario y borra la sesión, la falta se va con ella:
     * una inasistencia a una clase que ya no existe en el horario no se puede contar contra
     * ningún límite. Eso solo ocurre en el semestre en curso: en uno archivado no se puede
     * borrar ninguna sesión (FR-037), así que la cascada no toca historial (Principio VI).
     */
    blockId: uuid('block_id')
      .notNull()
      .references(() => scheduleBlocks.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    /** Justificada: se conserva pero no cuenta para el límite (FR-017). */
    justified: boolean('justified').notNull().default(false),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('absence_records_user_semester_idx').on(table.userId, table.semesterId),
    index('absence_records_subject_id_idx').on(table.subjectId),
    // El panel de faltas cuenta por materia y la pantalla de marcar consulta por fecha.
    index('absence_records_user_date_idx').on(table.userId, table.date),
    /**
     * Una misma sesión no puede tener dos faltas el mismo día.
     *
     * Lo impone la base de datos y no solo el servicio: dos toques rápidos en la app
     * lanzarían dos peticiones a la vez, y la comprobación previa de ambas pasaría antes de
     * que ninguna insertara. El conteo de FR-012 saldría inflado.
     */
    unique('absence_records_block_date_unique').on(table.blockId, table.date),
  ],
);

/**
 * Actividades de la agenda: tareas, proyectos, exámenes (FR-018 a FR-022).
 *
 * `subjectId` y `dueDate` son nulos a propósito: FR-018 los declara opcionales, porque
 * "renovar la credencial" no cuelga de ninguna materia y "leer el capítulo 4" puede no
 * tener entrega.
 *
 * La fecha límite es `date` y no `timestamp` por lo mismo que la fecha de una falta: "se
 * entrega el 3 de septiembre" es un día de calendario. Con `timestamp` la entrega se
 * movería de día al cambiar de huso, y una tarea aparecería vencida un día antes.
 */
export const agendaItems = pgTable(
  'agenda_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /**
     * Semestre al que pertenece la actividad (FR-035).
     *
     * Al cerrar, las pendientes se archivan con todo lo demás en lugar de arrastrarse al
     * semestre nuevo: FR-035 archiva el semestre "íntegro", y mover una parte dejaría el
     * archivo contando algo distinto de lo que hubo.
     */
    semesterId: uuid('semester_id')
      .notNull()
      .references(() => semesters.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    /** `tarea`, `proyecto`, `examen` o `actividad`, tal como los define `AGENDA_KINDS`. */
    kind: text('kind').notNull().default('tarea'),
    /**
     * Materia asociada, si la tiene (FR-018).
     *
     * `set null` y no `cascade`: borrar una materia no puede llevarse la tarea. La entrega
     * sigue existiendo aunque el estudiante reorganice su horario, y perderla en silencio
     * sería justo el fallo que la agenda existe para evitar. Se queda sin materia, que es
     * un estado válido.
     */
    subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
    dueDate: date('due_date'),
    /** Completada (FR-020). Completar conserva el registro; borrar es otra acción (FR-021). */
    completed: boolean('completed').notNull().default(false),
    /** Cuándo se completó. `null` mientras siga pendiente. */
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('agenda_items_user_semester_idx').on(table.userId, table.semesterId),
    index('agenda_items_subject_id_idx').on(table.subjectId),
    /**
     * La consulta de FR-022: los pendientes del semestre ordenados por vencimiento.
     *
     * Va sobre las cuatro columnas juntas porque es como se pide siempre —filtrar por usuario
     * y semestre, separar completadas y ordenar por fecha—, y así el índice resuelve la
     * ordenación sin pasar por un sort aparte.
     */
    index('agenda_items_user_due_idx').on(
      table.userId,
      table.semesterId,
      table.completed,
      table.dueDate,
    ),
  ],
);

/**
 * Ajustes del usuario.
 *
 * Una fila por usuario, creada al vuelo la primera vez que hace falta. De momento solo
 * guarda las semanas del semestre; es el sitio natural para lo que vayan pidiendo las
 * fases siguientes.
 */
export const userSettings = pgTable('user_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  /**
   * Semanas de clase por defecto, heredado de antes de la Fase 18.
   *
   * Desde la Fase 18 las semanas que cuentan son las del propio periodo
   * (`semesters.weeks`). Esta columna se conserva porque la migración la usó como origen del
   * valor de cada periodo existente, y borrarla habría destruido ese dato en el mismo paso
   * que lo copiaba. No la lee ningún cálculo: si alguien la cambiara a mano, ningún límite se
   * movería.
   */
  semesterWeeks: integer('semester_weeks').notNull().default(16),
  /**
   * Si el usuario quiere recibir recordatorios de sus entregas (FR-025).
   *
   * Arranca apagado: programar notificaciones sin que nadie las pida es justo lo que hace
   * que se desactiven para siempre. El usuario las enciende cuando las quiere.
   */
  remindersEnabled: boolean('reminders_enabled').notNull().default(false),
  /** Días de anticipación del aviso (FR-025). Uno de `REMINDER_LEAD_DAYS`. */
  reminderLeadDays: integer('reminder_lead_days').notNull().default(1),
  /**
   * Hora del día a la que se emite el aviso.
   *
   * Es un ajuste del usuario y no un campo de cada actividad porque `agenda_items.due_date`
   * es `date`, sin hora: "se entrega el 3 de septiembre" es un día de calendario (Fase 4).
   * Darle hora a cada entrega la convertiría en instante y reabriría el problema de husos que
   * esa decisión cerró; una hora fija da el momento que la notificación necesita sin tocar
   * el modelo de la agenda.
   *
   * `time` y no `timestamp`, por lo mismo que las horas del horario: es una hora de reloj
   * recurrente, no un instante.
   */
  reminderTimeOfDay: time('reminder_time_of_day').notNull().default('20:00'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Compartidos generados por un usuario (FR-028 a FR-033).
 *
 * La decisión que define la tabla: `payload` guarda una **copia congelada** del contenido en
 * el momento de generarlo, no referencias a `subjects` ni a `agenda_items`.
 *
 * Guardar identificadores habría sido menos escritura, pero rompe el Principio IV en los dos
 * extremos: si el emisor borra una materia, un enlace ya repartido se queda apuntando a nada
 * y falla al abrirlo; si la edita, el receptor recibe algo distinto de lo que la vista previa
 * le enseñó. Con la copia dentro, el compartido es una fotografía: lo que el emisor haga
 * después con su horario no lo toca.
 *
 * Es también lo que permite que la Fase 7 archive semestres sin invalidar compartidos.
 */
export const shares = pgTable(
  'shares',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      // Si se borra la cuenta se van sus compartidos: sin emisor no hay nada que mostrar en
      // la vista previa, y el contenido ya copiado por otros es de ellos y no cuelga de aquí.
      .references(() => users.id, { onDelete: 'cascade' }),
    /**
     * El código corto (FR-028), único en toda la tabla.
     *
     * Es la **única** credencial de las tres modalidades: el enlace lo incrusta y el QR
     * codifica el enlace. Un identificador por modalidad es exactamente cómo acabarían
     * entregando contenidos distintos, que es lo que FR-032 prohíbe.
     */
    code: text('code').notNull().unique(),
    /** `horario` o `agenda`, tal como los define `SHARE_KINDS` en `shared`. */
    kind: text('kind').notNull(),
    title: text('title').notNull(),
    /**
     * El contenido congelado, con la forma de `SharePayload`.
     *
     * `jsonb` y no `json`: PostgreSQL lo guarda ya analizado, así que leerlo no vuelve a
     * parsear el texto en cada consulta.
     */
    payload: jsonb('payload').notNull(),
    /**
     * Cuándo deja de servir.
     *
     * La caducidad no se guarda como estado sino como fecha, y el estado se deriva al
     * consultar: un estado almacenado exigiría un proceso que recorriera la tabla marcando
     * los vencidos, y hasta que corriera un compartido caducado seguiría diciendo "activo".
     */
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    /**
     * Cuándo lo revocó el emisor (FR-033). `null` mientras siga vigente.
     *
     * Se marca en lugar de borrar la fila: quien abra el enlace debe recibir "lo retiraron"
     * y no "no existe", que son cosas distintas y llevan a acciones distintas.
     */
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    /** Cuántas veces se aceptó. Cada aceptación es una copia independiente (Principio IV). */
    acceptedCount: integer('accepted_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Listar los compartidos propios es la consulta del emisor.
    index('shares_user_id_idx').on(table.userId),
    // Abrir un enlace o teclear un código busca por aquí, y es la ruta más caliente:
    // la resuelve el índice único de `code`.
  ],
);

/**
 * Relaciones entre usuarios: solicitudes, contactos y bloqueos (FR-040 a FR-042).
 *
 * La decisión que define la tabla: **una relación entre dos personas es una sola fila**, no
 * dos filas espejo. Guardarla dos veces —"mi contacto contigo" y "tu contacto conmigo"— es
 * cómo se llega a que una esté aceptada y la otra pendiente, y entonces "¿son contactos?"
 * —la pregunta de la que cuelga FR-044 en la Fase 10— deja de tener una respuesta única.
 *
 * Para que sea **una sola** fila hace falta que el par esté ordenado: `userAId` guarda
 * siempre el identificador menor y `userBId` el mayor (`orderedPair` en `shared`). Así la
 * relación entre A y B ocupa la misma fila se mire desde donde se mire, y el índice único
 * puede impedir la segunda. Sin el orden, dos personas tocando "agregar" a la vez crearían
 * dos filas —una en cada orden— que ningún índice rechazaría.
 *
 * Quién pidió y quién bloqueó se guardan aparte, en `requesterId` y `blockedById`, porque el
 * par ordenado deliberadamente pierde esa información: el orden lo fija el identificador, no
 * quién actuó.
 */
export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** El menor de los dos identificadores. Lo impone `orderedPair`, no el orden de llegada. */
    userAId: uuid('user_a_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** El mayor de los dos identificadores. */
    userBId: uuid('user_b_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /**
     * Quién envió la solicitud (FR-041).
     *
     * Es lo que distingue "la envié y espero" de "me la enviaron y puedo aceptar": el mismo
     * estado `pendiente` significa cosas distintas —y ofrece botones distintos— según el
     * lado. El par ordenado no lo puede decir porque su orden lo fija el identificador.
     */
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** `pendiente`, `aceptada` o `bloqueada`, tal como los define `CONTACT_STATUSES`. */
    status: text('status').notNull().default('pendiente'),
    /**
     * Quién bloqueó, cuando el estado es `bloqueada` (FR-042). `null` en cualquier otro caso.
     *
     * Se guarda porque el bloqueo es **asimétrico** en lo que se cuenta: a quien bloqueó hay
     * que ofrecerle desbloquear, y a quien fue bloqueado no se le dice nada —ver "te
     * bloquearon" convierte el bloqueo en un mensaje dirigido justo a la persona de la que
     * uno se quiere separar—. Sin esta columna no se puede escribir ninguno de los dos
     * mensajes correctamente.
     */
    blockedById: uuid('blocked_by_id').references(() => users.id, { onDelete: 'cascade' }),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    /** Cuándo se aceptó (FR-041). `null` mientras siga pendiente. */
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    /**
     * Una sola relación por pareja.
     *
     * Lo impone la base de datos y no solo el servicio, por lo mismo que el índice de un solo
     * semestre activo de la Fase 7: dos solicitudes simultáneas —A agrega a B mientras B
     * agrega a A, que es el caso real cuando dos personas se escanean el QR a la vez— pasarían
     * ambas la comprobación previa antes de que ninguna escribiera. El resultado serían dos
     * relaciones entre las mismas dos personas, con la posibilidad de tener estados distintos.
     *
     * Funciona porque el par va ordenado: sin eso, las dos filas serían (A,B) y (B,A) y el
     * índice las vería como parejas diferentes.
     */
    uniqueIndex('contacts_pair_unique').on(table.userAId, table.userBId),
    // Las dos consultas de la pantalla de contactos: lo mío contigo y todo lo mío.
    index('contacts_user_a_idx').on(table.userAId),
    index('contacts_user_b_idx').on(table.userBId),
  ],
);

/**
 * Publicaciones del perfil.
 *
 * De momento son texto. Los adjuntos —fotos y vídeos— son una fase aparte: exigen
 * almacenamiento de archivos, límites de tamaño y tipo y servido, que es infraestructura que
 * el proyecto todavía no tiene. La tabla queda lista para colgarlos sin rehacer lo escrito.
 *
 * No llevan `semesterId`, a diferencia de todo lo académico: una publicación es de la persona
 * y no del periodo que cursa, así que cerrar un semestre no la archiva ni la esconde.
 */
export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // El muro de alguien: sus publicaciones de la más reciente a la más antigua.
    index('posts_user_created_idx').on(table.userId, table.createdAt),
  ],
);

/**
 * Conversaciones entre dos personas (FR-043).
 *
 * **El par va ordenado**, con el mismo `orderedPair` que los contactos de la Fase 8, y por el
 * mismo motivo: una conversación entre A y B es un solo hecho, y sin el orden dos personas
 * escribiéndose a la vez crearían dos hilos —uno en cada orden— que ningún índice único
 * podría rechazar. Cada uno vería la mitad de lo dicho, que es el fallo que no se descubre
 * hasta que alguien pregunta por qué no le contestan.
 *
 * **No guarda si se puede escribir.** Eso se pregunta a `contacts` en cada envío (FR-044).
 * Copiarlo aquí sería un estado que queda viejo en cuanto alguien bloquea, y el bloqueo
 * dejaría de surtir efecto justo en el momento en que más importa.
 *
 * `updatedAt` es la fecha del último mensaje y es por lo que se ordena la bandeja. Se guarda
 * en vez de derivarse con un `MAX(sent_at)` por conversación, porque esa derivación es
 * exactamente la consulta que se hace en cada carga de la lista.
 */
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /**
     * El menor de los dos identificadores. Lo impone `orderedPair`, no el orden de llegada.
     *
     * **`restrict`**, por lo mismo que `messages.sender_id` (Fase 20): una conversación es de
     * dos personas, y en cascada el borrado de una vaciaría la bandeja de la otra.
     */
    userAId: uuid('user_a_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    /** El mayor de los dos identificadores. También `restrict`. */
    userBId: uuid('user_b_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    /**
     * Hasta cuándo ha leído cada uno.
     *
     * Se guarda una marca por lado y no una columna `leido` por mensaje: leer es siempre
     * "hasta aquí", así que una fecha dice lo mismo que marcar cincuenta filas, y abrir un
     * hilo largo pasa de ser una escritura de cincuenta filas a una de una.
     *
     * `null` significa que esa persona no ha leído nada todavía.
     */
    readByAAt: timestamp('read_by_a_at', { withTimezone: true }),
    readByBAt: timestamp('read_by_b_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /** Fecha del último mensaje. Es el orden de la bandeja. */
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    /**
     * Una sola conversación por pareja.
     *
     * Lo impone la base de datos y no solo el servicio, por lo mismo que el índice de los
     * contactos: dos personas escribiéndose por primera vez en el mismo instante pasarían
     * ambas la comprobación previa antes de que ninguna escribiera, y quedarían dos hilos
     * entre las mismas dos personas.
     */
    uniqueIndex('conversations_pair_unique').on(table.userAId, table.userBId),
    // Las bandejas: todas las conversaciones de uno, por fecha del último mensaje.
    index('conversations_user_a_idx').on(table.userAId, table.updatedAt),
    index('conversations_user_b_idx').on(table.userBId, table.updatedAt),
  ],
);

/**
 * Los mensajes (FR-043).
 *
 * No llevan `semesterId`, igual que las publicaciones de la Fase 8: una conversación es de
 * las personas, no del periodo que cursan, así que cerrar un semestre no la archiva ni la
 * esconde.
 *
 * `id` puede venir propuesto por el cliente, con la mecánica de la Fase 9: es lo que hace el
 * envío idempotente cuando la señal se cae con el mensaje ya escrito. Un mensaje duplicado en
 * un hilo es de los errores más visibles que existen.
 */
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    /**
     * Quién lo escribió.
     *
     * Hace falta pese a que la conversación ya tiene sus dos personas: el par de la
     * conversación va ordenado por identificador y deliberadamente pierde quién es quién,
     * exactamente igual que `requesterId` en los contactos.
     */
    /**
     * **`restrict`, no `cascade`** (Fase 20).
     *
     * Es la única referencia a `users` del esquema que no cae en cascada, y es deliberado: un
     * mensaje que Ana le mandó a Beto vive en la conversación de Beto y también es suyo. Con
     * `cascade`, un `DELETE` sobre la fila de Ana se llevaría medio hilo de Beto y dejaría sus
     * respuestas colgando de nada.
     *
     * El borrado de cuenta de la Fase 20 no borra esa fila —la vacía y la anonimiza, ver
     * `users.anonymizedAt`—, así que en la operación normal esta restricción nunca se dispara.
     * Está para el caso que no es normal: un `DELETE FROM users` escrito a mano en una consola
     * de psql. Con `restrict`, PostgreSQL lo rechaza y la conversación de un tercero se salva;
     * con `cascade`, se ejecuta en silencio y no hay forma de saber qué se perdió.
     */
    senderId: uuid('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    text: text('text').notNull(),
    /**
     * Cuándo lo borró su autor. `null` si sigue vigente.
     *
     * Se marca en lugar de borrar la fila: un hilo del que desaparecen renglones se lee mal
     * —las respuestas quedan colgando de nada— y quien ya lo leyó no puede desleerlo. El
     * texto **sí** se vacía al borrar, para que no quede guardado lo que el autor retiró.
     */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    /**
     * El hilo: los mensajes de una conversación por orden de envío.
     *
     * Es el índice del que cuelga la paginación por cursor, que es la consulta más frecuente
     * de la fase —se ejecuta cada vez que alguien abre un hilo o sube a por lo anterior—.
     */
    index('messages_conversation_sent_idx').on(table.conversationId, table.sentAt),
  ],
);

export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  semesters: many(semesters),
  subjects: many(subjects),
  scheduleBlocks: many(scheduleBlocks),
  absenceRecords: many(absenceRecords),
  agendaItems: many(agendaItems),
  settings: one(userSettings),
  shares: many(shares),
  posts: many(posts),
  messages: many(messages),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  user: one(users, { fields: [posts.userId], references: [users.id] }),
}));

/**
 * Las dos referencias a `users` se nombran, por lo mismo que en `contacts`: Drizzle no puede
 * adivinar cuál es cuál cuando hay varias a la misma tabla.
 */
export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  userA: one(users, {
    fields: [conversations.userAId],
    references: [users.id],
    relationName: 'conversation_user_a',
  }),
  userB: one(users, {
    fields: [conversations.userBId],
    references: [users.id],
    relationName: 'conversation_user_b',
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));

/**
 * Las tres referencias a `users` se nombran explícitamente.
 *
 * Drizzle no puede adivinar cuál de ellas es cuál cuando hay varias a la misma tabla, y sin
 * los nombres la relación quedaría ambigua.
 */
export const contactsRelations = relations(contacts, ({ one }) => ({
  userA: one(users, {
    fields: [contacts.userAId],
    references: [users.id],
    relationName: 'contact_user_a',
  }),
  userB: one(users, {
    fields: [contacts.userBId],
    references: [users.id],
    relationName: 'contact_user_b',
  }),
  requester: one(users, {
    fields: [contacts.requesterId],
    references: [users.id],
    relationName: 'contact_requester',
  }),
}));

export const semestersRelations = relations(semesters, ({ one, many }) => ({
  user: one(users, { fields: [semesters.userId], references: [users.id] }),
  subjects: many(subjects),
  scheduleBlocks: many(scheduleBlocks),
  absenceRecords: many(absenceRecords),
  agendaItems: many(agendaItems),
}));

export const sharesRelations = relations(shares, ({ one }) => ({
  user: one(users, { fields: [shares.userId], references: [users.id] }),
}));

export const agendaItemsRelations = relations(agendaItems, ({ one }) => ({
  user: one(users, { fields: [agendaItems.userId], references: [users.id] }),
  semester: one(semesters, {
    fields: [agendaItems.semesterId],
    references: [semesters.id],
  }),
  subject: one(subjects, { fields: [agendaItems.subjectId], references: [subjects.id] }),
}));

export const absenceRecordsRelations = relations(absenceRecords, ({ one }) => ({
  user: one(users, { fields: [absenceRecords.userId], references: [users.id] }),
  semester: one(semesters, {
    fields: [absenceRecords.semesterId],
    references: [semesters.id],
  }),
  subject: one(subjects, { fields: [absenceRecords.subjectId], references: [subjects.id] }),
  block: one(scheduleBlocks, {
    fields: [absenceRecords.blockId],
    references: [scheduleBlocks.id],
  }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, { fields: [userSettings.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  user: one(users, { fields: [subjects.userId], references: [users.id] }),
  semester: one(semesters, { fields: [subjects.semesterId], references: [semesters.id] }),
  blocks: many(scheduleBlocks),
  absences: many(absenceRecords),
  agendaItems: many(agendaItems),
}));

export const scheduleBlocksRelations = relations(scheduleBlocks, ({ one }) => ({
  user: one(users, { fields: [scheduleBlocks.userId], references: [users.id] }),
  semester: one(semesters, {
    fields: [scheduleBlocks.semesterId],
    references: [semesters.id],
  }),
  subject: one(subjects, { fields: [scheduleBlocks.subjectId], references: [subjects.id] }),
}));

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;
export type SubjectRow = typeof subjects.$inferSelect;
export type NewSubjectRow = typeof subjects.$inferInsert;
export type ScheduleBlockRow = typeof scheduleBlocks.$inferSelect;
export type NewScheduleBlockRow = typeof scheduleBlocks.$inferInsert;
export type AbsenceRecordRow = typeof absenceRecords.$inferSelect;
export type NewAbsenceRecordRow = typeof absenceRecords.$inferInsert;
export type AgendaItemRow = typeof agendaItems.$inferSelect;
export type NewAgendaItemRow = typeof agendaItems.$inferInsert;
export type UserSettingsRow = typeof userSettings.$inferSelect;
export type SemesterRow = typeof semesters.$inferSelect;
export type NewSemesterRow = typeof semesters.$inferInsert;
export type ShareRow = typeof shares.$inferSelect;
export type NewShareRow = typeof shares.$inferInsert;
export type ContactRow = typeof contacts.$inferSelect;
export type NewContactRow = typeof contacts.$inferInsert;
export type PostRow = typeof posts.$inferSelect;
export type NewPostRow = typeof posts.$inferInsert;
export type ConversationRow = typeof conversations.$inferSelect;
export type NewConversationRow = typeof conversations.$inferInsert;
export type MessageRow = typeof messages.$inferSelect;
export type NewMessageRow = typeof messages.$inferInsert;
