const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Deja el manifiesto con **exactamente** los permisos que NoteCore usa (Fase 22).
 *
 * Sustituye a `with-sin-permisos-de-almacenamiento.js`, que hacía lo mismo para dos permisos
 * concretos. Se generalizó porque la medición del 2026-08-21 encontró que sobraban más, y
 * tener dos plugins tocando la misma lista es cómo se llega a que uno quite lo que el otro
 * pone.
 *
 * ## Por qué esto importa, y no es limpieza cosmética
 *
 * Los permisos del manifiesto **salen escritos en la ficha de Play Store**, y el usuario los
 * lee antes de instalar. Un permiso que no se usa no cuesta memoria ni batería: cuesta
 * instalaciones, y atrae al revisor. `SYSTEM_ALERT_WINDOW` —dibujar encima de otras apps— es
 * de los que más escrutinio reciben, y estaba en el APK sin que una sola línea del proyecto
 * lo pidiera.
 *
 * ## De dónde salía cada uno
 *
 * Medido sobre el reporte del fusionador de manifiestos
 * (`android/app/build/outputs/logs/manifest-merger-release-report.txt`), que dice el origen
 * de cada entrada. No los metía el proyecto:
 *
 * - `SYSTEM_ALERT_WINDOW` y `VIBRATE` los escribe la **plantilla base de Expo** en el
 *   prebuild — vienen marcados en su propio comentario como «OPTIONAL PERMISSIONS, REMOVE
 *   WHATEVER YOU DO NOT NEED», así que quitarlos es lo que la plantilla espera de quien la
 *   usa, no una desviación
 * - `READ_EXTERNAL_STORAGE` y `WRITE_EXTERNAL_STORAGE`, de la misma plantilla y de
 *   `expo-file-system`. Obsoletos en Android 13+: ni siquiera se conceden ya
 * - Los de **notificaciones push** (`c2dm.RECEIVE`, `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED`,
 *   `ACCESS_NETWORK_STATE`) y la **veintena de badges de lanzadores** (`ShortcutBadger`) los
 *   arrastra `expo-notifications`, que trae Firebase entero. NoteCore **no manda push**: sus
 *   recordatorios (Fase 5) son notificaciones locales programadas en el propio teléfono
 *
 * ## Por qué `tools:node="remove"` y no borrar la entrada
 *
 * Porque el permiso lo aporta el manifiesto de la librería, y Gradle lo funde con el de la
 * app al compilar: una entrada borrada aquí reaparece en ese paso. `remove` es la
 * instrucción que el fusionador entiende — deja la declaración en el origen y la excluye del
 * resultado. Se comprueba en el reporte del fusionador, que marca la entrada como REJECTED.
 *
 * ## Lo que se deja a propósito
 *
 * - `USE_BIOMETRIC` y `USE_FINGERPRINT`, de `androidx.biometric` vía `expo-secure-store`.
 *   Hoy no se disparan —los tokens se guardan sin `requireAuthentication`—, pero es la
 *   librería que cifra las credenciales de la sesión y no se toca su manifiesto a ciegas por
 *   dos permisos que no piden nada al usuario ni salen destacados en la ficha
 * - `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`, que se autoconcede la propia app: no es un
 *   permiso del sistema, es cómo AndroidX protege sus receptores internos
 * - `REQUEST_INSTALL_PACKAGES`, que pone `with-actualizador.js` **solo si el actualizador
 *   está encendido**, y que la Fase 24 apagará del todo
 *
 * ## Nunca editar `android/` a mano
 *
 * `expo prebuild` regenera esa carpeta entera y el arreglo desaparecería en silencio. Es la
 * misma trampa que documenta PROYECTO.md sobre la firma de release.
 */

/** Los que NoteCore declara **a propósito**, con lo que cada uno hace. */
const PERMISOS_QUE_SE_USAN = [
  /** Toda la app: no hay nada que funcione sin la API. Android lo da sin preguntar. */
  'android.permission.INTERNET',
  /** Los recordatorios de la Fase 5. Es el único que se le pide al usuario en una ventana. */
  'android.permission.POST_NOTIFICATIONS',
  /**
   * Leer los QR de compartición (Fase 6).
   *
   * Se declara aquí explícitamente aunque `expo-camera` ya lo aporte: un permiso que se usa
   * de verdad tiene que estar escrito en el proyecto, no llegar de rebote. Así, quien lea
   * este archivo ve la lista completa de lo que la app pide y por qué.
   *
   * La app **no guarda imágenes**: la cámara se abre, se decodifica el código y se cierra.
   */
  'android.permission.CAMERA',
];

/** Los que sobran, con quién los metía. */
const PERMISOS_QUE_SOBRAN = [
  // Plantilla base de Expo, marcados por ella misma como opcionales.
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.VIBRATE',
  // Obsoletos en Android 13+; el caché y la cola de la Fase 9 viven en el directorio
  // privado de la app, al que se accede sin permiso alguno.
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  // Firebase Cloud Messaging, vía expo-notifications. NoteCore no manda push.
  'com.google.android.c2dm.permission.RECEIVE',
  'android.permission.WAKE_LOCK',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.ACCESS_NETWORK_STATE',
  'com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE',
  // ShortcutBadger: el número en el icono del lanzador. Un permiso por fabricante, y
  // NoteCore no pone ningún badge.
  'android.permission.READ_APP_BADGE',
  'com.sec.android.provider.badge.permission.READ',
  'com.sec.android.provider.badge.permission.WRITE',
  'com.htc.launcher.permission.READ_SETTINGS',
  'com.htc.launcher.permission.UPDATE_SHORTCUT',
  'com.sonyericsson.home.permission.BROADCAST_BADGE',
  'com.sonymobile.home.permission.PROVIDER_INSERT_BADGE',
  'com.anddoes.launcher.permission.UPDATE_COUNT',
  'com.majeur.launcher.permission.UPDATE_BADGE',
  'com.huawei.android.launcher.permission.CHANGE_BADGE',
  'com.huawei.android.launcher.permission.READ_SETTINGS',
  'com.huawei.android.launcher.permission.WRITE_SETTINGS',
  'com.oppo.launcher.permission.READ_SETTINGS',
  'com.oppo.launcher.permission.WRITE_SETTINGS',
  'me.everything.badger.permission.BADGE_COUNT_READ',
  'me.everything.badger.permission.BADGE_COUNT_WRITE',
];

module.exports = function withPermisosDeclarados(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // `tools:` es el espacio de nombres que entiende el fusionador. Sin declararlo, el
    // atributo `tools:node` sería texto sin significado y los permisos volverían.
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const gestionados = new Set([...PERMISOS_QUE_SE_USAN, ...PERMISOS_QUE_SOBRAN]);

    /*
     * Lo que ya hubiera y no esté en ninguna de las dos listas se conserva.
     *
     * En particular `REQUEST_INSTALL_PACKAGES`, que pone `with-actualizador.js`: este plugin
     * corre antes que aquel, pero filtrar por lista blanca lo borraría igualmente el día que
     * cambie el orden en `app.json`. Se conserva lo desconocido a propósito — un permiso
     * nuevo que aparezca en una actualización de dependencias saldrá en la verificación de
     * `aapt2 dump badging`, que es donde debe descubrirse, en vez de desaparecer sin que
     * nadie se entere de que estaba.
     */
    const ajenos = (manifest['uses-permission'] ?? []).filter(
      (permiso) => !gestionados.has(permiso.$?.['android:name']),
    );

    manifest['uses-permission'] = [
      ...ajenos,
      ...PERMISOS_QUE_SE_USAN.map((nombre) => ({ $: { 'android:name': nombre } })),
      ...PERMISOS_QUE_SOBRAN.map((nombre) => ({
        $: { 'android:name': nombre, 'tools:node': 'remove' },
      })),
    ];

    return cfg;
  });
};
