/**
 * Los consejos de la pantalla de inicio (Fase 29).
 *
 * ## Qué problema resuelven
 *
 * NoteCore hace bastantes cosas —compartir por QR, archivar periodos, avisar antes de clase,
 * widgets, consulta sin conexión— y ninguna se anuncia. Quien entra ve su horario y su agenda,
 * y el resto existe sin que nadie se entere. Estos consejos son la puerta a lo demás.
 *
 * ## Por qué la elección vive aquí y no en cada cliente
 *
 * Principio II. Un consejo se elige mirando el estado real de la cuenta —¿tiene horario?,
 * ¿tiene contactos?, ¿ya encendió los avisos?— y esa decisión debe dar el mismo resultado en
 * la web y en la app. Si cada cliente la tomara por su cuenta, la web sugeriría capturar el
 * horario mientras la app felicita por tenerlo, y el usuario no sabría a cuál creer.
 *
 * ## La regla que los hace útiles y no ruido
 *
 * **Un consejo solo aparece si su condición se cumple.** No es una lista que rota al azar: es
 * un conjunto de reglas sobre el estado de la cuenta, y cada una responde a algo que a esta
 * persona en concreto le falta por descubrir. A quien ya comparte su horario no se le sugiere
 * compartirlo; a quien no tiene ni una materia no se le habla de widgets, porque el widget que
 * vería estaría vacío.
 *
 * Es lo que separa un tutorial de un anuncio: el anuncio se repite igual para todos.
 */

/** En qué sección se resuelve un consejo, para que el cliente sepa a dónde llevar. */
export const TIP_DESTINOS = [
  'horario',
  'faltas',
  'agenda',
  'calendario',
  'compartir',
  'semestres',
  'social',
  'ajustes',
] as const;
export type TipDestino = (typeof TIP_DESTINOS)[number];

export interface Tip {
  /** Identificador estable. Se usa para recordar cuáles se descartaron. */
  readonly id: string;
  readonly titulo: string;
  readonly cuerpo: string;
  /** A dónde lleva el consejo, si lleva a algún sitio. */
  readonly destino: TipDestino | null;
  /** Texto del botón que lleva allí. */
  readonly accion: string | null;
}

/**
 * El estado de la cuenta contra el que se evalúan los consejos.
 *
 * Son datos que el inicio **ya tiene cargados** para pintar lo suyo: ninguno obliga a una
 * consulta extra. Un consejo que costara una petición de red dejaría de ser gratis, y lo
 * primero que se recorta cuando la conexión va mal es justo lo accesorio.
 */
export interface TipContext {
  /** Cuántas materias tiene capturadas. */
  readonly materias: number;
  /** Actividades pendientes en la agenda. */
  readonly pendientes: number;
  /** Si tiene alguna falta registrada. */
  readonly tieneFaltas: boolean;
  /** Si los recordatorios de entrega están encendidos (Fase 5). */
  readonly recordatoriosActivos: boolean;
  /** Si el aviso de la siguiente clase está encendido (Fase 27). */
  readonly avisoClaseActivo: boolean;
  /** Contactos aceptados (Fase 8). */
  readonly contactos: number;
  /** Si ya ha compartido algo alguna vez (Fase 6). */
  readonly haCompartido: boolean;
  /** Si tiene más de un periodo, es decir, si ya archivó alguno (Fase 7). */
  readonly periodos: number;
}

/**
 * Todos los consejos, con la condición que decide si tocan.
 *
 * El orden importa: es el de prioridad. Quien no tiene horario necesita capturarlo antes que
 * enterarse de los widgets, así que lo primero de la lista es lo más básico.
 */
const CATALOGO: readonly {
  readonly tip: Tip;
  readonly aplica: (ctx: TipContext) => boolean;
}[] = [
  {
    tip: {
      id: 'captura-horario',
      titulo: 'Empieza por tu horario',
      cuerpo:
        'Captura tus materias y sus horas, o pégale a NoteCore el horario que te dio tu escuela y deja que lo lea por ti.',
      destino: 'horario',
      accion: 'Ir al horario',
    },
    // Sin materias no hay nada más que hacer: todo lo demás cuelga del horario.
    aplica: (ctx) => ctx.materias === 0,
  },
  {
    tip: {
      id: 'aviso-de-clase',
      titulo: 'Que te avise antes de cada clase',
      cuerpo:
        'NoteCore puede avisarte unos minutos antes de que empiece cada clase, con la materia y el aula. Viene apagado: enciéndelo en el calendario si lo quieres.',
      destino: 'calendario',
      accion: 'Encenderlo',
    },
    // Solo tiene sentido con horario capturado, y solo si aún no lo encendió.
    aplica: (ctx) => ctx.materias > 0 && !ctx.avisoClaseActivo,
  },
  {
    tip: {
      id: 'recordatorios',
      titulo: 'Que te recuerde tus entregas',
      cuerpo:
        'Elige con cuánta anticipación quieres el aviso —desde el mismo día hasta una semana antes— y a qué hora te llega.',
      destino: 'calendario',
      accion: 'Configurarlo',
    },
    aplica: (ctx) => ctx.pendientes > 0 && !ctx.recordatoriosActivos,
  },
  {
    tip: {
      id: 'botones-notificacion',
      titulo: 'Resuelve desde la notificación',
      cuerpo:
        'Cuando te llegue el aviso de una entrega, puedes marcarla como cumplida o posponerla sin abrir la app: los botones están en la propia notificación.',
      destino: 'agenda',
      accion: 'Ver mi agenda',
    },
    // Solo a quien ya recibe avisos: contarle los botones a quien los tiene apagados
    // describiría algo que nunca va a ver.
    aplica: (ctx) => ctx.recordatoriosActivos && ctx.pendientes > 0,
  },
  {
    tip: {
      id: 'limite-de-faltas',
      titulo: 'Tu límite de faltas es una sugerencia',
      cuerpo:
        'NoteCore lo calcula como el 20% de las sesiones del periodo, pero cada profesor lleva su cuenta. Ajústalo si el tuyo dice otra cosa.',
      destino: 'faltas',
      accion: 'Ver mis faltas',
    },
    aplica: (ctx) => ctx.materias > 0 && ctx.tieneFaltas,
  },
  {
    tip: {
      id: 'compartir',
      titulo: 'Pásale tu horario a alguien',
      cuerpo:
        'Con un QR, un código corto o un enlace. Quien lo reciba se queda con una copia suya: lo que tú cambies después no le toca su horario.',
      destino: 'compartir',
      accion: 'Compartir',
    },
    aplica: (ctx) => ctx.materias > 0 && !ctx.haCompartido,
  },
  {
    tip: {
      id: 'widgets',
      titulo: 'Ponlo en tu pantalla de inicio',
      cuerpo:
        'Hay cuatro widgets: la próxima clase, el día completo, tus faltas y lo que vence pronto. Mantén pulsada la pantalla de tu teléfono para añadirlos.',
      destino: null,
      accion: null,
    },
    // Sin destino: los widgets se añaden desde el lanzador de Android, no desde la app.
    aplica: (ctx) => ctx.materias > 0,
  },
  {
    tip: {
      id: 'sin-conexion',
      titulo: 'Funciona sin señal',
      cuerpo:
        'Puedes consultar tu horario, tus faltas y tu agenda sin conexión. Lo que anotes mientras tanto se sube solo cuando vuelva la red.',
      destino: null,
      accion: null,
    },
    aplica: (ctx) => ctx.materias > 0,
  },
  {
    tip: {
      id: 'contactos',
      titulo: 'Busca a tus compañeros',
      cuerpo:
        'Encuéntralos por su @usuario, comparte tu perfil con un QR y escríbeles desde la app.',
      destino: 'social',
      accion: 'Ir a contactos',
    },
    aplica: (ctx) => ctx.contactos === 0,
  },
  {
    tip: {
      id: 'archivar-periodo',
      titulo: 'Al terminar, archiva tu periodo',
      cuerpo:
        'Cerrar un semestre o cuatrimestre no borra nada: lo deja en solo lectura y empiezas el siguiente en limpio, con el historial intacto.',
      destino: 'semestres',
      accion: 'Ver mis periodos',
    },
    // A quien ya archivó alguno no hace falta explicárselo: ya lo hizo.
    aplica: (ctx) => ctx.materias > 0 && ctx.periodos === 1,
  },
  {
    tip: {
      id: 'privacidad',
      titulo: 'Qué guardamos de ti',
      cuerpo:
        'Está escrito y es corto: no hay publicidad, no hay analítica de terceros y tus datos no se venden. Puedes borrar tu cuenta cuando quieras.',
      destino: 'ajustes',
      accion: 'Leerlo',
    },
    // Para todo el mundo: no depende del estado, y es lo que alguien se pregunta al empezar.
    aplica: () => true,
  },
];

/**
 * Los consejos que le tocan a esta cuenta, en orden de prioridad.
 *
 * `descartados` son los que el usuario ya cerró: no vuelven. Se pasan desde el cliente porque
 * viven en su almacenamiento local —es una preferencia de este dispositivo, no un dato de la
 * cuenta, y no merece una tabla ni un viaje al servidor—.
 */
export function tipsPara(ctx: TipContext, descartados: readonly string[] = []): Tip[] {
  return CATALOGO.filter(
    (entrada) => entrada.aplica(ctx) && !descartados.includes(entrada.tip.id),
  ).map((entrada) => entrada.tip);
}

/**
 * El consejo que toca enseñar ahora, o `null` si no queda ninguno.
 *
 * **Uno solo, no la lista entera**, y es la decisión que define la fase: una pantalla de inicio
 * con seis tarjetas de consejo deja de ser una pantalla de inicio. El sitio de arriba es para
 * la próxima clase y lo que urge; el consejo va debajo, ocupa una tarjeta, y quien lo cierra ve
 * el siguiente la próxima vez.
 */
export function siguienteTip(
  ctx: TipContext,
  descartados: readonly string[] = [],
): Tip | null {
  return tipsPara(ctx, descartados)[0] ?? null;
}
