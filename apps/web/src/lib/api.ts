import {
  ApiClient,
  createAgendaApi,
  createAttendanceApi,
  createAuthApi,
  createScheduleApi,
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

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3101';

export const apiClient = new ApiClient({
  baseUrl,
  client: 'web',
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
