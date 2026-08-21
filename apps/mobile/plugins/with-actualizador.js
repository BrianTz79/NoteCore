const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Añade al manifiesto lo que el actualizador necesita — **solo si está encendido** (FR-052,
 * Fase 17).
 *
 * ## Por qué esto es un plugin condicionado y no un manifiesto de módulo
 *
 * El módulo del widget declara sus receptores en su propio `AndroidManifest.xml`, y Gradle
 * los funde con el de la app. Aquí no se puede hacer eso, y la diferencia es toda la fase:
 *
 * **`REQUEST_INSTALL_PACKAGES` es un permiso que Play Store revisa con lupa.** Una app que lo
 * declara tiene que justificar por qué instala otras aplicaciones, y las tiendas **prohíben**
 * que una app se actualice a sí misma por fuera. Si el permiso viviera en el manifiesto del
 * módulo, viajaría en el APK **siempre**, incluso con el actualizador apagado, y el día que
 * NoteCore suba a la tienda habría que acordarse de quitarlo. Un manifiesto de módulo no se
 * puede condicionar; un plugin sí.
 *
 * Así que la regla es: **con el interruptor apagado, el APK no lleva ni el permiso ni el
 * proveedor**. No es que estén y no se usen: no están. Se comprueba con
 * `aapt dump permissions` sobre el APK compilado.
 *
 * ## El interruptor
 *
 * `EXPO_PUBLIC_UPDATER_ENABLED=true` en el entorno de compilación. Es la misma variable que
 * lee `src/lib/actualizacion.ts` para decidir si la app pregunta siquiera, de modo que el
 * manifiesto y el comportamiento no pueden desincronizarse: los dos salen del mismo valor.
 *
 * Se lee en tiempo de `prebuild`, así que **cambiarla exige volver a hacer prebuild**, no
 * solo recompilar. Es la misma trampa que `EXPO_PUBLIC_API_URL` (ver PROYECTO.md, sección 7).
 *
 * ## Para quitar el actualizador entero
 *
 * Borrar `modules/actualizador/`, `src/lib/actualizacion.ts`, este archivo y su línea en
 * `app.json`. No hay nada más que tocar.
 */

const PERMISO = 'android.permission.REQUEST_INSTALL_PACKAGES';

/**
 * Rutas que el `FileProvider` acepta compartir.
 *
 * **Solo el subdirectorio de descargas del caché externo**, que es donde el módulo guarda el
 * APK. Un `<external-cache-path path="." />` abriría el caché externo entero, y con él
 * cualquier cosa que otra parte de la app haya dejado ahí. El proveedor concede lectura a
 * quien reciba la URI —el instalador de Android—, así que su alcance es exactamente lo que
 * ese otro proceso podrá leer.
 */
const RUTAS_XML = `<?xml version="1.0" encoding="utf-8"?>
<!--
  Generado por plugins/with-actualizador.js — no editar a mano.

  Solo se comparte el directorio donde el actualizador deja el APK descargado.
-->
<paths>
  <external-cache-path name="actualizaciones" path="actualizaciones/" />
</paths>
`;

/** Si el actualizador está encendido para esta compilación. */
function encendido() {
  const valor = process.env.EXPO_PUBLIC_UPDATER_ENABLED;
  return valor === 'true' || valor === '1';
}

module.exports = function withActualizador(config) {
  /*
   * Apagado: no se toca nada.
   *
   * Ni siquiera se quita el permiso con `tools:node="remove"`, como hace
   * `with-sin-permisos-de-almacenamiento.js`: allí hace falta porque el permiso lo aporta una
   * librería de terceros y hay que decírselo al fusionador. Aquí el único que lo declararía
   * es este plugin, así que no declararlo ya es no tenerlo.
   */
  if (!encendido()) return config;

  // 1. El XML que acota qué puede compartir el proveedor.
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const destino = path.join(
        cfg.modRequest.platformProjectRoot,
        'app/src/main/res/xml/actualizador_paths.xml',
      );
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.writeFileSync(destino, RUTAS_XML);
      return cfg;
    },
  ]);

  // 2. El permiso y el proveedor en el manifiesto.
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const paquete = cfg.android?.package;

    if (!paquete) {
      throw new Error(
        'with-actualizador: falta `android.package` en app.json. La autoridad del ' +
          'FileProvider se deriva de él y sin ella el instalador no puede leer el APK.',
      );
    }

    const existentes = manifest['uses-permission'] ?? [];
    const yaEsta = existentes.some((p) => p.$?.['android:name'] === PERMISO);
    if (!yaEsta) {
      manifest['uses-permission'] = [...existentes, { $: { 'android:name': PERMISO } }];
    }

    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);

    /*
     * La autoridad lleva el sufijo `.actualizador` y **debe coincidir** con la que usa
     * `ActualizadorModule.instalar()`.
     *
     * Expo ya registra su propio `FileProvider` para `expo-file-system`. Reutilizarlo
     * obligaría a que sus `paths` incluyeran este directorio, algo que no controlamos y que
     * una actualización del SDK podría cambiar sin avisar. Un proveedor propio con su propio
     * nombre no colisiona con nada.
     */
    const autoridad = `${paquete}.actualizador`;

    app.provider = (app.provider ?? []).filter(
      (p) => p.$?.['android:authorities'] !== autoridad,
    );

    app.provider.push({
      $: {
        'android:name': 'androidx.core.content.FileProvider',
        'android:authorities': autoridad,
        // Nadie de fuera puede pedirle nada: el acceso se concede archivo a archivo con
        // `FLAG_GRANT_READ_URI_PERMISSION` en el intent que se manda al instalador.
        'android:exported': 'false',
        'android:grantUriPermissions': 'true',
      },
      'meta-data': [
        {
          $: {
            'android:name': 'android.support.FILE_PROVIDER_PATHS',
            'android:resource': '@xml/actualizador_paths',
          },
        },
      ],
    });

    return cfg;
  });
};
