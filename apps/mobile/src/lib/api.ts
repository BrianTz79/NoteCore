import * as SecureStore from 'expo-secure-store';
import {
  ApiClient,
  createAttendanceApi,
  createAuthApi,
  createScheduleApi,
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
  client: 'mobile',
  tokens: tokenStore,
  onSessionExpired: () => onSessionExpired?.(),
});

export const authApi = createAuthApi(apiClient);
export const scheduleApi = createScheduleApi(apiClient);
export const attendanceApi = createAttendanceApi(apiClient);
