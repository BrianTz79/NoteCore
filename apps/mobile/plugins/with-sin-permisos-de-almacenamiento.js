const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Quita del manifiesto los permisos de almacenamiento externo.
 *
 * `expo-file-system` los declara por defecto porque también sirve para leer y escribir en la
 * memoria compartida del teléfono —descargas, la galería, documentos del usuario—. NoteCore
 * no hace nada de eso: el cache y la cola de la Fase 9 viven en el **directorio privado de la
 * app**, al que se accede sin ningún permiso y que Android borra al desinstalarla.
 *
 * Se quitan por lo mismo que la Fase 6 quitó `RECORD_AUDIO`: pedir acceso a las fotos y los
 * documentos de alguien para guardar su horario es desproporcionado, y es exactamente lo que
 * enseña a la gente a denegar permisos por costumbre —y entonces también deniegan los que sí
 * hacen falta—. Además, `READ_EXTERNAL_STORAGE` en Android 13+ ni siquiera se concede ya:
 * quedaría en el manifiesto sin servir para nada, alarmando en la ficha de la tienda a cambio
 * de cero funcionalidad.
 */

const PERMISOS_QUE_SOBRAN = [
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
];

module.exports = function withSinPermisosDeAlmacenamiento(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    /**
     * No basta con borrar la entrada: hay que decírselo al **fusionador** de manifiestos.
     *
     * Los permisos no los escribe el prebuild, los aporta el manifiesto de la propia
     * librería (`expo-file-system`) y Gradle los funde con el de la app al compilar. Una
     * entrada borrada aquí simplemente vuelve a aparecer en ese paso. `tools:node="remove"`
     * es la instrucción que el fusionador entiende: deja la declaración en el manifiesto de
     * origen y la excluye del resultado final.
     */
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const otros = (manifest['uses-permission'] ?? []).filter(
      (permiso) => !PERMISOS_QUE_SOBRAN.includes(permiso.$?.['android:name']),
    );

    manifest['uses-permission'] = [
      ...otros,
      ...PERMISOS_QUE_SOBRAN.map((nombre) => ({
        $: { 'android:name': nombre, 'tools:node': 'remove' },
      })),
    ];

    return cfg;
  });
};
