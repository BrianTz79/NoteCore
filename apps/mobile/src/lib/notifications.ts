import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  reminderInstant,
  reminderMessage,
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

/** Identifica nuestras notificaciones en el canal de Android. */
const CHANNEL_ID = 'recordatorios';

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
  }

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
  // Primero se cancela todo: es la mitad de FR-027 y debe ocurrir aunque no quede ninguna
  // por programar —recordatorios apagados, o agenda vacía—.
  await Notifications.cancelAllScheduledNotificationsAsync();

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
      content: {
        title: 'NoteCore',
        body: reminderMessage(
          recordatorio.title,
          recordatorio.subjectName,
          plan.settings.leadDays,
        ),
        // El identificador de la actividad viaja con la notificación para que al tocarla la
        // app pueda abrir esa entrega en concreto.
        data: { itemId: recordatorio.itemId },
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
