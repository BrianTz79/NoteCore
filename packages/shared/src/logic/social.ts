/**
 * Reglas de la sección social (FR-039 a FR-042, FR-045).
 *
 * Principio II: la API decide con estas mismas funciones. Los clientes las usan para
 * presentar —qué botón pintar, cómo resumir un perfil, cómo ordenar una lista— nunca para
 * decidir por su cuenta si dos personas pueden conectarse: eso lo verifica el servidor.
 */

import type {
  Contact,
  ContactActions,
  ContactStatus,
  ContactViewpoint,
  ProfileDetails,
  ProfileVisibility,
  UserSearchResult,
} from '../types/social.js';
import { parseDate, type Instant } from '../types/auth.js';
import { COLOR } from '../design/tokens.js';

/* ─────────────────────────── El par ordenado ─────────────────────────── */

/**
 * Ordena dos identificadores de usuario de forma estable.
 *
 * Es la pieza de la que cuelga que una relación sea **un solo hecho**. La fila se guarda
 * siempre con el par ya ordenado, así que la relación entre A y B ocupa la misma fila se
 * mire desde donde se mire, y el índice único sobre las dos columnas impide que existan dos.
 *
 * Sin esto haría falta un índice por cada orden y una consulta con `OR` en cada lectura, y
 * —lo que de verdad importa— dos personas tocando "agregar" a la vez crearían **dos filas**
 * —una en cada orden— que ningún índice podría rechazar. La relación quedaría duplicada y con
 * la posibilidad de tener estados distintos en cada copia, que es exactamente lo que hace
 * imposible responder "¿son contactos?" —la pregunta de la que cuelga FR-044 en la Fase 10—.
 *
 * Es el mismo tipo de invariante que el índice único parcial de los semestres de la Fase 7:
 * lo impone la base de datos porque la comprobación previa de dos peticiones simultáneas pasa
 * antes de que ninguna escriba.
 */
export function orderedPair(a: string, b: string): readonly [string, string] {
  return a < b ? [a, b] : [b, a];
}

/* ─────────────────────────── Punto de vista ─────────────────────────── */

/**
 * Traduce una relación guardada al punto de vista de quien la mira.
 *
 * El estado de la fila no basta para saber qué ofrecer: `pendiente` significa "puedo
 * cancelar" para quien la envió y "puedo aceptar" para quien la recibió (FR-041), y
 * `bloqueada` significa "puedo desbloquear" para quien bloqueó y **nada** para el bloqueado.
 *
 * Se resuelve aquí, en una sola función, y no en cada cliente comparando identificadores:
 * esa comparación es justo donde uno de los dos clientes se equivocaría de lado, y el fallo
 * se vería como un botón "Aceptar" en la pantalla de quien envió la solicitud.
 */
export function contactViewpoint(
  relation: {
    readonly status: ContactStatus;
    readonly requesterId: string;
    readonly blockedById: string | null;
  } | null,
  viewerId: string,
): ContactViewpoint {
  if (relation === null || relation.status === 'ninguna') return 'ninguna';

  if (relation.status === 'bloqueada') {
    return relation.blockedById === viewerId ? 'bloqueada_por_mi' : 'bloqueada_por_otro';
  }

  if (relation.status === 'aceptada') return 'aceptada';

  return relation.requesterId === viewerId ? 'enviada' : 'recibida';
}

/**
 * Qué puede hacer el usuario desde un punto de vista dado.
 *
 * Principio II: es **la** definición de las acciones posibles, y la API la usa para decidir
 * además de para responder. Que el cliente pinte a partir de lo mismo que el servidor
 * comprueba es lo que impide el caso feo: un botón que existe en la pantalla y falla al
 * tocarlo.
 *
 * `bloqueada_por_otro` no ofrece nada, y en particular **no ofrece bloquear**: hacerlo
 * revelaría por descarte que el bloqueo existe, que es justo lo que no se le dice al
 * bloqueado.
 */
export function contactActions(viewpoint: ContactViewpoint): ContactActions {
  const ninguna: ContactActions = {
    puedeSolicitar: false,
    puedeAceptar: false,
    puedeRechazar: false,
    puedeCancelar: false,
    puedeEliminar: false,
    puedeBloquear: false,
    puedeDesbloquear: false,
  };

  switch (viewpoint) {
    case 'ninguna':
      return { ...ninguna, puedeSolicitar: true, puedeBloquear: true };
    case 'enviada':
      return { ...ninguna, puedeCancelar: true, puedeBloquear: true };
    case 'recibida':
      return { ...ninguna, puedeAceptar: true, puedeRechazar: true, puedeBloquear: true };
    case 'aceptada':
      return { ...ninguna, puedeEliminar: true, puedeBloquear: true };
    case 'bloqueada_por_mi':
      return { ...ninguna, puedeDesbloquear: true };
    case 'bloqueada_por_otro':
      // A quien fue bloqueado no se le ofrece nada, y tampoco se le dice por qué.
      return ninguna;
  }
}

/**
 * `true` si los dos son contactos aceptados.
 *
 * La usará FR-044 en la Fase 10 para decidir si dos personas pueden escribirse. Vive aquí
 * desde ahora para que esa fase no invente su propia lectura del estado.
 */
export function areConnected(viewpoint: ContactViewpoint): boolean {
  return viewpoint === 'aceptada';
}

/**
 * `true` si hay un bloqueo de por medio, lo haya puesto quien lo haya puesto.
 *
 * Los dos casos se tratan igual para todo lo que no sea pintar botones: quien bloqueó no
 * quiere saber de la otra persona, y a quien fue bloqueado no se le deja avanzar. La
 * diferencia entre ambos es solo qué se le cuenta a cada uno.
 */
export function isBlocked(viewpoint: ContactViewpoint): boolean {
  return viewpoint === 'bloqueada_por_mi' || viewpoint === 'bloqueada_por_otro';
}

/* ─────────────────────────── Visibilidad del perfil ─────────────────────────── */

/**
 * Si quien mira puede ver el perfil ampliado y las publicaciones (FR-045).
 *
 * El dueño siempre se ve a sí mismo —comprobarlo aquí evita que cada pantalla se acuerde del
 * caso—, y un bloqueo cierra el perfil en los dos sentidos: quien bloqueó no quiere que le
 * lean, y a quien fue bloqueado no se le enseña nada.
 *
 * Es la regla que el servidor aplica **antes** de responder: los campos que no se pueden ver
 * viajan en `null`, no viajan llenos para que el cliente los esconda. Un cliente puede no
 * esconderlos; el que no se manden no tiene vuelta de hoja.
 */
export function canSeeProfileDetails(
  visibility: ProfileVisibility,
  viewpoint: ContactViewpoint,
  isOwn: boolean,
): boolean {
  if (isOwn) return true;
  if (isBlocked(viewpoint)) return false;
  return visibility === 'todos' || viewpoint === 'aceptada';
}

/**
 * Explicación de por qué un perfil no enseña sus detalles.
 *
 * Se escribe una vez para los dos clientes: sin ella, la pantalla pintaría un perfil vacío y
 * el usuario leería "esta persona no puso nada" en lugar de "esto es privado", que es una
 * conclusión distinta y equivocada.
 */
export function profileHiddenMessage(displayName: string): string {
  return `${displayName} solo comparte su perfil con sus contactos.`;
}

/**
 * El enlace al perfil de alguien (FR-040).
 *
 * Una sola función para que app y web produzcan la misma URL, por lo mismo que en la
 * compartición de la Fase 6: es la que se codifica en el QR, así que si difirieran, escanear
 * y abrir el enlace llevarían a sitios distintos.
 *
 * Lleva el `@usuario` y no un código aleatorio, a diferencia de un compartido. Un compartido
 * guarda contenido y su código es la credencial que lo protege; un perfil **es** una
 * identidad pública que FR-039 hace buscable por ese mismo nombre. Un código aleatorio no
 * añadiría ninguna protección —quien tenga el enlace puede buscar el usuario igual— y sí
 * quitaría lo único bueno de este enlace: que se puede dictar.
 */
export function profileUrl(baseUrl: string, username: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/u/${username}`;
}

/**
 * Extrae el `@usuario` de un enlace de perfil, o `null` si no lo es.
 *
 * Existe para que pegar un enlace completo funcione igual que teclear el nombre: la gente
 * copia la URL entera del navegador, y exigirle que recorte la parte final sería trabajo
 * manual para algo que el programa sabe hacer. Acepta también el `@` inicial por lo mismo.
 */
export function usernameFromProfileInput(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;

  const fromUrl = /\/u\/([a-zA-Z0-9_]+)\/?$/.exec(trimmed)?.[1];
  const candidate = (fromUrl ?? trimmed.replace(/^@/, '')).toLowerCase();

  return /^[a-z0-9_]{3,20}$/.test(candidate) ? candidate : null;
}

/* ─────────────────────────── Presentación ─────────────────────────── */

/** Etiqueta del estado de la relación, igual en los dos clientes. */
export const CONTACT_VIEWPOINT_LABELS: Readonly<Record<ContactViewpoint, string>> = {
  ninguna: 'No es tu contacto',
  enviada: 'Solicitud enviada',
  recibida: 'Te envió una solicitud',
  aceptada: 'Contacto',
  bloqueada_por_mi: 'Bloqueado',
  // Al bloqueado se le muestra lo mismo que a un desconocido: el bloqueo no se anuncia.
  bloqueada_por_otro: 'No es tu contacto',
};

/**
 * Color del estado.
 *
 * Vive en `shared` por lo mismo que el de las faltas y el de los compartidos: si la web
 * pintara "pendiente" en gris y la app en ámbar, la misma situación se leería distinto según
 * el dispositivo.
 */
export const CONTACT_VIEWPOINT_COLORS: Readonly<Record<ContactViewpoint, string>> = {
  ninguna: COLOR.tinta3,
  enviada: COLOR.aviso,
  recibida: COLOR.acento,
  aceptada: COLOR.exito,
  bloqueada_por_mi: COLOR.error,
  bloqueada_por_otro: COLOR.tinta3,
};

/**
 * Resumen de los datos que el usuario llenó de su perfil.
 *
 * Une con `·` solo lo que existe, para que un perfil a medio llenar no muestre separadores
 * sueltos ni renglones vacíos. Devuelve `null` cuando no hay nada, y así la pantalla decide
 * entre pintar el resumen o no pintar el renglón —en lugar de pintar una cadena vacía que
 * deja un hueco—.
 */
export function profileSummary(details: ProfileDetails): string | null {
  const parts = [
    details.career,
    details.school,
    details.age === null ? null : `${details.age} años`,
  ].filter((part): part is string => part !== null && part.trim() !== '');

  return parts.length === 0 ? null : parts.join(' · ');
}

/**
 * Resumen de cuántos contactos y publicaciones tiene un perfil.
 *
 * Con singular y plural resueltos: "1 contactos" es el detalle que delata que un texto se
 * armó concatenando, y se corregiría en un cliente y se olvidaría en el otro.
 */
export function profileCountsSummary(contactCount: number, postCount: number): string {
  const contactos = contactCount === 1 ? '1 contacto' : `${contactCount} contactos`;
  const publicaciones =
    postCount === 1 ? '1 publicación' : `${postCount} publicaciones`;
  return `${contactos} · ${publicaciones}`;
}

/**
 * Resumen de las solicitudes pendientes, para el aviso del inicio.
 *
 * Devuelve `null` cuando no hay ninguna: así la pantalla no pinta un aviso que diga "0
 * solicitudes", que es ruido en lugar de información.
 */
export function pendingRequestsSummary(count: number): string | null {
  if (count <= 0) return null;
  return count === 1 ? '1 solicitud de contacto' : `${count} solicitudes de contacto`;
}

/**
 * Ordena una lista de contactos.
 *
 * Lo más reciente primero en las solicitudes —es lo que espera respuesta— y por nombre en los
 * aceptados, que es como se busca a alguien en una lista larga: por quién es, no por cuándo
 * se agregó.
 */
export function sortContacts(contacts: readonly Contact[]): readonly Contact[] {
  return [...contacts].sort((a, b) => {
    if (a.viewpoint === 'aceptada' && b.viewpoint === 'aceptada') {
      return a.user.displayName.localeCompare(b.user.displayName, 'es');
    }
    return parseDate(b.requestedAt).getTime() - parseDate(a.requestedAt).getTime();
  });
}

/** Ordena las publicaciones: lo más reciente primero, como cualquier muro. */
export function sortPosts<T extends { readonly createdAt: Instant }>(
  posts: readonly T[],
): readonly T[] {
  return [...posts].sort(
    (a, b) => parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime(),
  );
}

/**
 * Texto relativo de cuándo se publicó algo.
 *
 * En un muro, "hace 5 minutos" se lee mejor que una fecha completa, y a partir de una semana
 * ocurre lo contrario. Vive en `shared` porque es justo el texto que se afinaría en un
 * cliente y se olvidaría en el otro, y entonces la misma publicación diría cosas distintas
 * según el dispositivo.
 *
 * `now` se pasa desde fuera para que toda una lista se evalúe contra el mismo instante y para
 * que las pruebas no dependan del reloj.
 */
export function relativeTime(value: Instant, now: Date = new Date()): string {
  const then = parseDate(value).getTime();
  const seconds = Math.floor((now.getTime() - then) / 1000);

  // Un reloj adelantado en el dispositivo no debe producir "hace -3 minutos".
  if (seconds < 60) return 'Hace un momento';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes === 1 ? 'Hace 1 minuto' : `Hace ${minutes} minutos`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? 'Hace 1 hora' : `Hace ${hours} horas`;

  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? 'Ayer' : `Hace ${days} días`;

  const date = parseDate(value);
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Filtra de una lista de resultados a quien no debe aparecer (FR-042).
 *
 * El bloqueo solo sirve de algo si la persona **deja de aparecer**: encontrarla en cada
 * búsqueda haría del bloqueo una etiqueta en lugar de una separación. Se aplica en los dos
 * sentidos, y el bloqueado no percibe nada distinto de que esa cuenta no exista.
 */
export function withoutBlocked(
  results: readonly UserSearchResult[],
): readonly UserSearchResult[] {
  return results.filter((result) => !isBlocked(result.viewpoint));
}
