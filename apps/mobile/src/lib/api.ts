import * as SecureStore from 'expo-secure-store';
import appConfig from '../../app.json';
import {
  ApiClient,
  createAgendaApi,
  createAttendanceApi,
  createAuthApi,
  createCalendarApi,
  createMessagingApi,
  createModerationApi,
  createScheduleApi,
  createSemesterApi,
  createShareApi,
  createSocialApi,
  createUpdatesApi,
  type TokenStore,
} from '@notecore/shared';

/**
 * Cliente de API de la app.
 *
 * Principio VIII: la mecánica está en `@notecore/shared`; aquí solo se configura para
 * React Native, donde no hay cookies y los tokens se guardan en almacenamiento seguro
 * (Keystore de Android), no en `AsyncStorage`, que cualquier app con root podría leer.
 */

const ACCESS_KEY = 'notecore_access_token';
const REFRESH_KEY = 'notecore_refresh_token';

/**
 * URL de la API.
 *
 * `EXPO_PUBLIC_API_URL` se incrusta en el bundle al compilar. En un dispositivo físico hay
 * que poner ahí la IP del PC en la red local: `localhost` apuntaría al propio teléfono.
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3101';

/**
 * Qué versión de la app es (Fase 25).
 *
 * Viaja en la cabecera `x-notecore-version` de cada petición y el panel la agrega para saber
 * cuánta gente se quedó en una versión vieja — que hoy no tiene forma de saberse.
 *
 * Sale del `versionCode` de `app.json`, leído en la compilación: Metro resuelve el import de
 * JSON y el valor queda dentro del bundle. Se eligió sobre las dos alternativas que había:
 *
 * - **El módulo nativo del actualizador** (`versionInstalada()`, Fase 17) lee el
 *   `versionCode` real del paquete instalado, que es más fiel — pero la **Fase 24 lo apaga**
 *   para publicar en Play Store, y entonces esta cifra desaparecería justo cuando empieza a
 *   importar. Depender de algo que está previsto quitar es escribir una avería con fecha.
 * - **Una variable `EXPO_PUBLIC_*`** obligaría a acordarse de pasarla en cada compilación, y
 *   olvidarla no rompe nada visible: simplemente se registra la versión anterior para siempre.
 *   `app.json` es donde el `versionCode` ya se sube al publicar, así que no hay un segundo
 *   sitio que mantener sincronizado.
 */
const APP_VERSION = String(appConfig.expo.android.versionCode);

export const tokenStore: TokenStore = {
  getAccessToken: () => SecureStore.getItemAsync(ACCESS_KEY),
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_KEY),

  async setTokens({ accessToken, refreshToken }) {
    await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
    // La renovación no siempre devuelve refresh token nuevo; solo se sobrescribe si viene.
    if (refreshToken) await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
  },

  async clear() {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};

/** Se rellena desde el proveedor de sesión para reaccionar a una sesión caducada. */
let onSessionExpired: (() => void) | undefined;

export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

export const apiClient = new ApiClient({
  baseUrl: BASE_URL,
  version: APP_VERSION,
  client: 'mobile',
  tokens: tokenStore,
  onSessionExpired: () => onSessionExpired?.(),
});

export const authApi = createAuthApi(apiClient);
export const scheduleApi = createScheduleApi(apiClient);
export const attendanceApi = createAttendanceApi(apiClient);
export const agendaApi = createAgendaApi(apiClient);
export const calendarApi = createCalendarApi(apiClient);
export const shareApi = createShareApi(apiClient);
export const semesterApi = createSemesterApi(apiClient);
export const socialApi = createSocialApi(apiClient);
export const messagingApi = createMessagingApi(apiClient);

/**
 * Reportes de contenido (Fase 21).
 *
 * La app solo usa `report`: leer y revisar los reportes es cosa del panel, que vive solo en
 * la web (ver `types/panel.ts`). Se crea la API entera igualmente porque el objeto es uno
 * —quien decide qué puede cada cuenta es el servidor— y recortarlo aquí sería inventar una
 * segunda definición de lo mismo.
 */
export const moderationApi = createModerationApi(apiClient);
/**
 * Publicación de versiones de la app (Fase 17).
 *
 * Se crea siempre, aunque el actualizador esté apagado: quien decide si se llama es
 * `src/lib/actualizacion.ts`, y con el interruptor en `false` esta constante existe pero
 * nadie la usa. Condicionarla aquí obligaría a que su tipo fuera opcional y a comprobarlo
 * en cada llamada, para ahorrar un objeto.
 */
export const updatesApi = createUpdatesApi(apiClient);

/**
 * URL base de la API, para el canal en vivo de la mensajería (Fase 10).
 *
 * Se exporta porque `LiveChannel` la necesita para derivar su `ws://`. En un dispositivo
 * físico eso significa la IP del PC, exactamente igual que para las peticiones normales:
 * derivarla de aquí en vez de componerla aparte evita que el canal apunte a un sitio y las
 * peticiones a otro.
 */
export const apiBaseUrl = BASE_URL;
