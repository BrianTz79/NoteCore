import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  classAlertMessage,
  classAlertTitle,
  DEFAULT_SNOOZE_MINUTES,
  reminderInstant,
  reminderMessage,
  SNOOZE_LABELS,
  WEEKDAYS,
  type SnoozeMinutes,
  type ClassAlertPlan,
  type ReminderPlan,
} from '@notecore/shared';

/**
 * Notificaciones locales de los recordatorios (FR-026, FR-027).
 *
 * Son **locales**, no push: el servidor no manda nada al dispositivo. La app pide el plan de
 * recordatorios —donde el servidor ya resolvió qué avisar y cuándo (Principio II)— y programa
 * las notificaciones con el sistema operativo, que las emite aunque la app esté cerrada.
 *
 * Elegir locales sobre push no es un atajo: un recordatorio de entrega no necesita servidor en
 * el momento del aviso, y push exigiría credenciales de Firebase, un token por dispositivo y
 * un servicio que despierte a la hora exacta. Todo eso para decir algo que el teléfono ya sabe.
 */

/**
 * Cómo se presenta una notificación con la app abierta.
 *
 * Sin esto, Android se la traga cuando la app está en primer plano: el usuario que esté dentro
 * de NoteCore a las 20:00 no vería el aviso de la entrega de mañana.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Identifica los recordatorios de entrega en el canal de Android. */
const CHANNEL_ID = 'recordatorios';

/**
 * Canal propio para los avisos de clase (Fase 27).
 *
 * No comparte canal con los recordatorios de entrega, y esa es la decisión: en Android el
 * canal es la unidad que el usuario silencia desde los ajustes del sistema. Con un solo canal,
 * quien encontrara molestos los avisos de clase solo podría callarlos silenciando también los
 * recordatorios de entrega, que sí quería. Dos canales le dan ese control sin tener que entrar
 * en la app.
 */
const CANAL_CLASES = 'clases';

/**
 * Prefijos con los que se reconocen nuestras notificaciones ya programadas.
 *
 * Existen porque hay **dos** familias de avisos con ciclos de vida distintos, y cada una debe
 * poder reprogramarse sin borrar la otra. Hasta la Fase 27 bastaba `cancelAllScheduled…`, que
 * arrasa con todo; usarlo ahora significaría que abrir el calendario —que reprograma las
 * entregas— borraría en silencio los avisos de clase de toda la semana.
 */
const PREFIJO_ENTREGA = 'entrega:';
const PREFIJO_CLASE = 'clase:';

/**
 * Categoría con los botones del recordatorio de entrega (Fase 28).
 *
 * En Android una notificación solo lleva botones si su contenido declara una **categoría**
 * registrada antes. Registrarla es idempotente, así que se hace junto al canal, en el mismo
 * sitio donde ya se prepara todo lo que el sistema necesita saber antes de emitir.
 */
const CATEGORIA_ENTREGA = 'entrega-acciones';

/** Identificadores de los botones. Llegan de vuelta en la respuesta del usuario. */
export const ACCION_CUMPLIDA = 'cumplida';
export const ACCION_APLAZAR = 'aplazar';

/**
 * Cancela solo las notificaciones de una familia, dejando intacta la otra.
 *
 * Se listan las pendientes y se cancelan por identificador. Es más trabajo que cancelarlo
 * todo, pero es lo único correcto con dos familias conviviendo.
 */
async function cancelarPorPrefijo(prefijo: string): Promise<void> {
  const pendientes = await Notifications.getAllScheduledNotificationsAsync();

  await Promise.all(
    pendientes
      .filter((pendiente) => pendiente.identifier.startsWith(prefijo))
      .map((pendiente) => Notifications.cancelScheduledNotificationAsync(pendiente.identifier)),
  );
}

/**
 * Pide permiso para notificar y prepara el canal de Android.
 *
 * Devuelve `false` si el usuario lo niega: el resto de la app sigue funcionando y la pantalla
 * lo explica, en vez de programar avisos que nunca llegarían.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  // Desde Android 8 toda notificación necesita un canal; sin él no se muestra ninguna.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Recordatorios de entregas',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
    });

    // El aviso de clase va en su propio canal para que se pueda silenciar por separado
    // (Fase 27). Con importancia alta porque llega minutos antes de tener que moverse: un
    // aviso que solo aparece en la bandeja llegaría cuando la clase ya empezó.
    await Notifications.setNotificationChannelAsync(CANAL_CLASES, {
      name: 'Aviso de la siguiente clase',
      importance: Notifications.AndroidImportance.HIGH,
      sound: null,
    });
  }

  /**
   * Los dos botones del recordatorio de entrega (Fase 28).
   *
   * Son **dos** y no cuatro aplazamientos distintos: Android esconde tras «expandir» todo lo
   * que pase de dos o tres botones, y gastarlos en variantes de lo mismo dejaría fuera
   * «Cumplida», que es el que más se usa. La lista completa de aplazamientos sigue dentro de
   * la app; aquí va el de una hora, que es el que sirve sin pensarlo.
   *
   * Ninguno abre la app (`opensAppToForeground: false`): el sentido de un botón en la
   * notificación es resolver sin entrar. Abrir la app para marcar una tarea hecha sería
   * exactamente lo que el botón existe para evitar.
   */
  await Notifications.setNotificationCategoryAsync(CATEGORIA_ENTREGA, [
    {
      identifier: ACCION_CUMPLIDA,
      buttonTitle: 'Cumplida',
      options: { opensAppToForeground: false },
    },
    {
      identifier: ACCION_APLAZAR,
      buttonTitle: SNOOZE_LABELS[DEFAULT_SNOOZE_MINUTES],
      options: { opensAppToForeground: false },
    },
  ]);

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  // Solo se vuelve a preguntar si el sistema aún lo permite: insistir tras un "no" definitivo
  // no abre ningún diálogo y devolvería `false` igual.
  if (!current.canAskAgain) return false;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Reprograma **todas** las notificaciones a partir del plan del servidor (FR-027).
 *
 * Cancela lo que hubiera y programa la lista entera, en lugar de calcular diferencias. Es lo
 * que hace que FR-027 se cumpla sin llevar registro de lo ya programado: una actividad que
 * cambió de fecha, se completó o se borró simplemente no viene en el plan, y su notificación
 * desaparece al cancelarse todo. Calcular diferencias exigiría un estado local que se
 * desincronizaría en cuanto se editara algo desde la web.
 *
 * Devuelve cuántas quedaron programadas, que es lo que la pantalla muestra.
 */
export async function reprogramarRecordatorios(plan: ReminderPlan): Promise<number> {
  // Primero se cancelan las de entrega: es la mitad de FR-027 y debe ocurrir aunque no quede
  // ninguna por programar —recordatorios apagados, o agenda vacía—. Solo las de entrega: los
  // avisos de clase tienen su propio ciclo y borrarlos aquí los haría desaparecer cada vez
  // que se abriera el calendario.
  await cancelarPorPrefijo(PREFIJO_ENTREGA);

  if (!plan.settings.enabled || plan.reminders.length === 0) return 0;

  const permitido = await ensureNotificationPermission();
  if (!permitido) return 0;

  let programadas = 0;

  for (const recordatorio of plan.reminders) {
    // Lo que ya pasó no se programa: Android descarta las fechas pasadas, así que intentarlo
    // solo daría la falsa impresión de que el aviso llegará. El servidor ya lo marcó.
    if (recordatorio.overdue) continue;

    const cuando = reminderInstant(recordatorio.remindOn, recordatorio.remindAt);

    await Notifications.scheduleNotificationAsync({
      // Identificador propio para poder cancelar esta familia sin tocar la otra.
      identifier: `${PREFIJO_ENTREGA}${recordatorio.itemId}`,
      content: {
        title: 'NoteCore',
        body: reminderMessage(
          recordatorio.title,
          recordatorio.subjectName,
          plan.settings.leadDays,
        ),
        // El identificador de la actividad viaja con la notificación para que al tocarla la
        // app pueda abrir esa entrega en concreto, y para que los botones de la Fase 28
        // sepan sobre qué actúan: la respuesta del usuario solo trae la notificación, no el
        // estado de la pantalla.
        data: { itemId: recordatorio.itemId },
        // Sin categoría no aparece ningún botón (Fase 28).
        categoryIdentifier: CATEGORIA_ENTREGA,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: cuando,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    });

    programadas++;
  }

  return programadas;
}

/** Cuántas notificaciones hay programadas ahora mismo. Sirve para verificar en dispositivo. */
export async function contarProgramadas(): Promise<number> {
  const pendientes = await Notifications.getAllScheduledNotificationsAsync();
  return pendientes.length;
}

/**
 * Programa los avisos de la siguiente clase (Fase 27).
 *
 * ## Por qué son semanales y no fechas
 *
 * Una entrega vence una vez, así que su recordatorio es un disparador de fecha única. Una
 * clase se repite **todas las semanas** mientras el semestre siga abierto. Programarla como
 * fecha obligaría a reprogramar cada siete días, y quien no abriera la app en una semana se
 * quedaría sin avisos justo cuando más falta le hacen. Un disparador `WEEKLY` lo repite el
 * sistema operativo, sin que la app tenga que despertarse.
 *
 * ## El desfase del día de la semana
 *
 * `expo-notifications` numera el `weekday` del disparador semanal con **domingo = 1**, no con
 * lunes = 1 ni con el 0 de `Date.getDay()`. `WEEKDAYS` de `shared` empieza en lunes, así que
 * hay que convertir: sin esto todos los avisos saldrían un día antes de lo debido, que es un
 * fallo que no se nota hasta el día siguiente.
 *
 * Devuelve cuántos quedaron programados, que es lo que la pantalla muestra.
 */
export async function reprogramarAvisosDeClase(plan: ClassAlertPlan): Promise<number> {
  // Solo la familia de clases: los recordatorios de entrega tienen su propio ciclo.
  await cancelarPorPrefijo(PREFIJO_CLASE);

  if (!plan.settings.enabled || plan.alerts.length === 0) return 0;

  const permitido = await ensureNotificationPermission();
  if (!permitido) return 0;

  let programados = 0;

  for (const aviso of plan.alerts) {
    // Restar la antelación cruzó la medianoche: el aviso caería el día anterior, y avisar el
    // domingo a las 23:50 de la clase del lunes es correcto en aritmética y absurdo en la
    // práctica. El servidor ya lo marcó; aquí solo se respeta.
    if (aviso.crossesMidnight) continue;

    const diaExpo = weekdayParaExpo(aviso.weekday);
    if (diaExpo === null) continue;

    const [hora, minuto] = aviso.alertAt.split(':').map(Number);

    await Notifications.scheduleNotificationAsync({
      // El identificador incluye el bloque: una materia con dos sesiones a la semana son dos
      // avisos distintos, y sin el bloque el segundo sobrescribiría al primero.
      identifier: `${PREFIJO_CLASE}${aviso.blockId}`,
      content: {
        // El título es la materia y el cuerpo dice hora y aula: lo que se lee de un vistazo
        // en la pantalla de bloqueo es el título, y saber qué clase toca es lo urgente.
        title: classAlertTitle(aviso),
        body: classAlertMessage(aviso),
        data: { blockId: aviso.blockId, subjectId: aviso.subjectId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: diaExpo,
        hour: hora ?? 0,
        minute: minuto ?? 0,
        ...(Platform.OS === 'android' ? { channelId: CANAL_CLASES } : {}),
      },
    });

    programados++;
  }

  return programados;
}

/**
 * Traduce el día de `shared` al que espera el disparador semanal de `expo-notifications`.
 *
 * `WEEKDAYS` empieza en lunes (índice 0); el disparador cuenta desde **domingo = 1**. Devuelve
 * `null` para un día que no esté en la lista, que no debería ocurrir con datos del servidor
 * pero evita programar un aviso en un día inventado si alguna vez ocurre.
 */
function weekdayParaExpo(weekday: string): number | null {
  const indice = WEEKDAYS.indexOf(weekday as (typeof WEEKDAYS)[number]);
  if (indice < 0) return null;

  // lunes (0) → 2, martes (1) → 3, …, sábado (5) → 7.
  return indice + 2;
}

/**
 * Atiende los botones de la notificación de entrega (Fase 28).
 *
 * ## Por qué se registra en la raíz y no en la pantalla de agenda
 *
 * Porque la respuesta llega cuando la app **no está abierta** —ese es el sentido de un botón
 * que no abre la app—. Un escucha montado en una pantalla solo existiría mientras esa pantalla
 * estuviera en el árbol, que es justo cuando el botón no hace falta.
 *
 * ## Por qué actúa contra la cola y no contra la API
 *
 * Porque un aviso de entrega llega a la hora que llega, y esa hora puede coincidir con el
 * campus sin señal. Mandar la petición directamente significaría que «Cumplida» falla en
 * silencio y la tarea sigue apareciendo pendiente al día siguiente. La cola de la Fase 9 ya
 * resuelve esto: la operación se guarda con el identificador definitivo de la actividad y
 * sube sola cuando vuelva la red.
 *
 * Devuelve una función para dejar de escuchar, que es lo que el efecto que la monta necesita.
 */
export function atenderAccionesDeNotificacion(handlers: {
  onCumplida: (itemId: string) => Promise<void>;
  onAplazar: (itemId: string, minutos: SnoozeMinutes) => Promise<void>;
}): () => void {
  const suscripcion = Notifications.addNotificationResponseReceivedListener((respuesta) => {
    const accion = respuesta.actionIdentifier;

    // Tocar el cuerpo de la notificación no es ninguna de las dos acciones: abre la app, que
    // es lo que ya hacía antes de esta fase.
    if (accion !== ACCION_CUMPLIDA && accion !== ACCION_APLAZAR) return;

    const datos = respuesta.notification.request.content.data as { itemId?: unknown };
    const itemId = typeof datos?.itemId === 'string' ? datos.itemId : null;

    // Sin identificador no hay nada sobre lo que actuar. No debería ocurrir —lo escribe esta
    // misma app al programar—, pero una notificación vieja de antes de la Fase 28 podría
    // seguir en el sistema, y actuar sobre `undefined` borraría lo que no toca.
    if (itemId === null) return;

    void (accion === ACCION_CUMPLIDA
      ? handlers.onCumplida(itemId)
      : handlers.onAplazar(itemId, DEFAULT_SNOOZE_MINUTES));
  });

  return () => suscripcion.remove();
}
