import {
  and,
  count,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type {
  PanelActividad,
  PanelAltaSemanal,
  PanelEmbudo,
  PanelInventario,
  PanelResumen,
  PanelRetencion,
  PanelSalud,
  PanelVersion,
} from '@notecore/shared';
import { db } from '../db/client.js';
import {
  absenceRecords,
  agendaItems,
  contacts,
  conversations,
  messages,
  posts,
  scheduleBlocks,
  semesters,
  sessions,
  shares,
  subjects,
  users,
} from '../db/schema.js';
import { countPendingReports } from './moderation.js';

/**
 * Los números del panel de operación (Fase 25).
 *
 * ## Qué mira y qué no
 *
 * **Solo cuenta.** No hay una sola consulta en este archivo que devuelva el texto de un
 * mensaje, el título de una tarea, el nombre de una materia o el `@usuario` de nadie. Cada
 * `select` de aquí es un `count`, un `sum` o un `group by` sobre una columna que no
 * identifica a nadie. Es el Principio III aplicado a la única pantalla del producto que, por
 * definición, mira datos de todos: puede saber **cuántos**, nunca **quién**.
 *
 * Si algún día hace falta un número que solo se pueda obtener leyendo el contenido de
 * alguien, el número no se obtiene. La política de privacidad de la Fase 19 promete
 * exactamente esto, y las dos tienen que seguir diciendo lo mismo.
 *
 * ## Por qué no se cachea todavía
 *
 * `COUNT(*)` sobre tablas que crecen se hace lento, y ese es un problema real — pero hoy no
 * lo es: con los usuarios que hay, las trece consultas juntas tardan milisegundos, y las
 * lanza una sola persona cuando abre el panel. Cachear ahora sería añadir invalidación,
 * ventana de frescura y una respuesta que puede mentir por unos minutos, a cambio de nada.
 *
 * **Cuándo tocará hacerlo**: cuando abrir el panel se note en la latencia de la API que están
 * usando los estudiantes. La forma es un cache de unos minutos delante de `resumen()`, que
 * este archivo deja fácil por devolver todo de una sola función.
 */

/**
 * Qué cuentas entran en las estadísticas: las reales y vivas.
 *
 * Se define **una vez** y lo usan todas las consultas de este archivo. Es el criterio del que
 * cuelga la honestidad del panel entero, y repetirlo en cada `where` es cómo se acaba con una
 * sección que cuenta 315 y otra que cuenta 1 en la misma pantalla.
 *
 * Excluye dos cosas distintas:
 *
 * - **Las anonimizadas** (Fase 20): ya no son usuarios, son lápidas que conservan los mensajes que
 *   esa persona envió a otras. Se cuentan aparte, en `cuentasBorradas`
 * - **Las de prueba**: las que se crean al verificar una fase, marcadas al registrarse por su
 *   dominio. Antes de existir esta marca había 315 cuentas en producción y solo una era real
 */
const CUENTA_REAL = and(isNull(users.anonymizedAt), eq(users.isTestAccount, false));

/**
 * Los identificadores de las cuentas que cuentan, como subconsulta.
 *
 * Lo usan los conteos que van sobre **otras** tablas: las materias de una cuenta de prueba también
 * inflaban el panel, no solo la cuenta. Es un `IN` sobre una subconsulta y no un `JOIN` porque las
 * doce consultas de inventario son conteos simples y un `JOIN` las obligaría a agrupar.
 */
const IDS_REALES = db.select({ id: users.id }).from(users).where(CUENTA_REAL);

/**
 * Un conteo simple de una tabla, con condición opcional.
 *
 * Existe para no repetir trece veces el mismo `select({ n: count() }).from(...)` con su
 * desestructurado y su `?? 0`. `count()` de Drizzle ya devuelve un número, no el texto que
 * PostgreSQL manda por defecto para `bigint`.
 */
async function contar(tabla: PgTable, condicion?: SQL): Promise<number> {
  const consulta = db.select({ n: count() }).from(tabla);
  const [fila] = await (condicion === undefined ? consulta : consulta.where(condicion));
  return fila?.n ?? 0;
}

/** Lo que ya está en la base, tabla por tabla. */
async function inventario(): Promise<PanelInventario> {
  /**
   * Cuántos tienen al menos una materia.
   *
   * `countDistinct` sobre `subjects.userId` y no un `join` con `users`: la pregunta es
   * cuántos usuarios aparecen en esa tabla, y contar los distintos lo responde con una sola
   * pasada sobre un índice que ya existe.
   */
  const [conHorarioFila] = await db
    .select({ n: sql<number>`count(distinct ${subjects.userId})::int` })
    .from(subjects)
    .where(inArray(subjects.userId, IDS_REALES));

  const [aceptadasFila] = await db
    .select({ n: sql<number>`coalesce(sum(${shares.acceptedCount}), 0)::int` })
    .from(shares)
    .where(inArray(shares.userId, IDS_REALES));

  const [
    usuarios,
    cuentasBorradas,
    materias,
    sesionesDeClase,
    faltas,
    tareas,
    publicaciones,
    mensajes,
    conversacionesTotal,
    contactosTotal,
    periodosActivos,
    periodosArchivados,
    comparticionesCreadas,
  ] = await Promise.all([
    // Las cuentas borradas no son usuarios: contarlas inflaría el número que más se mira.
    // Las de prueba tampoco, por lo mismo (ver `CUENTA_REAL`).
    contar(users, CUENTA_REAL),
    contar(users, isNotNull(users.anonymizedAt)),
    /*
     * Todo lo demás se filtra también por `IDS_REALES`, no solo el conteo de usuarios: las
     * materias, las faltas y los mensajes de una cuenta de prueba inflaban el panel igual que
     * la cuenta. Excluir la cuenta y contar sus datos habría sido peor que no excluir nada —
     * la pantalla diría «1 usuario · 246 materias» y no habría forma de entenderlo.
     */
    contar(subjects, inArray(subjects.userId, IDS_REALES)),
    contar(scheduleBlocks, inArray(scheduleBlocks.userId, IDS_REALES)),
    contar(absenceRecords, inArray(absenceRecords.userId, IDS_REALES)),
    contar(agendaItems, inArray(agendaItems.userId, IDS_REALES)),
    contar(posts, inArray(posts.userId, IDS_REALES)),
    // Los borrados por su autor no cuentan: son huecos, no mensajes.
    contar(messages, and(isNull(messages.deletedAt), inArray(messages.senderId, IDS_REALES))),
    // Una conversación cuenta si **alguno** de los dos lados es real: un hilo entre una cuenta
    // real y una de prueba sigue siendo un hilo que existe en la bandeja de alguien real.
    contar(
      conversations,
      or(
        inArray(conversations.userAId, IDS_REALES),
        inArray(conversations.userBId, IDS_REALES),
      ),
    ),
    contar(
      contacts,
      and(
        eq(contacts.status, 'aceptada'),
        or(inArray(contacts.userAId, IDS_REALES), inArray(contacts.userBId, IDS_REALES)),
      ),
    ),
    contar(
      semesters,
      and(eq(semesters.status, 'activo'), inArray(semesters.userId, IDS_REALES)),
    ),
    contar(
      semesters,
      and(eq(semesters.status, 'archivado'), inArray(semesters.userId, IDS_REALES)),
    ),
    contar(shares, inArray(shares.userId, IDS_REALES)),
  ]);

  return {
    usuarios,
    cuentasBorradas,
    conHorario: conHorarioFila?.n ?? 0,
    materias,
    sesionesDeClase,
    faltas,
    tareas,
    publicaciones,
    mensajes,
    conversaciones: conversacionesTotal,
    contactos: contactosTotal,
    periodosActivos,
    periodosArchivados,
    comparticionesCreadas,
    comparticionesAceptadas: aceptadasFila?.n ?? 0,
  };
}

/**
 * Altas por semana, las últimas doce.
 *
 * `date_trunc('week', ...)` agrupa por lunes, que es como PostgreSQL entiende una semana
 * (ISO-8601) y como se lee un calendario escolar. Se limita a doce porque más filas no caben
 * en la pantalla sin desplazar y la pregunta es «cómo va últimamente», no el histórico.
 */
async function altasPorSemana(): Promise<readonly PanelAltaSemanal[]> {
  const filas = await db
    .select({
      semana: sql<string>`to_char(date_trunc('week', ${users.createdAt}), 'YYYY-MM-DD')`,
      altas: sql<number>`count(*)::int`,
    })
    .from(users)
    .where(CUENTA_REAL)
    .groupBy(sql`date_trunc('week', ${users.createdAt})`)
    .orderBy(sql`date_trunc('week', ${users.createdAt}) desc`)
    .limit(12);

  return filas;
}

/** Quién ha entrado y desde dónde. */
async function actividad(): Promise<PanelActividad> {
  const ahora = Date.now();
  const hace = (dias: number) => new Date(ahora - dias * 24 * 60 * 60 * 1000);

  /**
   * «Activo» se mide sobre `sessions.lastUsedAt`, que es lo que hay.
   *
   * Se cuentan **usuarios distintos** y no sesiones: alguien con el teléfono y el navegador
   * abiertos es una persona, no dos, y contar sesiones haría que la cifra subiera al abrir
   * un segundo dispositivo en lugar de al llegar alguien nuevo.
   */
  const activos = async (dias: number): Promise<number> => {
    const [fila] = await db
      .select({ n: sql<number>`count(distinct ${sessions.userId})::int` })
      .from(sessions)
      .where(and(gte(sessions.lastUsedAt, hace(dias)), inArray(sessions.userId, IDS_REALES)));
    return fila?.n ?? 0;
  };

  const porCliente = await db
    .select({ client: sessions.client, n: count() })
    .from(sessions)
    .where(and(gt(sessions.expiresAt, new Date()), inArray(sessions.userId, IDS_REALES)))
    .groupBy(sessions.client);

  const [activosHoy, activos7Dias, activos30Dias] = await Promise.all([
    activos(1),
    activos(7),
    activos(30),
  ]);

  return {
    activosHoy,
    activos7Dias,
    activos30Dias,
    sesionesApp: porCliente.find((fila) => fila.client === 'mobile')?.n ?? 0,
    sesionesWeb: porCliente.find((fila) => fila.client === 'web')?.n ?? 0,
  };
}

/**
 * Qué versión tiene instalada cada quien.
 *
 * Solo se miran las sesiones **vivas**: una caducada dice qué versión usaba alguien que ya
 * no está, y eso no ayuda a decidir si se puede dejar de dar soporte a una versión vieja.
 */
async function versiones(): Promise<readonly PanelVersion[]> {
  const filas = await db
    .select({
      client: sessions.client,
      version: sessions.clientVersion,
      sesiones: count(),
    })
    .from(sessions)
    .where(and(gt(sessions.expiresAt, new Date()), inArray(sessions.userId, IDS_REALES)))
    .groupBy(sessions.client, sessions.clientVersion)
    .orderBy(sessions.client, sessions.clientVersion);

  return filas.map((fila) => ({
    client: fila.client === 'mobile' ? 'mobile' : 'web',
    version: fila.version,
    sesiones: fila.sesiones,
  }));
}

/** Salud del servicio. */
async function salud(): Promise<PanelSalud> {
  const [fila] = await db.execute<{ tamano: string }>(
    sql`select pg_size_pretty(pg_database_size(current_database())) as tamano`,
  );

  return {
    // `process.uptime()` es de **este** proceso: al reiniciar el contenedor vuelve a cero, y
    // eso es exactamente lo que interesa saber —si la API se reinició sin que nadie lo pidiera.
    apiUptimeSegundos: Math.floor(process.uptime()),
    tamanoBaseDatos: fila?.tamano ?? 'desconocido',
    calculadoEn: new Date(),
  };
}

/** Cuántos vuelven a los 7 y a los 30 días. */
async function retencion(): Promise<PanelRetencion> {
  const ahora = Date.now();
  const hace = (dias: number) => new Date(ahora - dias * 24 * 60 * 60 * 1000);

  /**
   * Una cohorte: de los que se registraron hace más de N días, cuántos usaron su sesión al
   * menos N días **después de darse de alta**.
   *
   * El «elegibles» importa tanto como el «volvieron»: quien se registró ayer no puede haber
   * vuelto a los 30 días, y meterlo en el denominador hundiría la cifra sin que haya pasado
   * nada. Solo cuentan las cuentas que ya han tenido tiempo de contestar la pregunta.
   */
  const cohorte = async (dias: number): Promise<{ elegibles: number; volvieron: number }> => {
    const corte = hace(dias);

    const [fila] = await db
      .select({
        elegibles: sql<number>`count(distinct ${users.id})::int`,
        volvieron: sql<number>`count(distinct ${users.id}) filter (
          where ${sessions.lastUsedAt} >= ${users.createdAt} + make_interval(days => ${dias})
        )::int`,
      })
      .from(users)
      .leftJoin(sessions, eq(sessions.userId, users.id))
      // `lte()` y no `sql\`... <= ${corte}\``: interpolar un `Date` dentro de una plantilla
      // `sql` lo pasa al driver tal cual, y `postgres` solo acepta texto o buffer como
      // parámetro —falla con «Received an instance of Date»—. Los ayudantes de Drizzle
      // conocen el tipo de la columna y serializan la fecha por su cuenta.
      .where(and(CUENTA_REAL, lte(users.createdAt, corte)));

    return { elegibles: fila?.elegibles ?? 0, volvieron: fila?.volvieron ?? 0 };
  };

  const [siete, treinta] = await Promise.all([cohorte(7), cohorte(30)]);

  return {
    elegibles7: siete.elegibles,
    volvieron7: siete.volvieron,
    elegibles30: treinta.elegibles,
    volvieron30: treinta.volvieron,
  };
}

/**
 * Dónde se cae quien se registra: se registró → capturó horario → volvió otro día.
 *
 * «Volvió otro día» se mide como una sesión usada al menos un día después del alta, y no
 * como «tiene más de una sesión»: abrir la web además de la app el mismo día es un solo
 * momento de uso, no una vuelta.
 */
async function embudo(): Promise<PanelEmbudo> {
  /**
   * Los dos `exists` van escritos a mano, **y la columna correlacionada va calificada**.
   *
   * Las dos cosas hicieron falta, y la segunda costó encontrarla. Interpolar `${users.id}`
   * dentro de una subconsulta emite `"id"` a secas, sin el `"users".` delante: fuera de una
   * subconsulta da igual, pero dentro de `select 1 from subjects s where s.user_id = "id"`
   * PostgreSQL resuelve ese `"id"` contra `subjects`, que también tiene una columna `id`. La
   * comparación queda en `s.user_id = s.id` —nunca cierta— y el `filter` no cuenta ni una
   * fila. No hay error: la consulta es válida y devuelve 0.
   *
   * Se detectó comparando el panel contra SQL directo: decía 0 usuarios con horario mientras
   * la base tenía 147, y `conHorario` —que sale de otra consulta— decía 147 en la misma
   * respuesta. Es exactamente el caso que esa comprobación existe para atrapar, y la razón
   * por la que la verificación de esta fase es «cuadrar los números con SQL» y no «que la
   * pantalla cargue»: un panel que miente no se cae, se lee.
   */
  const [fila] = await db
    .select({
      registrados: sql<number>`count(*)::int`,
      capturaronHorario: sql<number>`count(*) filter (
        where exists (select 1 from subjects s where s.user_id = users.id)
      )::int`,
      volvieronOtroDia: sql<number>`count(*) filter (
        where exists (
          select 1 from sessions se
          where se.user_id = users.id
            and se.last_used_at >= users.created_at + interval '1 day'
        )
      )::int`,
    })
    .from(users)
    .where(CUENTA_REAL);

  return {
    registrados: fila?.registrados ?? 0,
    capturaronHorario: fila?.capturaronHorario ?? 0,
    volvieronOtroDia: fila?.volvieronOtroDia ?? 0,
  };
}

/**
 * Todo el panel, en una sola llamada.
 *
 * Las siete secciones se lanzan en paralelo: son independientes entre sí y esperar a que
 * termine una para empezar la siguiente sumaría siete latencias por nada.
 */
export async function resumen(): Promise<PanelResumen> {
  const [
    inventarioResultado,
    altas,
    actividadResultado,
    versionesResultado,
    saludResultado,
    retencionResultado,
    embudoResultado,
    reportesPendientes,
  ] = await Promise.all([
    inventario(),
    altasPorSemana(),
    actividad(),
    versiones(),
    salud(),
    retencion(),
    embudo(),
    countPendingReports(),
  ]);

  return {
    inventario: inventarioResultado,
    altasPorSemana: altas,
    actividad: actividadResultado,
    versiones: versionesResultado,
    salud: saludResultado,
    retencion: retencionResultado,
    embudo: embudoResultado,
    reportesPendientes,
  };
}
