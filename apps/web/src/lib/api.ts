import {
  ApiClient,
  createAgendaApi,
  createAttendanceApi,
  createAuthApi,
  createCalendarApi,
  createTipsApi,
  createMessagingApi,
  createModerationApi,
  createPanelApi,
  createScheduleApi,
  createSemesterApi,
  createShareApi,
  createSocialApi,
  createUpdatesApi,
} from '@notecore/shared';

/**
 * Cliente de API de la web.
 *
 * Principio VIII: la mecánica está en `@notecore/shared`; aquí solo se configura para web.
 *
 * El `TokenStore` no guarda nada: en web los tokens viven en cookies `httpOnly` que el
 * navegador adjunta solo y que este código no puede leer —esa es justamente la protección
 * contra XSS—. Por eso `useCookies` va en `true` y los métodos devuelven `null`.
 */

/**
 * Base de la API para el navegador.
 *
 * En producción es una ruta **relativa** (`/api`), servida por el rewrite de
 * `next.config.mjs` desde el mismo origen que la web. Tiene que ser el mismo origen porque
 * la sesión son cookies `httpOnly` con `sameSite: lax`, que el navegador no manda en
 * peticiones cruzadas.
 */
const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3101';

/**
 * La misma base, pero siempre absoluta.
 *
 * `LiveChannel` la convierte en `wss://` cambiando el esquema, y en una ruta relativa no
 * hay esquema que cambiar: `new WebSocket('/api/...')` lanza. Se resuelve contra el origen
 * de la página, que es exactamente a donde apunta el rewrite.
 *
 * Se calcula en el navegador; durante el render en servidor no hay `location`, y tampoco
 * hace falta: el canal solo se abre en el cliente.
 */
function baseUrlAbsoluta(): string {
  if (baseUrl.startsWith('http')) return baseUrl;
  if (typeof window === 'undefined') return baseUrl;
  return new URL(baseUrl, window.location.origin).toString().replace(/\/+$/, '');
}

export const apiClient = new ApiClient({
  baseUrl,
  client: 'web',
  /**
   * Qué versión de la web es (Fase 25).
   *
   * Sale de `NEXT_PUBLIC_APP_VERSION`, que el `Dockerfile` fija en la compilación. Sin ella
   * queda `dev`, que es lo correcto en la máquina de desarrollo: las sesiones abiertas
   * mientras se programa no deben contarse como una versión publicada.
   */
  version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev',
  useCookies: true,
  tokens: {
    getAccessToken: () => null,
    getRefreshToken: () => null,
    setTokens: () => {},
    clear: () => {},
  },
});

export const authApi = createAuthApi(apiClient);
export const scheduleApi = createScheduleApi(apiClient);
export const attendanceApi = createAttendanceApi(apiClient);
export const agendaApi = createAgendaApi(apiClient);
export const calendarApi = createCalendarApi(apiClient);
/** Contexto de los consejos del inicio (Fase 29). */
export const tipsApi = createTipsApi(apiClient);
export const shareApi = createShareApi(apiClient);
export const semesterApi = createSemesterApi(apiClient);
export const socialApi = createSocialApi(apiClient);
export const messagingApi = createMessagingApi(apiClient);
/**
 * Publicación de versiones de la app Android (Fase 17).
 *
 * La web no instala nada —no puede—, pero es **de donde sale el APK la primera vez**: quien
 * todavía no tiene la app entra aquí desde el navegador del teléfono y la descarga. El
 * actualizador de dentro de la app solo cubre a quien ya la tiene.
 */
export const updatesApi = createUpdatesApi(apiClient);

/**
 * El panel de operación (Fase 25).
 *
 * Solo la web lo tiene, y solo responde a la cuenta marcada como administradora: a cualquier
 * otra, la ruta contesta 404. Se declara aquí como cualquier otra API porque desde el punto
 * de vista del cliente lo es — quien decide si hay panel es el servidor.
 */
export const panelApi = createPanelApi(apiClient);

/**
 * Reportes de contenido (Fase 21).
 *
 * Sus dos mitades tienen públicos distintos: `report` la usa cualquiera desde el muro o un
 * hilo, y `list`/`review` solo la cuenta que opera el servicio, desde `/panel`. Es una sola
 * API porque el servidor es quien decide quién puede qué — a los demás, esas dos rutas les
 * responden 404.
 */
export const moderationApi = createModerationApi(apiClient);

/**
 * URL base de la API, para el canal en vivo de la mensajería (Fase 10).
 *
 * Se exporta porque `LiveChannel` la necesita para derivar su `ws://`, y componerla otra vez
 * en la pantalla dejaría dos sitios donde cambiar el entorno de la API.
 */
/**
 * Se exporta como **función**, no como constante: una constante de módulo se evalúa al
 * importar, y en Next eso ocurre también durante el render en servidor, donde `window` no
 * existe y el valor quedaría congelado en la ruta relativa.
 */
export const apiBaseUrl = baseUrlAbsoluta;
