/**
 * Los números del panel de operación (Fase 25).
 *
 * Principio VIII: definidos una vez aquí, consumidos por la API que los calcula y por la web
 * que los pinta. La app **no** los consume, y eso es deliberado: el panel es una herramienta
 * de operación que se lee en una pantalla grande donde caben tablas, no una función del
 * producto que un estudiante use.
 *
 * ## La regla que gobierna este archivo
 *
 * **Todo son conteos.** Ni un solo campo de aquí lleva el contenido de un mensaje, de una
 * tarea, de un horario ni de una publicación de nadie en particular. El panel responde
 * «cuántos», nunca «quién» ni «qué». La política de privacidad (Fase 19) promete exactamente
 * eso, así que un campo que lo rompiera dejaría la política mintiendo — y ese es el orden
 * correcto de las prioridades: si un número solo se puede obtener mirando el contenido de
 * alguien, el número no se obtiene.
 */

import type { Instant } from './auth.js';

/** Lo que ya está guardado, contado tabla por tabla. */
export interface PanelInventario {
  readonly usuarios: number;
  /** Cuentas borradas y anonimizadas (Fase 20). No se cuentan como usuarios. */
  readonly cuentasBorradas: number;
  /**
   * Cuántos tienen al menos una materia capturada, y su porcentaje sobre el total.
   *
   * Es **el** indicador de si el producto prendió: alguien que se registró y no capturó su
   * horario no llegó a usar NoteCore, se asomó. Todos los demás números crecen con el tiempo
   * de forma poco informativa; este dice si la puerta de entrada funciona.
   */
  readonly conHorario: number;
  readonly materias: number;
  readonly sesionesDeClase: number;
  readonly faltas: number;
  readonly tareas: number;
  readonly publicaciones: number;
  readonly mensajes: number;
  readonly conversaciones: number;
  readonly contactos: number;
  readonly periodosActivos: number;
  readonly periodosArchivados: number;
  readonly comparticionesCreadas: number;
  /** Suma de `accepted_count`: cuántas veces se aceptó algo compartido. */
  readonly comparticionesAceptadas: number;
}

/** Altas por semana, de la más reciente hacia atrás. */
export interface PanelAltaSemanal {
  /** Lunes de esa semana, en formato `YYYY-MM-DD`. */
  readonly semana: string;
  readonly altas: number;
}

/** Quién ha entrado y desde dónde. */
export interface PanelActividad {
  readonly activosHoy: number;
  readonly activos7Dias: number;
  readonly activos30Dias: number;
  /**
   * Sesiones vivas por cliente.
   *
   * Es el número que dice si la paridad de plataformas sirve de algo o si un cliente se usa
   * y el otro no — la pregunta que el Principio I lleva sin poder responder desde la Fase 0.
   */
  readonly sesionesApp: number;
  readonly sesionesWeb: number;
}

/** Qué versión tiene instalada cada quien, por cliente. */
export interface PanelVersion {
  readonly client: 'web' | 'mobile';
  /** `null` en las sesiones que no han vuelto a usarse desde que esto se registra. */
  readonly version: string | null;
  readonly sesiones: number;
}

/** Salud del servicio. */
export interface PanelSalud {
  /** Desde cuándo lleva viva esta instancia de la API, en segundos. */
  readonly apiUptimeSegundos: number;
  /** Tamaño de la base de datos, ya legible («48 MB»). */
  readonly tamanoBaseDatos: string;
  /** Cuándo se calcularon estos números. */
  readonly calculadoEn: Instant;
}

/**
 * Cuántos vuelven después de registrarse.
 *
 * Se mide sobre `sessions.last_used_at`, que es lo que hay: una cuenta cuya sesión se usó
 * más de 7 días después del alta es alguien que volvió. No es una definición perfecta —una
 * sesión abierta que el teléfono refresca sola cuenta como vuelta—, y conviene recordarlo
 * antes de sacar conclusiones finas de estos dos números.
 */
export interface PanelRetencion {
  /** Cuentas con más de 7 días de vida, para que la pregunta tenga sentido. */
  readonly elegibles7: number;
  readonly volvieron7: number;
  readonly elegibles30: number;
  readonly volvieron30: number;
}

/**
 * Dónde se cae quien se registra.
 *
 * Tres escalones: se registró → capturó su horario → volvió otro día. Si mucha gente se
 * registra y no llega a capturar horario, el problema está en esa pantalla y no en otro
 * sitio — que es justo lo que un número global de usuarios nunca dice.
 */
export interface PanelEmbudo {
  readonly registrados: number;
  readonly capturaronHorario: number;
  readonly volvieronOtroDia: number;
}

/** Todo el panel, en una sola respuesta. */
export interface PanelResumen {
  readonly inventario: PanelInventario;
  /**
   * Cuántos reportes de contenido esperan revisión (Fase 21).
   *
   * Viaja en el resumen y no solo en la lista de reportes porque es lo único del panel que
   * pide **una acción de una persona**: el resto son números que se miran. Quien abre el
   * panel tiene que ver que hay algo pendiente sin ir a buscarlo — un aviso al que hay que
   * navegar para enterarse de que existe no es un aviso.
   */
  readonly reportesPendientes: number;
  readonly altasPorSemana: readonly PanelAltaSemanal[];
  readonly actividad: PanelActividad;
  readonly versiones: readonly PanelVersion[];
  readonly salud: PanelSalud;
  readonly retencion: PanelRetencion;
  readonly embudo: PanelEmbudo;
}
