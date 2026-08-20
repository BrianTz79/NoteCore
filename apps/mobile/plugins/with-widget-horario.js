const { withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Colores del widget de pantalla principal, derivados de los tokens (FR-051, Fase 11).
 *
 * ## Qué hace este plugin, y qué NO hace
 *
 * El widget **no lo genera este archivo**: vive como módulo local de Expo en
 * `apps/mobile/modules/widget-horario/`, versionado en git, con su Kotlin, sus recursos y
 * su manifiesto. El autolinking lo descubre por su `expo-module.config.json`, lo compila
 * como biblioteca de Android y registra `WidgetHorarioModule` en el runtime.
 *
 * Se intentó primero generarlo entero desde aquí, escribiendo el Kotlin dentro de
 * `android/app` durante el prebuild, y **no funciona**: los módulos de Expo se registran a
 * partir de una clase `ExpoModulesPackageList` que el autolinking genera dentro de
 * `node_modules/expo/android/build`, fuera del proyecto. Un módulo que no pasa por el
 * autolinking no aparece en esa lista, y `requireNativeModule` no lo encuentra por mucho
 * que sus clases estén en el APK —que lo estaban—. La estructura de módulo local es el
 * camino que la librería sí reconoce.
 *
 * Lo único que queda aquí es **la copia de los colores**, y sigue siendo un plugin porque
 * tiene que regenerarse: un `RemoteViews` solo entiende colores compilados en
 * `res/values/`, así que no puede leer `tokens.ts`. Derivar el XML del módulo compartido en
 * cada prebuild es lo que impide que esa copia se quede atrás en silencio.
 */

/** Dónde vive el módulo local del widget, relativo a la raíz del proyecto Expo. */
const MODULO = 'modules/widget-horario';

/**
 * Los colores del sistema, leídos de `packages/shared/src/design/tokens.ts`.
 *
 * Se extraen del texto y no con un `import` porque este archivo corre durante el prebuild,
 * donde `shared` puede no estar compilado todavía.
 */
function leerTokens(projectRoot) {
  const fuente = path.join(projectRoot, '../../packages/shared/src/design/tokens.ts');
  const texto = fs.readFileSync(fuente, 'utf8');

  const bloque = /export const COLOR = \{([\s\S]*?)\n\} as const;/.exec(texto);
  if (!bloque) {
    throw new Error(
      'No se encontró el bloque COLOR en tokens.ts. El widget no puede generar sus colores.',
    );
  }

  const colores = {};
  for (const linea of bloque[1].split('\n')) {
    const match = /^\s*([a-zA-Z0-9]+):\s*'(#[0-9a-fA-F]{6})'/.exec(linea);
    if (match) colores[match[1]] = match[2];
  }

  if (Object.keys(colores).length === 0) {
    throw new Error('El bloque COLOR de tokens.ts no tiene colores reconocibles.');
  }

  return colores;
}

function colorsXml(tokens) {
  const filas = Object.entries(tokens)
    .map(([nombre, valor]) => `  <color name="nc_${nombre}">${valor}</color>`)
    .join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<!--
  Generado por plugins/with-widget-horario.js a partir de
  packages/shared/src/design/tokens.ts — NO EDITAR A MANO.

  Un RemoteViews solo entiende colores compilados en recursos: no puede leer los tokens
  compartidos. Esta copia se regenera en cada prebuild para que no pueda quedarse atrás,
  que es la única forma de que la única duplicación del sistema de diseño no se convierta
  en una divergencia.
-->
<resources>
${filas}
</resources>
`;
}

module.exports = function withWidgetHorario(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const destino = path.join(
        cfg.modRequest.projectRoot,
        MODULO,
        'android/src/main/res/values/notecore_tokens.xml',
      );

      if (!fs.existsSync(path.dirname(destino))) {
        throw new Error(
          `No se encontró el módulo del widget en ${MODULO}. Sin él, la app compila pero ` +
            'el widget se queda sin datos.',
        );
      }

      fs.writeFileSync(destino, colorsXml(leerTokens(cfg.modRequest.projectRoot)));
      return cfg;
    },
  ]);
};
