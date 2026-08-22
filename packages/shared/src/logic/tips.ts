/**
 * Los consejos de la pantalla de inicio (Fase 29).
 *
 * ## Qué problema resuelven
 *
 * NoteCore hace bastantes cosas —importar el horario desde una IA, compartir por QR, justificar
 * faltas, archivar periodos, widgets, consulta sin conexión, mensajería— y casi ninguna se
 * anuncia. Quien entra ve su horario y su agenda, y el resto existe sin que nadie se entere.
 *
 * ## El modelo: pantalla de carga de videojuego, no asistente de primeros pasos
 *
 * Los consejos **rotan al azar** y **se repiten aunque ya sepas la función**, igual que los de la
 * pantalla de carga de un juego. Esa es la decisión que define el módulo, y es deliberadamente lo
 * contrario de un tutorial que se completa y desaparece: una función que se usó una vez en
 * septiembre se olvida en noviembre, y el consejo está para recordarla. Un tutorial que solo
 * enseña lo que aún no has hecho deja de hablarte justo cuando llevas tiempo usando la app, que
 * es cuando más funciones has olvidado.
 *
 * Por eso **casi todos aplican siempre**. La condición existe solo para lo que sería
 * incomprensible o falso en ese momento: no se habla de widgets a quien no tiene ni una materia
 * —el widget que vería estaría vacío—, ni de justificar faltas a quien no ha registrado ninguna.
 * Esa es la única razón para condicionar un consejo; «ya lo ha hecho» **no** lo es.
 *
 * ## Por qué la elección vive aquí y no en cada cliente
 *
 * Principio II. Las condiciones se evalúan sobre el estado real de la cuenta, y esa decisión debe
 * dar el mismo resultado en la web y en la app. Si cada cliente la tomara por su cuenta, la web
 * sugeriría capturar el horario mientras la app felicita por tenerlo.
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
  'mensajes',
  'ajustes',
] as const;
export type TipDestino = (typeof TIP_DESTINOS)[number];

/**
 * De qué habla el consejo. Agrupa el catálogo y permite equilibrar la selección.
 *
 * Sin categorías, elegir tres al azar de un catálogo donde ocho consejos hablan del horario daría
 * casi siempre tres consejos de horario. Con ellas se puede repartir.
 */
export const TIP_TEMAS = [
  'horario',
  'faltas',
  'agenda',
  'avisos',
  'compartir',
  'periodos',
  'social',
  'app',
  'privacidad',
] as const;
export type TipTema = (typeof TIP_TEMAS)[number];

export interface Tip {
  /** Identificador estable. Se usa para recordar cuáles se descartaron. */
  readonly id: string;
  readonly titulo: string;
  readonly cuerpo: string;
  readonly tema: TipTema;
  /** A dónde lleva el consejo, si lleva a algún sitio. */
  readonly destino: TipDestino | null;
  /** Texto del botón que lleva allí. */
  readonly accion: string | null;
}

/**
 * El estado de la cuenta contra el que se evalúan los consejos.
 *
 * Son datos que el inicio **ya tiene cargados** o que llegan en una sola petición: ninguno obliga
 * a una consulta por consejo. Un catálogo que costara una petición por regla dejaría de ser
 * gratis, y lo primero que se recorta cuando la conexión va mal es justo lo accesorio.
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
  /** Cuántos periodos tiene, es decir, si ya archivó alguno (Fase 7). */
  readonly periodos: number;
}

/** Un consejo que se enseña siempre: no depende de nada del estado de la cuenta. */
const SIEMPRE = () => true;

/**
 * El catálogo completo.
 *
 * La condición de cada uno responde solo a «¿este consejo sería incomprensible o falso ahora
 * mismo?». Nunca a «¿ya lo sabe?»: los consejos se repiten a propósito.
 */
const CATALOGO: readonly {
  readonly tip: Tip;
  readonly aplica: (ctx: TipContext) => boolean;
}[] = [
  /* ── Horario ─────────────────────────────────────────────────────────── */
  {
    tip: {
      id: 'captura-horario',
      titulo: 'Empieza por tu horario',
      cuerpo:
        'Todo lo demás cuelga de él: las faltas se cuentan por sesión, la agenda se ordena por materia y el calendario combina las dos cosas.',
      tema: 'horario',
      destino: 'horario',
      accion: 'Ir al horario',
    },
    // Único consejo que se calla cuando ya está hecho: decirle «empieza por tu horario» a
    // quien lleva medio semestre con el suyo capturado sería absurdo, no un recordatorio.
    aplica: (ctx) => ctx.materias === 0,
  },
  {
    tip: {
      id: 'importar-ia',
      titulo: 'No captures tu horario a mano',
      cuerpo:
        'NoteCore te da un texto para pegarle a cualquier IA junto a la foto o el PDF de tu horario. Le pegas de vuelta lo que responda y lo lee entero, con una vista previa antes de guardar nada.',
      tema: 'horario',
      destino: 'horario',
      accion: 'Probarlo',
    },
    aplica: SIEMPRE,
  },
  {
    tip: {
      id: 'colores-materias',
      titulo: 'Cada materia tiene su color',
      cuerpo:
        'Se asigna solo al crearla, y es el mismo en el horario, en el calendario, en la agenda y en los widgets. Así reconoces una materia de un vistazo sin leer su nombre.',
      tema: 'horario',
      destino: 'horario',
      accion: 'Ver mi semana',
    },
    aplica: (ctx) => ctx.materias > 0,
  },
  {
    tip: {
      id: 'aula-en-el-horario',
      titulo: 'Apunta el aula de cada clase',
      cuerpo:
        'Es opcional, pero es lo que aparece en el aviso de la siguiente clase y en el widget. En un edificio que no conoces, es justo el dato que se agradece.',
      tema: 'horario',
      destino: 'horario',
      accion: 'Editar mi horario',
    },
    aplica: (ctx) => ctx.materias > 0,
  },

  /* ── Faltas ──────────────────────────────────────────────────────────── */
  {
    tip: {
      id: 'limite-de-faltas',
      titulo: 'Tu límite de faltas es una sugerencia',
      cuerpo:
        'NoteCore lo calcula como el 20% de las sesiones del periodo, siguiendo la norma del TecNM. Pero cada profesor lleva su cuenta: confírmalo con el tuyo y ajústalo si dice otra cosa.',
      tema: 'faltas',
      destino: 'faltas',
      accion: 'Ver mis faltas',
    },
    aplica: SIEMPRE,
  },
  {
    tip: {
      id: 'falta-dia-completo',
      titulo: 'Faltaste todo el día, no una clase',
      cuerpo:
        'Puedes marcar el día entero de una vez en lugar de ir sesión por sesión. Se registran las faltas de todas las clases que tocaban ese día.',
      tema: 'faltas',
      destino: 'faltas',
      accion: 'Registrar una falta',
    },
    aplica: (ctx) => ctx.materias > 0,
  },
  {
    tip: {
      id: 'justificar-faltas',
      titulo: 'Las faltas justificadas no cuentan',
      cuerpo:
        'Márcala como justificada y deja de sumar a tu límite, pero sigue registrada. Si te equivocaste al anotarla, también puedes borrarla y el conteo se recalcula solo.',
      tema: 'faltas',
      destino: 'faltas',
      accion: 'Ver mis faltas',
    },
    aplica: (ctx) => ctx.tieneFaltas,
  },
  {
    tip: {
      id: 'alerta-limite',
      titulo: 'Te avisa antes de pasarte',
      cuerpo:
        'Cuando te acercas al límite de una materia, esa materia se señala en el panel de faltas. No hay que ir contando: la cuenta la lleva NoteCore.',
      tema: 'faltas',
      destino: 'faltas',
      accion: 'Ver mis faltas',
    },
    aplica: (ctx) => ctx.materias > 0,
  },

  /* ── Agenda ──────────────────────────────────────────────────────────── */
  {
    tip: {
      id: 'agenda-rapida',
      titulo: 'Anota la tarea en clase, en dos toques',
      cuerpo:
        'Solo el título es obligatorio. La materia, la fecha y la descripción puedes ponerlas después, cuando salgas del aula.',
      tema: 'agenda',
      destino: 'agenda',
      accion: 'Añadir actividad',
    },
    aplica: SIEMPRE,
  },
  {
    tip: {
      id: 'tipos-de-actividad',
      titulo: 'No todo es una tarea',
      cuerpo:
        'Puedes marcar cada cosa como tarea, proyecto, examen o actividad. Ayuda a distinguir de un vistazo lo que se entrega de lo que se estudia.',
      tema: 'agenda',
      destino: 'agenda',
      accion: 'Ver mi agenda',
    },
    aplica: SIEMPRE,
  },
  {
    tip: {
      id: 'completar-conserva',
      titulo: 'Completar no borra',
      cuerpo:
        'Una actividad completada se guarda y puedes reabrirla cuando quieras. Borrar es otra acción distinta, para lo que anotaste por error.',
      tema: 'agenda',
      destino: 'agenda',
      accion: 'Ver mi agenda',
    },
    aplica: SIEMPRE,
  },
  {
    tip: {
      id: 'orden-por-urgencia',
      titulo: 'Lo que urge sale primero',
      cuerpo:
        'Tu agenda se ordena sola por proximidad de vencimiento, y cada actividad dice cuántos días le quedan. No hace falta que la ordenes tú.',
      tema: 'agenda',
      destino: 'agenda',
      accion: 'Ver mi agenda',
    },
    aplica: (ctx) => ctx.pendientes > 0,
  },

  /* ── Avisos y notificaciones ─────────────────────────────────────────── */
  {
    tip: {
      id: 'aviso-de-clase',
      titulo: 'Que te avise antes de cada clase',
      cuerpo:
        'NoteCore puede avisarte 5, 10, 15 o 30 minutos antes de que empiece cada clase, diciéndote la materia y el aula. Viene apagado: enciéndelo si lo quieres.',
      tema: 'avisos',
      destino: 'calendario',
      accion: 'Configurarlo',
    },
    aplica: SIEMPRE,
  },
  {
    tip: {
      id: 'recordatorios',
      titulo: 'Que te recuerde tus entregas',
      cuerpo:
        'Elige con cuánta anticipación quieres el aviso —desde el mismo día hasta una semana antes— y a qué hora te llega.',
      tema: 'avisos',
      destino: 'calendario',
      accion: 'Configurarlo',
    },
    aplica: SIEMPRE,
  },
  {
    tip: {
      id: 'botones-notificacion',
      titulo: 'Resuelve desde la notificación',
      cuerpo:
        'Cuando te llegue el aviso de una entrega, puedes marcarla como cumplida o posponerla sin abrir la app: los botones están en la propia notificación.',
      tema: 'avisos',
      destino: 'agenda',
      accion: 'Ver mi agenda',
    },
    // Contarle los botones a quien tiene los avisos apagados sería describir algo que nunca
    // va a ver. No es «ya lo sabe»: es que no existe para él.
    aplica: (ctx) => ctx.recordatoriosActivos,
  },
  {
    tip: {
      id: 'aplazar-en-la-app',
      titulo: 'Aplaza un aviso sin la notificación',
      cuerpo:
        'Desde la agenda puedes posponer el recordatorio de una entrega 30 minutos, 1, 3 o 4 horas. Son más opciones que las que caben en la notificación.',
      tema: 'avisos',
      destino: 'agenda',
      accion: 'Ver mi agenda',
    },
    aplica: (ctx) => ctx.recordatoriosActivos && ctx.pendientes > 0,
  },
  {
    tip: {
      id: 'avisos-por-separado',
      titulo: 'Silencia unos avisos y no otros',
      cuerpo:
        'Los avisos de clase y los de entregas son dos canales distintos de Android. Puedes callar uno desde los ajustes del teléfono sin perder el otro.',
      tema: 'avisos',
      destino: 'calendario',
      accion: 'Ver mis avisos',
    },
    aplica: (ctx) => ctx.avisoClaseActivo || ctx.recordatoriosActivos,
  },

  /* ── Calendario ──────────────────────────────────────────────────────── */
  {
    tip: {
      id: 'calendario-combinado',
      titulo: 'Tus clases y tus entregas, en la misma rejilla',
      cuerpo:
        'El calendario mensual junta las dos cosas. Toca cualquier día para ver qué clases tocaban, a qué hora, en qué aula y qué vencía.',
      tema: 'agenda',
      destino: 'calendario',
      accion: 'Abrir el calendario',
    },
    aplica: SIEMPRE,
  },

  /* ── Compartir ───────────────────────────────────────────────────────── */
  {
    tip: {
      id: 'compartir',
      titulo: 'Pásale tu horario a alguien',
      cuerpo:
        'Con un QR, un código corto o un enlace. Las tres formas entregan exactamente lo mismo: usa la que tengas más a mano.',
      tema: 'compartir',
      destino: 'compartir',
      accion: 'Compartir',
    },
    aplica: (ctx) => ctx.materias > 0,
  },
  {
    tip: {
      id: 'compartir-es-copia',
      titulo: 'Lo que compartes es una copia',
      cuerpo:
        'Quien lo recibe se queda con su propia versión y puede editarla. Lo que tú cambies después no le toca su horario, ni lo suyo toca el tuyo.',
      tema: 'compartir',
      destino: 'compartir',
      accion: 'Compartir algo',
    },
    aplica: (ctx) => ctx.materias > 0,
  },
  {
    tip: {
      id: 'compartir-selectivo',
      titulo: 'Elige qué compartes',
      cuerpo:
        'No tienes que mandar tu horario entero: puedes escoger qué materias y qué actividades incluir. Quien lo reciba ve una vista previa antes de aceptar.',
      tema: 'compartir',
      destino: 'compartir',
      accion: 'Compartir',
    },
    aplica: (ctx) => ctx.materias > 0,
  },
  {
    tip: {
      id: 'revocar-compartido',
      titulo: 'Te arrepentiste de compartir algo',
      cuerpo:
        'Puedes revocar un compartido y quien intente abrirlo verá que ya no está disponible. Lo que alguien ya aceptó sigue siendo suyo: era una copia.',
      tema: 'compartir',
      destino: 'compartir',
      accion: 'Ver mis compartidos',
    },
    aplica: (ctx) => ctx.haCompartido,
  },

  /* ── Periodos ────────────────────────────────────────────────────────── */
  {
    tip: {
      id: 'archivar-periodo',
      titulo: 'Al terminar, archiva tu periodo',
      cuerpo:
        'Cerrar un semestre o cuatrimestre no borra nada: lo deja en solo lectura y empiezas el siguiente en limpio, con el historial intacto.',
      tema: 'periodos',
      destino: 'semestres',
      accion: 'Ver mis periodos',
    },
    aplica: SIEMPRE,
  },
  {
    tip: {
      id: 'cuatrimestres',
      titulo: '¿Cursas cuatrimestres, no semestres?',
      cuerpo:
        'NoteCore lo lleva como tal, con sus propias semanas. El tipo va en cada periodo, así que puedes cambiar de régimen sin que se reetiquete tu historial.',
      tema: 'periodos',
      destino: 'semestres',
      accion: 'Ver mis periodos',
    },
    aplica: SIEMPRE,
  },
  {
    tip: {
      id: 'historial-consultable',
      titulo: 'Lo archivado sigue ahí',
      cuerpo:
        'Puedes consultar cualquier periodo cerrado —su horario, sus faltas y su agenda— tal como quedó. No se borra nunca.',
      tema: 'periodos',
      destino: 'semestres',
      accion: 'Ver mi historial',
    },
    aplica: (ctx) => ctx.periodos > 1,
  },
  {
    tip: {
      id: 'semanas-del-periodo',
      titulo: 'Ajusta las semanas de tu periodo',
      cuerpo:
        'De ahí sale el límite de faltas sugerido: 16 semanas no dan las mismas sesiones que 12. Si tu periodo dura otra cosa, cámbialo y los límites se recalculan.',
      tema: 'periodos',
      destino: 'semestres',
      accion: 'Ver mis periodos',
    },
    aplica: SIEMPRE,
  },

  /* ── Social y mensajes ───────────────────────────────────────────────── */
  {
    tip: {
      id: 'contactos',
      titulo: 'Busca a tus compañeros',
      cuerpo:
        'Encuéntralos por su @usuario, o comparte tu perfil con un QR y que te agreguen ellos. Hace falta que la otra persona acepte.',
      tema: 'social',
      destino: 'social',
      accion: 'Ir a contactos',
    },
    aplica: SIEMPRE,
  },
  {
    tip: {
      id: 'visibilidad-perfil',
      titulo: 'Tú decides qué se ve de tu perfil',
      cuerpo:
        'Tu biografía, carrera, escuela y edad son opcionales, y eliges quién puede verlas. Lo que la visibilidad no permite ni siquiera sale del servidor.',
      tema: 'social',
      destino: 'social',
      accion: 'Ajustar mi perfil',
    },
    aplica: SIEMPRE,
  },
  {
    tip: {
      id: 'mensajes',
      titulo: 'Escríbele a un compañero',
      cuerpo:
        'Puedes conversar con tus contactos dentro de NoteCore, y los mensajes llegan al momento. Solo con quien te haya aceptado.',
      tema: 'social',
      destino: 'mensajes',
      accion: 'Abrir mensajes',
    },
    aplica: (ctx) => ctx.contactos > 0,
  },
  {
    tip: {
      id: 'bloquear',
      titulo: 'Puedes bloquear a alguien',
      cuerpo:
        'Deja de poder escribirte al instante, aunque tenga la conversación abierta. A quien bloqueas no se le avisa de que lo hiciste.',
      tema: 'social',
      destino: 'social',
      accion: 'Ver mis contactos',
    },
    aplica: (ctx) => ctx.contactos > 0,
  },
  {
    tip: {
      id: 'reportar',
      titulo: 'Reporta lo que no debería estar',
      cuerpo:
        'Puedes denunciar una publicación o un mensaje con un motivo, y se revisa. Bloquear y reportar son cosas distintas: puedes hacer una, la otra o las dos.',
      tema: 'social',
      destino: 'social',
      accion: 'Ir a la sección social',
    },
    aplica: SIEMPRE,
  },

  /* ── La app y la web ─────────────────────────────────────────────────── */
  {
    tip: {
      id: 'widgets',
      titulo: 'Ponlo en tu pantalla de inicio',
      cuerpo:
        'Hay cuatro widgets: la próxima clase, el día completo, tus faltas y lo que vence pronto. Mantén pulsada la pantalla de tu teléfono para añadirlos.',
      tema: 'app',
      destino: null,
      accion: null,
    },
    // Sin materias el widget saldría vacío, así que el consejo describiría algo que no
    // funciona todavía. Sin destino: los widgets se añaden desde el lanzador de Android.
    aplica: (ctx) => ctx.materias > 0,
  },
  {
    tip: {
      id: 'sin-conexion',
      titulo: 'Funciona sin señal',
      cuerpo:
        'Puedes consultar tu horario, tus faltas y tu agenda sin conexión. Lo que anotes mientras tanto se sube solo cuando vuelva la red.',
      tema: 'app',
      destino: null,
      accion: null,
    },
    aplica: SIEMPRE,
  },
  {
    tip: {
      id: 'app-y-web',
      titulo: 'La misma cuenta, en el teléfono y en la computadora',
      cuerpo:
        'Puedes tener la sesión abierta en los dos a la vez. Lo que cambies en uno aparece en el otro: capturar el horario se hace más cómodo en pantalla grande.',
      tema: 'app',
      destino: null,
      accion: null,
    },
    aplica: SIEMPRE,
  },
  {
    tip: {
      id: 'cambios-pendientes',
      titulo: 'Sabes siempre qué falta por subir',
      cuerpo:
        'Si anotaste algo sin conexión, el inicio te dice cuántos cambios están esperando. No se pierde nada mientras tanto.',
      tema: 'app',
      destino: null,
      accion: null,
    },
    aplica: SIEMPRE,
  },

  /* ── Privacidad y cuenta ─────────────────────────────────────────────── */
  {
    tip: {
      id: 'privacidad',
      titulo: 'Qué guardamos de ti',
      cuerpo:
        'Está escrito y es corto: no hay publicidad, no hay analítica de terceros y tus datos no se venden ni se ceden.',
      tema: 'privacidad',
      destino: 'ajustes',
      accion: 'Leerlo',
    },
    aplica: SIEMPRE,
  },
  {
    tip: {
      id: 'borrar-cuenta',
      titulo: 'Puedes irte cuando quieras',
      cuerpo:
        'Borrar tu cuenta se hace desde la propia app, sin pedírselo a nadie. Se explica antes qué se borra y qué no.',
      tema: 'privacidad',
      destino: 'ajustes',
      accion: 'Ver mis ajustes',
    },
    aplica: SIEMPRE,
  },
];

/** Todos los consejos que le tocan a esta cuenta, sin ordenar ni recortar. */
export function tipsPara(ctx: TipContext, descartados: readonly string[] = []): Tip[] {
  return CATALOGO.filter(
    (entrada) => entrada.aplica(ctx) && !descartados.includes(entrada.tip.id),
  ).map((entrada) => entrada.tip);
}

/** Cuántos consejos se enseñan a la vez. */
export const TIPS_VISIBLES = 3;

/**
 * Baraja determinista a partir de una semilla.
 *
 * Determinista y no `Math.random()` porque el resultado tiene que ser **el mismo dentro de una
 * misma visita**: con azar puro, cada repintado de React barajaría de nuevo y los consejos
 * cambiarían solos mientras el usuario los está leyendo. La semilla la fija el cliente una vez al
 * abrir la pantalla, así que rota entre visitas y se está quieto dentro de una.
 *
 * Es un Fisher-Yates con un generador congruencial lineal: no necesita calidad criptográfica,
 * necesita repartir y ser reproducible.
 */
function barajarCon<T>(items: readonly T[], semilla: number): T[] {
  const copia = [...items];
  let estado = Math.abs(Math.trunc(semilla)) || 1;

  const siguiente = (): number => {
    // Constantes de Numerical Recipes: bastan de sobra para repartir consejos.
    estado = (estado * 1664525 + 1013904223) % 4294967296;
    return estado / 4294967296;
  };

  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(siguiente() * (i + 1));
    const a = copia[i];
    const b = copia[j];
    if (a !== undefined && b !== undefined) {
      copia[i] = b;
      copia[j] = a;
    }
  }

  return copia;
}

/**
 * Los consejos que se enseñan en esta visita.
 *
 * ## Cómo se eligen
 *
 * Se barajan los aplicables y se toman los primeros, **repartiendo por tema**: primero uno de
 * cada tema distinto, y solo si faltan se completa con los que sobran. Sin ese reparto, tres al
 * azar de un catálogo donde nueve consejos hablan de avisos darían casi siempre tres de avisos, y
 * parecería que la app solo sabe notificar.
 *
 * ## Por qué se repiten
 *
 * Porque son consejos de pantalla de carga, no pasos de un tutorial. Una función que usaste una
 * vez en septiembre se te ha olvidado en noviembre, y volver a verla es el objetivo. Solo
 * desaparecen los que el usuario cierra explícitamente.
 */
export function tipsDeLaVisita(
  ctx: TipContext,
  descartados: readonly string[] = [],
  semilla = 1,
  cuantos: number = TIPS_VISIBLES,
): Tip[] {
  const barajados = barajarCon(tipsPara(ctx, descartados), semilla);

  const elegidos: Tip[] = [];
  const temasUsados = new Set<TipTema>();

  // Primera pasada: uno por tema, para que los tres hablen de cosas distintas.
  for (const tip of barajados) {
    if (elegidos.length >= cuantos) break;
    if (temasUsados.has(tip.tema)) continue;
    elegidos.push(tip);
    temasUsados.add(tip.tema);
  }

  // Segunda pasada: si no había temas suficientes —porque quedan pocos consejos sin
  // descartar—, se completa con lo que haya en lugar de enseñar menos de la cuenta.
  for (const tip of barajados) {
    if (elegidos.length >= cuantos) break;
    if (!elegidos.includes(tip)) elegidos.push(tip);
  }

  return elegidos;
}

/**
 * Una semilla nueva para cada visita.
 *
 * Sale del reloj dividido entre cinco minutos: dentro de ese rato la selección se mantiene
 * —volver al inicio desde el horario no reordena lo que estabas leyendo— y de una sesión a otra
 * cambia. Es lo que hace que los consejos «roten» sin parpadear.
 */
export function semillaDeLaVisita(ahora: Date = new Date()): number {
  return Math.floor(ahora.getTime() / (5 * 60 * 1000));
}

/**
 * El primer consejo de la visita, o `null`.
 *
 * Se conserva por compatibilidad con quien solo quiera enseñar uno; el inicio usa
 * `tipsDeLaVisita`.
 */
export function siguienteTip(
  ctx: TipContext,
  descartados: readonly string[] = [],
  semilla = 1,
): Tip | null {
  return tipsDeLaVisita(ctx, descartados, semilla, 1)[0] ?? null;
}
