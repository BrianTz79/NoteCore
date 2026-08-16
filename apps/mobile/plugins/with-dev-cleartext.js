const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Permite HTTP en claro SOLO hacia direcciones de desarrollo local.
 *
 * Android bloquea el tráfico sin cifrar desde Android 9, y con razón. Pero la API de
 * desarrollo corre en `http://localhost:3101` (o en la IP del PC en la red local), sin
 * certificado, así que sin esta excepción la app no puede hablar con ella al probarla.
 *
 * La excepción se limita a los dominios de desarrollo: en producción, `notecore.ourocore.net`
 * va por HTTPS a través del túnel de Cloudflare y sigue sujeto a la regla general.
 */

/** Direcciones que apuntan a una máquina de desarrollo, nunca a producción. */
const DOMINIOS_DE_DESARROLLO = [
  'localhost',
  '127.0.0.1',
  // Puerta del host desde el emulador de Android.
  '10.0.2.2',
];

const CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<!--
  Generado por plugins/with-dev-cleartext.js — no editar a mano.

  Solo las direcciones de desarrollo admiten HTTP sin cifrar. El resto del tráfico,
  incluida la API de producción, exige HTTPS.
-->
<network-security-config>
  <domain-config cleartextTrafficPermitted="true">
${DOMINIOS_DE_DESARROLLO.map((d) => `    <domain includeSubdomains="false">${d}</domain>`).join('\n')}
  </domain-config>
  <base-config cleartextTrafficPermitted="false" />
</network-security-config>
`;

module.exports = function withDevCleartext(config) {
  // 1. Escribe el XML de configuración de red.
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const destino = path.join(
        cfg.modRequest.platformProjectRoot,
        'app/src/main/res/xml/network_security_config.xml',
      );
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.writeFileSync(destino, CONFIG_XML);
      return cfg;
    },
  ]);

  // 2. Lo enlaza desde el manifiesto.
  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return cfg;
  });
};
