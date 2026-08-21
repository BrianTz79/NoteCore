import { and, eq, lt, ne, or } from 'drizzle-orm';
import { esCorreoDePrueba } from '@notecore/shared';
import type {
  AuthenticatedUser,
  ChangePasswordInput,
  DeleteAccountInput,
  LoginInput,
  RegisterInput,
  SessionClient,
  SessionInfo,
  UpdateProfileInput,
} from '@notecore/shared';
import { db } from '../db/client.js';
import {
  absenceRecords,
  agendaItems,
  contacts,
  posts,
  reports,
  scheduleBlocks,
  semesters,
  sessions,
  shares,
  subjects,
  userSettings,
  users,
  type UserRow,
} from '../db/schema.js';
import { errors, isUniqueViolation } from '../lib/errors.js';
import { hashPassword, verifyPassword, wastePasswordComparison } from '../lib/passwords.js';
import { generateRefreshToken, hashRefreshToken, signAccessToken } from '../lib/tokens.js';
import { config } from '../config.js';
import { disconnectUser } from './live.js';

/**
 * Lógica de cuentas y sesión.
 *
 * Principio II: aquí vive toda la regla. Las rutas solo traducen HTTP y los clientes solo
 * presentan. Ninguna función de este archivo confía en un identificador de usuario que
 * venga del cliente (Principio III): siempre llega desde el token ya verificado.
 */

/** Lo que devuelve un registro o un login: perfil, tokens y la sesión creada. */
export interface IssuedSession {
  readonly user: AuthenticatedUser;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
}

/** Convierte una fila a perfil público del propio usuario, sin el hash de contraseña. */
function toAuthenticatedUser(row: UserRow): AuthenticatedUser {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    displayName: row.displayName,
    isAdmin: row.isAdmin,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Abre una sesión: crea la fila y emite los dos tokens.
 *
 * Cada llamada crea una sesión independiente, así que entrar en la app no toca la de la
 * web ni al revés (FR-002).
 */
async function openSession(user: UserRow, client: SessionClient): Promise<IssuedSession> {
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + config.refreshTokenSeconds * 1000);

  const [session] = await db
    .insert(sessions)
    .values({
      userId: user.id,
      refreshTokenHash: hashRefreshToken(refreshToken),
      client,
      expiresAt,
    })
    .returning();

  if (!session) throw new Error('No se pudo crear la sesión');

  return {
    user: toAuthenticatedUser(user),
    accessToken: signAccessToken({ sub: user.id, sid: session.id, client }),
    refreshToken,
    expiresIn: config.accessTokenSeconds,
  };
}

export async function register(
  input: RegisterInput,
  client: SessionClient,
): Promise<IssuedSession> {
  // Se comprueba antes para dar un error por campo; la restricción UNIQUE de la base de
  // datos sigue siendo la que decide en caso de carrera (se captura más abajo).
  const existing = await db.query.users.findFirst({
    where: (table, { or, eq: equals }) =>
      or(equals(table.email, input.email), equals(table.username, input.username)),
  });

  if (existing) {
    throw existing.email === input.email ? errors.emailEnUso() : errors.usuarioEnUso();
  }

  const passwordHash = await hashPassword(input.password);

  let created: UserRow | undefined;
  try {
    [created] = await db
      .insert(users)
      .values({
        email: input.email,
        username: input.username,
        displayName: input.displayName,
        passwordHash,
        /**
         * Si es una cuenta de prueba se decide **aquí, una vez**, y no se vuelve a mirar.
         *
         * El panel de la Fase 25 la excluirá de todos sus números. Ver
         * `users.isTestAccount` en el esquema para el porqué de la columna.
         */
        isTestAccount: esCorreoDePrueba(input.email),
      })
      .returning();
  } catch (error) {
    // 23505 = unique_violation. Dos registros simultáneos con el mismo correo o usuario.
    if (isUniqueViolation(error, 'users_email_unique')) throw errors.emailEnUso();
    if (isUniqueViolation(error, 'users_username_unique')) throw errors.usuarioEnUso();
    throw error;
  }

  if (!created) throw new Error('No se pudo crear la cuenta');

  return openSession(created, client);
}

export async function login(input: LoginInput, client: SessionClient): Promise<IssuedSession> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, input.email),
  });

  if (!user) {
    // Se compara contra un hash de descarte para que la respuesta tarde lo mismo que con
    // un correo existente: si no, el tiempo revelaría qué correos están registrados.
    await wastePasswordComparison(input.password);
    throw errors.credencialesInvalidas();
  }

  if (!(await verifyPassword(input.password, user.passwordHash))) {
    throw errors.credencialesInvalidas();
  }

  return openSession(user, client);
}

/**
 * Renueva el token de acceso a partir del refresh token.
 *
 * El refresh token **rota**: el anterior deja de servir en cuanto se usa. Si un token
 * robado se usa después del legítimo, ya no vale; si se usa antes, el usuario legítimo
 * pierde la sesión y lo nota, que es la señal que interesa.
 */
export async function refresh(
  refreshToken: string,
  client: SessionClient,
): Promise<IssuedSession> {
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.refreshTokenHash, hashRefreshToken(refreshToken)),
  });

  if (!session) throw errors.sesionExpirada();

  if (session.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, session.id));
    throw errors.sesionExpirada();
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  if (!user) throw errors.sesionExpirada();

  const nextRefreshToken = generateRefreshToken();

  await db
    .update(sessions)
    .set({
      refreshTokenHash: hashRefreshToken(nextRefreshToken),
      lastUsedAt: new Date(),
      // La ventana se recalcula desde ahora: usar la app a diario mantiene la sesión viva.
      expiresAt: new Date(Date.now() + config.refreshTokenSeconds * 1000),
    })
    .where(eq(sessions.id, session.id));

  return {
    user: toAuthenticatedUser(user),
    accessToken: signAccessToken({ sub: user.id, sid: session.id, client }),
    refreshToken: nextRefreshToken,
    expiresIn: config.accessTokenSeconds,
  };
}

/**
 * Cierra una sesión concreta. Las demás del usuario siguen abiertas (FR-002).
 *
 * **También cierra sus canales en vivo** (Fase 10). Un canal WebSocket verifica la sesión una
 * sola vez, en el handshake, y después no vuelve a comprobarla —esa es su naturaleza—, así
 * que sin esto seguiría entregando mensajes a un dispositivo del que el usuario acaba de
 * salir. Que el token caducara en quince minutos no sirve de consuelo: son quince minutos de
 * conversación privada llegando a una sesión cerrada.
 */
export async function logout(sessionId: string): Promise<void> {
  // Se lee antes de borrar: después ya no hay de dónde sacar de quién era la sesión.
  const session = await db.query.sessions.findFirst({ where: eq(sessions.id, sessionId) });

  await db.delete(sessions).where(eq(sessions.id, sessionId));

  if (session) disconnectUser(session.userId);
}

export async function getProfile(userId: string): Promise<AuthenticatedUser> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw errors.noEncontrado('No se encontró tu cuenta.');
  return toAuthenticatedUser(user);
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<AuthenticatedUser> {
  if (input.username !== undefined) {
    const taken = await db.query.users.findFirst({
      // El propio usuario puede "cambiar" su nombre al que ya tiene sin chocar consigo mismo.
      where: and(eq(users.username, input.username), ne(users.id, userId)),
    });
    if (taken) throw errors.usuarioEnUso();
  }

  let updated: UserRow | undefined;
  try {
    [updated] = await db
      .update(users)
      .set({
        ...(input.displayName !== undefined && { displayName: input.displayName }),
        ...(input.username !== undefined && { username: input.username }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
  } catch (error) {
    if (isUniqueViolation(error, 'users_username_unique')) throw errors.usuarioEnUso();
    throw error;
  }

  if (!updated) throw errors.noEncontrado('No se encontró tu cuenta.');
  return toAuthenticatedUser(updated);
}

/**
 * Cambia la contraseña y cierra las demás sesiones.
 *
 * Cerrar el resto es el comportamiento esperado: quien cambia su contraseña suele hacerlo
 * porque sospecha que alguien más tiene acceso. La sesión actual se conserva para no
 * expulsar al usuario de la pantalla en la que está.
 */
export async function changePassword(
  userId: string,
  currentSessionId: string,
  input: ChangePasswordInput,
): Promise<void> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw errors.noEncontrado('No se encontró tu cuenta.');

  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw errors.validacion('La contraseña actual no es correcta.', [
      { field: 'currentPassword', message: 'La contraseña actual no es correcta' },
    ]);
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(input.newPassword), updatedAt: new Date() })
    .where(eq(users.id, userId));

  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.id, currentSessionId)));
}

/** Sesiones abiertas del usuario, marcando cuál es la actual. */
export async function listSessions(
  userId: string,
  currentSessionId: string,
): Promise<readonly SessionInfo[]> {
  const rows = await db.query.sessions.findMany({
    where: eq(sessions.userId, userId),
    orderBy: (table, { desc }) => desc(table.lastUsedAt),
  });

  return rows.map((row) => ({
    id: row.id,
    client: row.client === 'mobile' ? 'mobile' : 'web',
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
    expiresAt: row.expiresAt,
    isCurrent: row.id === currentSessionId,
  }));
}

/**
 * Cierra una sesión ajena del propio usuario.
 *
 * Principio III: el `WHERE` incluye `userId` para que nadie pueda cerrar la sesión de otra
 * persona pasando un identificador que no le pertenece.
 */
export async function revokeSession(userId: string, sessionId: string): Promise<void> {
  const deleted = await db
    .delete(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
    .returning({ id: sessions.id });

  if (deleted.length === 0) throw errors.noEncontrado('Esa sesión ya no existe.');

  /**
   * Se cortan **todos** los canales del usuario, no solo los de la sesión revocada.
   *
   * El registro de canales guarda a quién pertenece cada uno, no con qué sesión se abrió, así
   * que no hay forma de cortar solo los de esa. Cerrar de más es la equivocación correcta: el
   * resto de sus dispositivos reconecta solo en un segundo —la reconexión con espera creciente
   * ya está escrita— mientras que cerrar de menos dejaría el dispositivo revocado recibiendo
   * conversación privada, que es justo lo que el usuario acaba de pedir que no pase.
   */
  disconnectUser(userId);
}

/* ─────────────────────────── Borrado de cuenta (Fase 20) ─────────────────────────── */

/**
 * Borra la cuenta y todos sus datos, sin vuelta atrás.
 *
 * ## Qué se destruye y qué sobrevive
 *
 * Se destruye **todo lo que es de esta persona**: horario, materias, faltas, agenda,
 * periodos —archivados incluidos—, publicaciones, comparticiones, contactos, ajustes y todas
 * sus sesiones. Casi todo cae solo por las cascadas que el esquema ya tenía; lo que no, se
 * borra explícitamente aquí.
 *
 * Sobreviven **los mensajes que envió a otras personas**, porque también son de ellas: un
 * mensaje que Ana le mandó a Beto vive en la conversación de Beto, y borrarlo dejaría sus
 * respuestas colgando de nada. Dejan de estar ligados a Ana —el remitente pasa a ser una fila
 * anonimizada, sin correo, sin `@usuario` y sin nombre— y esa es la forma que la política de
 * Play permite: retener datos **plenamente anonimizados**, declarándolo antes. La Fase 19 lo
 * declara, y por eso esta fase va después.
 *
 * ## Por qué la fila de `users` se vacía en lugar de borrarse
 *
 * Está razonado en `users.anonymizedAt`, en el esquema. En corto: `conversations` guarda el
 * par de personas con un índice único, así que reapuntar los hilos de todas las cuentas
 * borradas a un único centinela global haría chocar dos hilos distintos de la misma persona.
 * Una lápida por cuenta borrada conserva cada par distinto.
 *
 * Lo que queda tras esto es un identificador y una fecha. **No es una cuenta desactivada**:
 * no hay contraseña que satisfacer, no hay correo con el que entrar, y no queda un solo dato
 * que permita saber de quién fue.
 *
 * ## Por qué en una transacción
 *
 * Porque a mitad son doce tablas. Si el proceso muere entre el borrado del horario y el
 * vaciado de `users`, la cuenta quedaría entrando con su contraseña y sin sus datos, que es
 * peor que cualquiera de los dos extremos. O se va todo, o no se va nada y la persona puede
 * volver a intentarlo.
 */
export async function deleteAccount(
  userId: string,
  input: DeleteAccountInput,
): Promise<void> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw errors.noEncontrado('No se encontró tu cuenta.');

  /**
   * La contraseña se comprueba **aquí**, en el servidor, aunque el formulario ya la pidiera.
   *
   * Principio II: la validación del cliente es comodidad, no seguridad. Sin esto, quien
   * encontrara un teléfono con la sesión abierta podría vaciar la cuenta llamando a la ruta
   * directamente, sin saber la contraseña.
   */
  if (!(await verifyPassword(input.password, user.passwordHash))) {
    throw errors.validacion('La contraseña no es correcta.', [
      { field: 'password', message: 'La contraseña no es correcta' },
    ]);
  }

  await db.transaction(async (tx) => {
    /*
     * El orden importa donde hay claves foráneas entre las propias tablas del usuario, y no
     * importa donde solo cuelgan de `users`. Se borra de las hojas hacia la raíz.
     */

    // Faltas y sesiones de clase cuelgan de materias y periodos; van primero.
    await tx.delete(absenceRecords).where(eq(absenceRecords.userId, userId));
    await tx.delete(scheduleBlocks).where(eq(scheduleBlocks.userId, userId));
    await tx.delete(agendaItems).where(eq(agendaItems.userId, userId));
    await tx.delete(subjects).where(eq(subjects.userId, userId));
    await tx.delete(semesters).where(eq(semesters.userId, userId));

    await tx.delete(posts).where(eq(posts.userId, userId));
    await tx.delete(shares).where(eq(shares.userId, userId));
    await tx.delete(userSettings).where(eq(userSettings.userId, userId));

    /**
     * Los contactos: las relaciones en las que aparece, esté en el lado que esté.
     *
     * Se borran de verdad y no se anonimizan, a diferencia de los mensajes: una relación no
     * es contenido de nadie, es un vínculo entre dos personas, y cuando una se va el vínculo
     * deja de existir. A la otra persona simplemente le desaparece de su lista.
     */
    await tx
      .delete(contacts)
      .where(
        or(
          eq(contacts.userAId, userId),
          eq(contacts.userBId, userId),
          eq(contacts.requesterId, userId),
        ),
      );

    /**
     * Los reportes en los que aparece, por cualquiera de los dos lados (Fase 21).
     *
     * **Se borran a mano y no por la cascada de su clave foránea**, y esto es una trampa que
     * conviene entender antes de tocarla: `reports` declara `onDelete: 'cascade'` hacia
     * `users`, pero el borrado de cuenta **no borra la fila de `users`** —la vacía y la
     * anonimiza, ver la lápida de más abajo—, así que esa cascada no se dispara nunca en la
     * operación normal. Confiar en ella dejaría aquí los reportes de una persona que ya no
     * está, con el texto que escribió, apuntando a «Usuario eliminado». Se comprobó
     * ejecutándolo.
     *
     * Se van los dos lados:
     *
     * - Los que **ella hizo**: son manifestaciones suyas, y se van con lo demás suyo.
     * - Los que hay **contra ella**: si su contenido ya no existe, no queda nada que moderar,
     *   y conservar la acusación —con la copia del texto dentro— sería guardar el
     *   señalamiento de una persona por algo que se destruyó. La política de privacidad lo
     *   promete explícitamente.
     */
    await tx
      .delete(reports)
      .where(or(eq(reports.reporterId, userId), eq(reports.authorId, userId)));

    /**
     * Las sesiones, que es lo que cierra el teléfono y el navegador a la vez.
     *
     * Va dentro de la transacción para que no exista un instante en el que la cuenta esté
     * vaciada pero su sesión siga sirviendo peticiones.
     */
    await tx.delete(sessions).where(eq(sessions.userId, userId));

    /**
     * Y la lápida.
     *
     * El correo y el `@usuario` llevan el identificador de la fila —que ya no dice nada de
     * nadie— solo para no chocar con los índices únicos de la tabla. El hash es una cadena
     * que **no es un hash bcrypt válido**, así que `verifyPassword` devuelve `false` para
     * cualquier entrada: la cuenta no se puede abrir ni acertando la contraseña de antes.
     */
    await tx
      .update(users)
      .set({
        email: `eliminado+${userId}@notecore.invalid`,
        username: `eliminado_${userId.replace(/-/g, '')}`,
        displayName: 'Usuario eliminado',
        passwordHash: 'cuenta-eliminada',
        bio: null,
        career: null,
        school: null,
        age: null,
        // El más cerrado de los dos valores que existen (`todos` / `contactos`). Con la fila
        // ya vacía y sin contactos, no queda nada que mostrar de ninguna forma; es cinturón
        // sobre tirantes por si algún día se añade un camino de lectura que no se prevé hoy.
        profileVisibility: 'contactos',
        isAdmin: false,
        anonymizedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  });

  /**
   * Y se cortan sus canales en vivo, por lo mismo que en `logout`: un WebSocket comprueba la
   * sesión una sola vez, en el handshake, así que sin esto seguiría entregando mensajes a un
   * dispositivo cuya cuenta acaba de dejar de existir.
   *
   * Va **fuera** de la transacción: no toca la base de datos y, si fallara, no debería
   * deshacer un borrado ya consumado.
   */
  disconnectUser(userId);
}

/** Borra las sesiones caducadas. Se ejecuta periódicamente desde el arranque de la API. */
export async function purgeExpiredSessions(): Promise<number> {
  const deleted = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date()))
    .returning({ id: sessions.id });
  return deleted.length;
}

/*
 * `isUniqueViolation` vive ahora en `lib/errors.ts`.
 *
 * La versión que había aquí solo miraba el nivel superior del error, y Drizzle envuelve el
 * del driver en un `DrizzleQueryError`: el `23505` queda en `cause` y la comprobación no lo
 * veía nunca. El efecto era que dos registros simultáneos con el mismo `@usuario` —o el
 * mismo correo— respondían 500 "ocurrió un error inesperado" en lugar de "ese nombre ya está
 * tomado", que es lo que el formulario necesita para marcar el campo.
 */
