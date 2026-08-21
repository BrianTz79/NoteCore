/**
 * Reportes de contenido (Fase 21).
 *
 * Principio VIII: definidos UNA vez aquí y consumidos por `api`, `web` y `mobile`.
 *
 * ## Reportar no es bloquear
 *
 * Es la distinción que gobierna el módulo entero, y Google las cuenta como dos requisitos
 * distintos porque son dos cosas distintas:
 *
 * - **Bloquear** (FR-042, Fase 8) es una decisión **privada** del usuario sobre su propia
 *   experiencia. Surte efecto en el acto, no la revisa nadie, y a la otra persona no se le
 *   dice. Ya existe.
 * - **Reportar** es **avisar a quien mantiene el servicio** de que algo no debería estar
 *   ahí. No cambia nada de lo que el usuario ve, y su efecto llega más tarde, decidido por
 *   otro.
 *
 * Confundirlas lleva a un producto donde reportar bloquea de paso —y entonces la gente no
 * reporta para no perder el contacto— o donde bloquear reporta —y entonces cada persona que
 * te cae mal acaba en una cola de moderación—. Se ofrecen juntas y separadas: desde la misma
 * publicación o el mismo hilo, dos acciones con dos nombres.
 *
 * ## Qué se guarda del contenido reportado
 *
 * **Una copia del texto, congelada en el momento del reporte.** No una referencia viva, y no
 * porque sea más cómodo: quien reporta algo suele reportarlo justo antes de que su autor lo
 * borre o lo edite, y un reporte que al abrirse dice «esa publicación ya no existe» es un
 * reporte inútil. La copia es lo que hace que el aviso siga significando algo cuando alguien
 * lo lea.
 */

import type { EntityId } from './common.js';
import type { Instant } from './auth.js';

/* ─────────────────────────── Qué se reporta ─────────────────────────── */

/**
 * Las dos clases de contenido que un usuario puede reportar.
 *
 * Son las dos superficies donde una persona ve lo que otra escribió: el muro de la Fase 15 y
 * la mensajería de la Fase 10. Un perfil no está en la lista porque un perfil no es
 * contenido publicado — quien tenga un problema con una persona y no con algo que escribió,
 * la bloquea.
 */
export const REPORT_TARGETS = ['publicacion', 'mensaje'] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];

/** Cómo se nombra cada superficie en pantalla. */
export const REPORT_TARGET_LABELS: Readonly<Record<ReportTarget, string>> = {
  publicacion: 'Publicación',
  mensaje: 'Mensaje',
};

/* ─────────────────────────── Por qué se reporta ─────────────────────────── */

/**
 * Los motivos, como lista cerrada y corta.
 *
 * **Cerrada** porque un campo de texto libre como única entrada produce reportes que dicen
 * «esto está mal» y no se pueden agrupar ni priorizar. **Corta** porque una lista de quince
 * motivos se lee como un examen y la gente elige el primero que suena parecido — con lo que
 * la clasificación deja de valer justo por haberla afinado.
 *
 * `otro` existe a propósito y va el último: sin él, quien tenga un motivo que no está en la
 * lista elige el que menos se parece, y ese reporte llega peor clasificado que si hubiera
 * dicho «otro» y lo hubiera explicado.
 */
export const REPORT_REASONS = [
  'spam',
  'acoso',
  'contenido_sexual',
  'violencia',
  'suplantacion',
  'otro',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/**
 * Qué dice cada motivo en pantalla.
 *
 * Escrito una vez para los dos clientes por lo mismo que los textos de visibilidad de la
 * Fase 8: es lo que el usuario lee para elegir, y si la web y la app lo dijeran distinto, el
 * mismo reporte significaría cosas distintas según el dispositivo.
 */
export const REPORT_REASON_LABELS: Readonly<Record<ReportReason, string>> = {
  spam: 'Spam o publicidad',
  acoso: 'Acoso o insultos',
  contenido_sexual: 'Contenido sexual',
  violencia: 'Violencia o amenazas',
  suplantacion: 'Suplantación de identidad',
  otro: 'Otro motivo',
};

/** Longitud máxima de la explicación opcional. */
export const REPORT_DETAIL_MAX_LENGTH = 500;

/* ─────────────────────────── Qué se hizo con él ─────────────────────────── */

/**
 * En qué punto está un reporte.
 *
 * Tres estados y no más. La fase no monta un backoffice de moderación —eso sería inventar
 * alcance—: lo que hace falta es que quien opera el servicio pueda distinguir lo que no ha
 * mirado de lo que ya resolvió, y no perder el hilo entre una sesión y la siguiente.
 *
 * La diferencia entre `revisado` y `descartado` es la que importa al mirar la lista un mes
 * después: uno dice «esto era algo y se atendió», el otro «esto no era nada». Fundirlos en un
 * solo «cerrado» obligaría a releer cada caso para saber cuál fue cuál.
 */
export const REPORT_STATUSES = ['pendiente', 'revisado', 'descartado'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_STATUS_LABELS: Readonly<Record<ReportStatus, string>> = {
  pendiente: 'Sin revisar',
  revisado: 'Revisado',
  descartado: 'Descartado',
};

/* ─────────────────────────── El reporte ─────────────────────────── */

/**
 * Lo que se le responde a quien acaba de reportar.
 *
 * Deliberadamente pobre: una confirmación y nada más. No lleva el reporte entero porque
 * quien reporta no tiene por qué poder consultar después el estado de su denuncia —eso
 * abriría una vía para saber si a alguien se le sancionó, que es información sobre un
 * tercero— ni volver a leer lo que reportó.
 */
export interface ReportReceipt {
  readonly id: EntityId;
  /**
   * `true` si ya había reportado ese mismo contenido antes.
   *
   * Se le dice para que no crea que su primer reporte se perdió y siga tocando. El servidor
   * no crea una segunda fila: un reporte por persona y contenido, ver el índice único.
   */
  readonly yaReportado: boolean;
}

/**
 * Un reporte tal como lo lee quien opera el servicio, en el panel (Fase 25).
 *
 * Lleva a las dos personas identificadas por su `@usuario`. Es la única superficie del
 * producto donde el contenido de una conversación privada sale del hilo, y por eso lleva
 * **solo el mensaje reportado** y no la conversación: quien reporta señala un renglón, no
 * entrega su hilo entero a revisión.
 */
export interface Report {
  readonly id: EntityId;
  readonly target: ReportTarget;
  /** El contenido señalado. `null` si su autor ya lo borró. */
  readonly targetId: EntityId | null;
  /**
   * Copia del texto en el momento del reporte.
   *
   * Congelada a propósito: es lo que hace que el reporte siga significando algo cuando se
   * lea, aunque el original se haya borrado o editado desde entonces.
   */
  readonly targetText: string;
  /** Quién reportó. */
  readonly reporter: ReportUser;
  /** Quién escribió lo reportado. */
  readonly author: ReportUser;
  readonly reason: ReportReason;
  /** Lo que añadió quien reportó, si añadió algo. */
  readonly detail: string | null;
  readonly status: ReportStatus;
  readonly createdAt: Instant;
  /** Cuándo se revisó o descartó. `null` mientras siga pendiente. */
  readonly reviewedAt: Instant | null;
}

/**
 * Una persona dentro de un reporte.
 *
 * Más pobre que `UserSearchResult`: no lleva el punto de vista de la relación, porque quien
 * lee el panel no está decidiendo si agregarla de contacto. Lleva lo justo para reconocerla
 * y poder buscarla.
 */
export interface ReportUser {
  readonly id: EntityId;
  readonly username: string;
  readonly displayName: string;
}

/**
 * Los reportes que se listan en el panel, con el conteo de los que faltan por mirar.
 *
 * El número viaja aparte y no se deriva de la lista porque la lista está paginada: contar
 * los pendientes sobre lo que llegó daría «12 pendientes» cuando hay ochenta.
 */
export interface ReportList {
  readonly reports: readonly Report[];
  readonly pendientes: number;
}
