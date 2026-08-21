import { and, count, eq, gt, gte, isNotNull, isNull, lte, sql, type SQL } from 'drizzle-orm';
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
    .from(subjects);

  const [aceptadasFila] = await db
    .select({ n: sql<number>`coalesce(sum(${shares.acceptedCount}), 0)::int` })
    .from(shares);

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
    contar(users, isNull(users.anonymizedAt)),
    contar(users, isNotNull(users.anonymizedAt)),
    contar(subjects),
    contar(scheduleBlocks),
    contar(absenceRecords),
    contar(agendaItems),
    contar(posts),
    // Los borrados por su autor no cuentan: son huecos, no mensajes.
    contar(messages, isNull(messages.deletedAt)),
    contar(conversations),
    contar(contacts, eq(contacts.status, 'aceptada')),
    contar(semesters, eq(semesters.status, 'activo')),
    contar(semesters, eq(semesters.status, 'archivado')),
    contar(shares),
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
    .where(isNull(users.anonymizedAt))
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
      .where(gte(sessions.lastUsedAt, hace(dias)));
    return fila?.n ?? 0;
  };

  const porCliente = await db
    .select({ client: sessions.client, n: count() })
    .from(sessions)
    .where(gt(sessions.expiresAt, new Date()))
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
    .where(gt(sessions.expiresAt, new Date()))
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
      .where(and(isNull(users.anonymizedAt), lte(users.createdAt, corte)));

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
    .where(isNull(users.anonymizedAt));

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
  ] = await Promise.all([
    inventario(),
    altasPorSemana(),
    actividad(),
    versiones(),
    salud(),
    retencion(),
    embudo(),
  ]);

  return {
    inventario: inventarioResultado,
    altasPorSemana: altas,
    actividad: actividadResultado,
    versiones: versionesResultado,
    salud: saludResultado,
    retencion: retencionResultado,
    embudo: embudoResultado,
  };
}
