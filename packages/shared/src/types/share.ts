/**
 * Tipos de la compartición (FR-028 a FR-033).
 *
 * Principio VIII: definidos UNA vez aquí y consumidos por `api`, `web` y `mobile`.
 *
 * La idea que gobierna todo el módulo: un compartido es una **fotografía**, no una ventana.
 * Al generarlo se copia el contenido elegido dentro del propio compartido, y a partir de ahí
 * ni las ediciones ni los borrados del emisor lo tocan. Es lo que hace posible el Principio
 * IV —compartir es copia, no sincronización— desde el primer momento y no solo al aceptar:
 * si el compartido apuntara a las materias del emisor, borrar una rompería un enlace ya
 * repartido, y editarla cambiaría lo que el receptor vio en la vista previa.
 */

import type { EntityId, Weekday } from './common.js';
import type { Instant } from './auth.js';
import type { CalendarDate } from './attendance.js';
import type { AgendaKind } from './agenda.js';
import type { ClockTime } from './schedule.js';

/**
 * Qué se comparte (FR-028).
 *
 * Son dos tipos y no uno genérico porque la vista previa y la copia son distintas: un horario
 * trae materias con sus sesiones y el receptor debe decidir si reemplaza el suyo; unas
 * actividades se suman a su agenda sin más.
 */
export const SHARE_KINDS = ['horario', 'agenda'] as const;
export type ShareKind = (typeof SHARE_KINDS)[number];

/** Etiqueta de cada tipo, igual en web y en app (Principio VIII). */
export const SHARE_KIND_LABELS: Readonly<Record<ShareKind, string>> = {
  horario: 'Horario',
  agenda: 'Actividades',
};

/**
 * Longitud del código corto (FR-028).
 *
 * Ocho caracteres del alfabeto de abajo dan 32^8 ≈ 1.1 billones de combinaciones: suficiente
 * para que adivinar uno por fuerza bruta no sea viable, y aún corto para dictarlo en voz alta
 * o teclearlo en un teléfono, que es justo lo que un compañero hace con él.
 */
export const SHARE_CODE_LENGTH = 8;

/**
 * Alfabeto del código corto.
 *
 * Es el de Crockford base32: sin `I`, `L`, `O` ni `U`. Las tres primeras se confunden con `1`
 * y `0` al dictar un código o leerlo de la pantalla de otro, que es exactamente cómo se usa
 * esto; la `U` se excluye para no formar palabras malsonantes por azar.
 */
export const SHARE_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Días que un compartido sigue siendo válido, salvo que el emisor lo revoque antes. */
export const SHARE_DEFAULT_TTL_DAYS = 30;

/**
 * Por qué un compartido no se puede aceptar (FR-033).
 *
 * El receptor necesita distinguirlos: "caducado" le dice que pida uno nuevo, "revocado" que
 * el emisor se arrepintió, y "no existe" que tecleó mal el código. Un único "no disponible"
 * dejaría al usuario sin saber qué hacer a continuación.
 */
export const SHARE_UNAVAILABLE_REASONS = ['revocado', 'caducado', 'no_encontrado'] as const;
export type ShareUnavailableReason = (typeof SHARE_UNAVAILABLE_REASONS)[number];

/** Mensaje de cada motivo, escrito una vez para los dos clientes (FR-033). */
export const SHARE_UNAVAILABLE_MESSAGES: Readonly<Record<ShareUnavailableReason, string>> = {
  revocado: 'Quien lo compartió retiró este contenido.',
  caducado: 'Este compartido caducó. Pídele a quien te lo envió que genere uno nuevo.',
  no_encontrado: 'No encontramos ese código. Revisa que esté bien escrito.',
};

/**
 * Estado de un compartido, tal como lo ve su emisor.
 *
 * `caducado` no se guarda: se deriva de la fecha al consultar. Guardarlo exigiría un proceso
 * que recorriera la tabla cambiando estados, y hasta que corriera un compartido vencido
 * seguiría diciendo que está activo.
 */
export const SHARE_STATUSES = ['activo', 'revocado', 'caducado'] as const;
export type ShareStatus = (typeof SHARE_STATUSES)[number];

/* ─────────────────────────── El contenido congelado ─────────────────────────── */

/**
 * Una sesión de clase dentro de un compartido.
 *
 * Es una copia de los datos, sin `id` ni `subjectId`: los identificadores del emisor no
 * significan nada en la cuenta del receptor, y arrastrarlos solo invitaría a intentar
 * enlazarlas —que es justo lo que el Principio IV prohíbe—.
 */
export interface SharedBlock {
  readonly weekday: Weekday;
  readonly startTime: ClockTime;
  readonly endTime: ClockTime;
  readonly room: string | null;
}

/** Una materia dentro de un compartido, con sus sesiones. */
export interface SharedSubject {
  readonly name: string;
  /** El color viaja para que el horario copiado se lea igual que el original (FR-010). */
  readonly color: string;
  readonly blocks: readonly SharedBlock[];
}

/**
 * Una actividad dentro de un compartido.
 *
 * No lleva `completed` ni `completedAt`: se comparte lo que hay que hacer, no lo que el
 * emisor ya hizo. Una tarea que llega marcada como completada no serviría de nada al
 * receptor, que aún tiene que entregarla.
 *
 * `subjectName` viaja como **texto**, no como identificador: la materia del receptor es otra
 * fila distinta, o puede no existir. Al aceptar se busca por nombre y, si no aparece, la
 * actividad se queda sin materia —un estado válido desde FR-018—.
 */
export interface SharedAgendaItem {
  readonly title: string;
  readonly description: string | null;
  readonly kind: AgendaKind;
  readonly subjectName: string | null;
  readonly dueDate: CalendarDate | null;
}

/**
 * El contenido de un compartido, congelado en el momento de generarlo.
 *
 * Es una unión discriminada por `kind` para que el compilador obligue a distinguir los dos
 * casos en cada cliente, en lugar de dos listas opcionales que siempre habría que comprobar.
 */
export type SharePayload =
  | { readonly kind: 'horario'; readonly subjects: readonly SharedSubject[] }
  | { readonly kind: 'agenda'; readonly items: readonly SharedAgendaItem[] };

/* ─────────────────────────── Lo que ve el emisor ─────────────────────────── */

/**
 * Un compartido generado, tal como lo ve quien lo creó.
 *
 * Lleva las tres modalidades ya resueltas (FR-028) porque las tres salen del **mismo**
 * `code`: el enlace lo incrusta y el QR codifica el enlace. Generar un identificador por
 * modalidad es exactamente cómo acabarían entregando contenidos distintos, que es lo que
 * FR-032 prohíbe.
 */
export interface Share {
  readonly id: EntityId;
  /** El código corto, en mayúsculas (FR-028). */
  readonly code: string;
  readonly kind: ShareKind;
  /** Título que el emisor le puso, para reconocerlo en su lista. */
  readonly title: string;
  /**
   * Enlace completo (FR-028). Lo compone el servidor a partir de `WEB_URL`: si cada cliente
   * lo armara por su cuenta, la app pondría una URL y la web otra.
   */
  readonly url: string;
  /** Cuántos elementos incluye. Es lo que la lista del emisor muestra de un vistazo. */
  readonly itemCount: number;
  readonly status: ShareStatus;
  /** Cuántas veces se ha aceptado. Informativo: cada aceptación es una copia independiente. */
  readonly acceptedCount: number;
  readonly expiresAt: Instant;
  readonly revokedAt: Instant | null;
  readonly createdAt: Instant;
}

/* ─────────────────────────── Lo que ve el receptor ─────────────────────────── */

/**
 * Vista previa de un compartido antes de aceptarlo (FR-030).
 *
 * Es de **solo lectura**: consultarla no copia nada. El receptor ve exactamente lo que
 * recibiría y decide después, que es el escenario 2 de la historia de usuario 6.
 *
 * Va sin datos del emisor más allá de su nombre público: el compartido se abre desde un
 * enlace que puede llegar a cualquiera, así que no es sitio para nada privado de la cuenta.
 */
export interface SharePreview {
  readonly code: string;
  readonly kind: ShareKind;
  readonly title: string;
  /** Nombre mostrado de quien comparte, para que el receptor sepa de quién viene. */
  readonly fromDisplayName: string;
  /** `@usuario` de quien comparte. */
  readonly fromUsername: string;
  /** El contenido íntegro que se copiaría (FR-030). */
  readonly payload: SharePayload;
  readonly itemCount: number;
  readonly expiresAt: Instant;
  /**
   * `true` si el compartido es del propio usuario que lo consulta.
   *
   * Aceptar el tuyo propio duplicaría tu horario sin querer, así que el cliente lo señala y
   * el servidor lo rechaza.
   */
  readonly isOwn: boolean;
}

/**
 * Qué hacer con lo que el receptor ya tiene al aceptar un horario.
 *
 * Mismos dos modos que la importación de la Fase 2 y por el mismo motivo: el caso real es un
 * compañero que aún no capturó nada —`reemplazar`— o que ya tiene parte y quiere sumar
 * —`añadir`—. Se reutiliza el vocabulario para que la pantalla se lea igual en los dos sitios.
 */
export const SHARE_ACCEPT_MODES = ['añadir', 'reemplazar'] as const;
export type ShareAcceptMode = (typeof SHARE_ACCEPT_MODES)[number];

/**
 * Resultado de aceptar un compartido (FR-031).
 *
 * Los conteos se devuelven para que la pantalla confirme qué entró de verdad —"3 materias y
 * 12 sesiones"— en lugar de un "listo" que no dice si se copió lo que el usuario esperaba.
 */
export interface ShareAcceptResult {
  readonly kind: ShareKind;
  readonly subjectsCreated: number;
  readonly blocksCreated: number;
  /** Materias borradas por haber elegido `reemplazar`. Cero al añadir o en la agenda. */
  readonly subjectsRemoved: number;
  readonly itemsCreated: number;
  /**
   * Actividades que se copiaron sin materia porque el receptor no tiene ninguna con ese
   * nombre. Se informa en vez de callarlo: el usuario puede asociarlas él después.
   */
  readonly itemsWithoutSubject: number;
}
