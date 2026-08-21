import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { UPDATE_ROUTES, type LatestReleaseResponse } from '@notecore/shared';
import { config } from '../config.js';
import { latestAndroidRelease, openPublishedApk } from '../services/releases.js';

/**
 * Rutas de la actualización de la app fuera de la tienda (FR-052, Fase 17).
 *
 * ## Estas dos rutas no piden sesión, y es deliberado
 *
 * Todo lo demás en esta API exige token (Principio III). Aquí no, por dos motivos:
 *
 * 1. **Quien más necesita actualizar puede no poder entrar.** Si una versión vieja tiene rota
 *    la pantalla de entrar —que es exactamente lo que arregló la Fase 12—, exigir sesión para
 *    enterarse de que hay arreglo cierra el círculo y deja al usuario sin salida
 * 2. **No hay nada que aislar.** Un número de versión, una suma de verificación y un APK
 *    firmado son públicos por definición: el mismo binario que se instala en el teléfono de
 *    cualquiera. No hay dato de ningún usuario en esta respuesta
 *
 * ## Todo el módulo se apaga con `UPDATER_ENABLED`
 *
 * Con el interruptor apagado, `latestAndroidRelease` devuelve `null` y la ruta responde
 * `disponible: false`. Las rutas siguen registradas —quitarlas del enrutador según una
 * variable haría que una respuesta 404 significara dos cosas distintas—, pero no anuncian ni
 * entregan nada. Ver el porqué del interruptor en `config.ts`.
 */

/**
 * De dónde cuelga el enlace de descarga.
 *
 * `PUBLIC_API_URL` manda cuando está definida, que es como debe estar en producción: la app
 * habla con `notecore-api.ourocore.net` y el enlace tiene que apuntar ahí, no al nombre
 * interno del contenedor.
 *
 * Sin ella se compone con el host de la petición, que es lo correcto en desarrollo —donde la
 * IP del PC en la red local cambia— y evita tener que configurar una variable para probar.
 */
function baseUrlDe(request: FastifyRequest): string {
  if (config.publicApiUrl !== null) return config.publicApiUrl.replace(/\/$/, '');
  const protocolo = request.protocol;
  const host = request.headers.host ?? `localhost:${config.port}`;
  return `${protocolo}://${host}`;
}

export const releaseRoutes: FastifyPluginAsync = async (app) => {
  /**
   * La última versión publicada para Android (Fase 17).
   *
   * Responde 200 siempre, incluso apagada o sin nada publicado: para el cliente son
   * situaciones normales —«no hay nada que hacer»—, no errores, y devolver 404 las
   * convertiría en un fallo que la app tendría que distinguir de un problema de red.
   */
  app.get(UPDATE_ROUTES.latestAndroid, async (request, reply) => {
    const { release, motivo } = await latestAndroidRelease(baseUrlDe(request));

    /*
     * El motivo se registra, salvo el de estar apagado.
     *
     * Un actualizador encendido que no anuncia nada es casi siempre un manifiesto mal escrito
     * o un APK que no se copió, y desde fuera esos dos casos se ven exactamente igual que
     * «todavía no se ha publicado nada». Sin esta línea, diagnosticarlo sería adivinar.
     * Apagado no se registra: sería una línea por cada arranque de app, diciendo que la
     * configuración es la que se puso a propósito.
     */
    if (motivo !== null && motivo !== 'apagado') {
      request.log.info({ motivo }, 'Actualizador sin versión que anunciar');
    }

    const body: LatestReleaseResponse = {
      disponible: config.updaterEnabled,
      release,
    };

    /*
     * Sin caché.
     *
     * Entre la API y el teléfono hay un túnel de Cloudflare, y una respuesta JSON cacheada
     * ahí dejaría a los usuarios sin enterarse de la versión nueva hasta que expirara. Es el
     * único sitio del producto donde el dato **es** la novedad.
     */
    return reply.header('cache-control', 'no-store').send(body);
  });

  /**
   * El APK publicado.
   *
   * Lo pide el gestor de descargas de Android desde la app, y también el navegador desde la
   * página de descarga de la web. Se transmite en flujo y no se lee entero en memoria: son
   * decenas de megabytes, y cargarlos por cada descarga es la forma más fácil de tumbar un
   * proceso de Node que además está sirviendo el resto de la API.
   */
  app.get('/releases/android/download', async (_request, reply) => {
    const apk = await openPublishedApk();

    if (apk === null) {
      return reply.code(404).send({
        error: {
          code: 'no_encontrado',
          message: 'No hay ninguna versión publicada para descargar.',
        },
      });
    }

    return reply
      .header('content-type', 'application/vnd.android.package-archive')
      .header('content-length', apk.sizeBytes)
      // `attachment` para que el navegador lo descargue en lugar de intentar mostrarlo, y con
      // el nombre real del archivo: un APK guardado como «download» no dice qué es ni qué
      // versión trae cuando aparece en la carpeta de descargas semanas después.
      .header('content-disposition', `attachment; filename="${apk.filename}"`)
      .send(apk.stream);
  });
};
