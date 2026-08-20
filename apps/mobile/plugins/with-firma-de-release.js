const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Firma los APK de release con la clave real del proyecto, no con la de depuración.
 *
 * React Native genera `build.gradle` con `signingConfig signingConfigs.debug` dentro del
 * bloque `release` y un comentario que dice «genera tu propia clave». Si no se hace, el
 * APK de producción sale firmado con una clave que **está publicada en el repositorio de
 * React Native**: Play Store lo rechaza, y cualquiera podría firmar una actualización que
 * el teléfono aceptaría como legítima.
 *
 * Esto vive en un plugin y no editando `android/app/build.gradle` a mano porque ese
 * directorio está en `.gitignore` y `expo prebuild` lo regenera entero: un cambio a mano
 * desaparece en la siguiente compilación limpia, en silencio y justo cuando importa.
 *
 * Las credenciales **no están aquí**. Se leen en tiempo de compilación de
 * `~/.notecore-release/keystore.properties`, fuera del repositorio.
 */

/** Dónde se buscan las credenciales, relativo al home del usuario que compila. */
const RUTA_CREDENCIALES = '.notecore-release/keystore.properties';

const BLOQUE_FIRMA = `
        release {
            def propsFile = new File(System.getProperty('user.home'), '${RUTA_CREDENCIALES}')
            if (propsFile.exists()) {
                def props = new Properties()
                propsFile.withInputStream { props.load(it) }
                storeFile file(props['NOTECORE_STORE_FILE'])
                storePassword props['NOTECORE_STORE_PASSWORD']
                keyAlias props['NOTECORE_KEY_ALIAS']
                keyPassword props['NOTECORE_KEY_PASSWORD']
            } else {
                throw new GradleException(
                    "Faltan las credenciales de firma en ~/${RUTA_CREDENCIALES}.\\n" +
                    "Sin ellas el APK saldría firmado con la clave de depuración, que no es distribuible.")
            }
        }`;

module.exports = function withFirmaDeRelease(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;

    // 1. Añade el `signingConfigs.release` junto al `debug` que ya genera la plantilla.
    const finDeDebug = /(signingConfigs\s*\{[\s\S]*?keyPassword 'android'\s*\n\s*\})/;
    if (!finDeDebug.test(gradle)) {
      throw new Error('with-firma-de-release: no se encontró el bloque signingConfigs.debug');
    }
    if (!gradle.includes('NOTECORE_STORE_FILE')) {
      gradle = gradle.replace(finDeDebug, `$1${BLOQUE_FIRMA}`);
    }

    // 2. Hace que el buildType `release` use esa clave en lugar de la de depuración.
    const releaseUsaDebug = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
    if (releaseUsaDebug.test(gradle)) {
      gradle = gradle.replace(releaseUsaDebug, '$1signingConfig signingConfigs.release');
    }

    cfg.modResults.contents = gradle;
    return cfg;
  });
};
