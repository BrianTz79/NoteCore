/**
 * Tipos de la sección social: perfil, contactos y publicaciones (FR-039 a FR-042, FR-045).
 *
 * Principio VIII: definidos UNA vez aquí y consumidos por `api`, `web` y `mobile`.
 *
 * La idea que gobierna el módulo: **una relación entre dos personas es un solo hecho**. No
 * hay "mi contacto contigo" y "tu contacto conmigo" como filas distintas, sino una relación
 * con un estado, que cada uno de los dos ve desde su lado. Guardarla dos veces es cómo se
 * llega a que uno la tenga aceptada y el otro pendiente, y entonces "¿son contactos?" —la
 * pregunta de la que cuelga FR-044 en la Fase 10— deja de tener una respuesta.
 *
 * La segunda idea, la de FR-045: **lo que un tercero ve es lo que el dueño destinó a ser
 * visto**, nunca lo que la base de datos tenga a mano. Por eso el perfil ajeno es un tipo
 * propio (`PublicProfile`) y no la fila del usuario con campos escondidos: así ninguna
 * consulta futura filtra de más por descuido.
 */

import type { EntityId } from './common.js';
import type { Instant } from './auth.js';

/* ─────────────────────────── Estado de una relación ─────────────────────────── */

/**
 * Estado de la relación entre dos usuarios (FR-041, FR-042).
 *
 * `ninguna` no se guarda en la base de datos: es la ausencia de fila. Existe como estado
 * porque los clientes necesitan nombrarla —es lo que decide si se pinta "Agregar" o
 * "Pendiente"—, y tenerla en el mismo conjunto evita que cada cliente invente su propio
 * "no hay nada" y acabe pintando cosas distintas ante la misma situación.
 */
export const CONTACT_STATUSES = ['ninguna', 'pendiente', 'aceptada', 'bloqueada'] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

/**
 * La relación vista **desde un lado concreto**.
 *
 * `pendiente` no basta para saber qué ofrecer: quien envió la solicitud debe poder
 * cancelarla, y quien la recibió aceptarla o rechazarla. Son dos pantallas distintas a
 * partir del mismo estado, así que la dirección viaja resuelta por el servidor en lugar de
 * dejar que cada cliente la deduzca comparando identificadores —que es justo donde uno de
 * los dos se equivocaría—.
 */
export const CONTACT_VIEWPOINTS = [
  /** No hay relación: se puede enviar una solicitud. */
  'ninguna',
  /** Yo la envié y espero respuesta. Puedo cancelarla. */
  'enviada',
  /** Me la enviaron. Puedo aceptarla o rechazarla (FR-041). */
  'recibida',
  /** Somos contactos. */
  'aceptada',
  /** Yo bloqueé a esta persona. Puedo desbloquearla (FR-042). */
  'bloqueada_por_mi',
  /**
   * Esta persona me bloqueó.
   *
   * Nunca se le comunica al bloqueado: ver "te bloquearon" convierte el bloqueo en un
   * mensaje, y la persona de la que uno se quiere separar es justo la que reaccionaría. Los
   * clientes lo tratan como `ninguna` y el servidor no deja avanzar; existe como valor
   * porque el servidor sí necesita distinguirlo para decidir.
   */
  'bloqueada_por_otro',
] as const;
export type ContactViewpoint = (typeof CONTACT_VIEWPOINTS)[number];

/**
 * Qué puede hacer el usuario ante otra persona, ya resuelto por el servidor.
 *
 * Principio II: la decisión de si se puede enviar una solicitud, aceptar o desbloquear la
 * toma la API. Los clientes pintan lo que llega en lugar de derivarlo del estado, porque
 * derivarlo son dos implementaciones de la misma regla que acabarían discrepando —y la
 * discrepancia se vería como un botón que existe en la app y falla al tocarlo—.
 */
export interface ContactActions {
  readonly puedeSolicitar: boolean;
  readonly puedeAceptar: boolean;
  readonly puedeRechazar: boolean;
  readonly puedeCancelar: boolean;
  readonly puedeEliminar: boolean;
  readonly puedeBloquear: boolean;
  readonly puedeDesbloquear: boolean;
}

/* ─────────────────────────── El perfil ─────────────────────────── */

/**
 * Quién puede ver el perfil ampliado y las publicaciones (FR-045).
 *
 * Arranca en `contactos` a propósito. Publicar algo y descubrir después que era público es
 * el arrepentimiento que no tiene arreglo —lo visto, visto está—, mientras que abrirlo
 * cuando uno quiere es un toque. El valor prudente es el que se pone por defecto.
 */
export const PROFILE_VISIBILITIES = ['todos', 'contactos'] as const;
export type ProfileVisibility = (typeof PROFILE_VISIBILITIES)[number];

/** Etiqueta de cada visibilidad, escrita una vez para los dos clientes. */
export const PROFILE_VISIBILITY_LABELS: Readonly<Record<ProfileVisibility, string>> = {
  todos: 'Cualquiera con cuenta',
  contactos: 'Solo mis contactos',
};

/**
 * Explicación de cada visibilidad.
 *
 * Vive aquí y no en cada pantalla porque es el texto del que depende que el usuario entienda
 * qué está destinando a ser público (FR-045). Si la web lo explicara de una forma y la app de
 * otra, la misma elección se entendería distinto según el dispositivo.
 */
export const PROFILE_VISIBILITY_HINTS: Readonly<Record<ProfileVisibility, string>> = {
  todos: 'Cualquiera que tenga tu enlace o te encuentre por tu @usuario verá esto.',
  contactos: 'Solo quienes ya son tus contactos verán esto. Los demás verán tu nombre y tu @usuario.',
};

/** Longitud máxima de la biografía. */
export const BIO_MAX_LENGTH = 300;

/** Límites de la edad, cuando el usuario decide ponerla. */
export const AGE_MIN = 13;
export const AGE_MAX = 120;

/**
 * Los campos que el usuario decide llenar de su perfil (FR-045).
 *
 * **Todos opcionales, todos públicos según su visibilidad.** Son `null` y no cadena vacía
 * cuando no se llenan: "no lo puse" y "lo puse vacío" no son cosas distintas para el
 * usuario, así que no deben serlo en el modelo. Un solo valor para "no hay nada" evita que
 * una pantalla pinte un renglón en blanco donde otra no pinta nada.
 */
export interface ProfileDetails {
  readonly bio: string | null;
  readonly career: string | null;
  readonly school: string | null;
  readonly age: number | null;
}

/**
 * El perfil ampliado tal como lo ve **su dueño**, con lo que nadie más ve.
 *
 * Lleva la visibilidad porque es un ajuste que solo el dueño toca. No lleva correo: el
 * correo es de la cuenta, no del perfil, y ya viaja en `AuthenticatedUser`.
 */
export interface OwnProfile extends ProfileDetails {
  readonly id: EntityId;
  readonly username: string;
  readonly displayName: string;
  readonly visibility: ProfileVisibility;
  /** Cuántos contactos aceptados tiene. */
  readonly contactCount: number;
  /** Cuántas publicaciones ha hecho. */
  readonly postCount: number;
  /**
   * Solicitudes que esperan mi respuesta (FR-041).
   *
   * Viaja en el perfil propio para que el inicio pinte su aviso con una sola petición: es la
   * pantalla que más se abre y no necesita las cuatro listas para mostrar un número.
   */
  readonly pendingRequestCount: number;
  /** Enlace a su propio perfil, para compartirlo (FR-040). Lo compone el servidor. */
  readonly url: string;
}

/**
 * El perfil tal como lo ve **un tercero** (FR-045).
 *
 * Es un tipo propio y no `OwnProfile` con campos escondidos: así el compilador impide que una
 * respuesta futura devuelva de más por descuido, en lugar de confiar en que cada consulta se
 * acuerde de omitir columnas.
 *
 * Los campos de `ProfileDetails` llegan **ya filtrados por el servidor**: si la visibilidad no
 * alcanza a quien mira, llegan en `null` y `detailsVisible` en `false`. No se manda el
 * contenido para que el cliente decida ocultarlo —un cliente puede no ocultarlo—.
 */
export interface PublicProfile extends ProfileDetails {
  readonly id: EntityId;
  readonly username: string;
  readonly displayName: string;
  /**
   * `false` cuando la visibilidad del dueño no alcanza a quien mira.
   *
   * Existe para que la pantalla explique "este perfil es solo para sus contactos" en lugar de
   * pintar un perfil vacío, que se leería como "esta persona no puso nada".
   */
  readonly detailsVisible: boolean;
  /** Cuántos contactos tiene. `null` si no se le pueden ver los detalles. */
  readonly contactCount: number | null;
  readonly postCount: number | null;
  /** La relación con quien consulta, desde su punto de vista. */
  readonly viewpoint: ContactViewpoint;
  /** Qué se puede hacer, ya decidido por el servidor (Principio II). */
  readonly actions: ContactActions;
  /** Enlace a este perfil (FR-040). */
  readonly url: string;
  readonly createdAt: Instant;
}

/**
 * Un resultado de la búsqueda por `@usuario` (FR-039).
 *
 * Deliberadamente más pobre que `PublicProfile`: una lista de resultados no es sitio para el
 * perfil de nadie. Lleva solo lo justo para reconocer a quién se buscaba y saber si ya hay
 * relación, y el perfil se abre después.
 */
export interface UserSearchResult {
  readonly id: EntityId;
  readonly username: string;
  readonly displayName: string;
  readonly viewpoint: ContactViewpoint;
}

/* ─────────────────────────── Contactos ─────────────────────────── */

/**
 * Un contacto o una solicitud, tal como se lista.
 *
 * Es la otra persona más el estado de la relación: quien lo lee ya sabe quién es él mismo,
 * así que su propio lado no viaja.
 */
export interface Contact {
  /** Identificador de la **relación**, no de la persona: es lo que se acepta o se borra. */
  readonly id: EntityId;
  readonly user: UserSearchResult;
  readonly viewpoint: ContactViewpoint;
  readonly actions: ContactActions;
  /** Cuándo se envió la solicitud. */
  readonly requestedAt: Instant;
  /** Cuándo se aceptó (FR-041). `null` mientras siga pendiente. */
  readonly acceptedAt: Instant | null;
}

/**
 * Las tres listas de la pantalla de contactos, en una sola respuesta.
 *
 * Van juntas y no en tres peticiones porque se pintan a la vez y salen de la misma tabla:
 * separarlas obligaría a tres viajes que pueden llegar en estados distintos —una solicitud
 * aceptada entre la primera y la tercera aparecería en las dos listas o en ninguna—.
 */
export interface ContactLists {
  /** Contactos aceptados. */
  readonly aceptados: readonly Contact[];
  /** Solicitudes que me han enviado y esperan mi respuesta (FR-041). */
  readonly recibidas: readonly Contact[];
  /** Solicitudes que envié y esperan respuesta. */
  readonly enviadas: readonly Contact[];
  /** Personas que bloqueé (FR-042). */
  readonly bloqueados: readonly Contact[];
}

/* ─────────────────────────── Publicaciones ─────────────────────────── */

/** Longitud máxima de una publicación. */
export const POST_MAX_LENGTH = 1000;

/**
 * Una publicación del perfil.
 *
 * De momento es texto. Los adjuntos —fotos y vídeos— son una fase aparte: exigen
 * almacenamiento, límites de tamaño y tipo, y servido de archivos, que es infraestructura
 * que el proyecto todavía no tiene. El modelo se deja preparado para colgarlos de aquí sin
 * cambiar lo ya escrito.
 */
export interface Post {
  readonly id: EntityId;
  /** Autor. Viaja resuelto para pintar la publicación fuera del perfil de su dueño. */
  readonly author: UserSearchResult;
  readonly text: string;
  readonly createdAt: Instant;
  readonly updatedAt: Instant;
  /** `true` si es del propio usuario: es quien puede borrarla. */
  readonly isOwn: boolean;
}
