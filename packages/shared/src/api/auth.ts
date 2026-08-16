/**
 * Llamadas de cuenta y sesión, tipadas.
 *
 * Principio VIII: web y app llaman a estas funciones en lugar de escribir cada una sus
 * rutas y sus tipos de respuesta.
 */

import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from '../schemas/auth.js';
import type { AuthResult, AuthenticatedUser, SessionInfo } from '../types/auth.js';
import type { ApiClient } from './client.js';

export const AUTH_ROUTES = {
  register: '/auth/register',
  login: '/auth/login',
  refresh: '/auth/refresh',
  logout: '/auth/logout',
  me: '/auth/me',
  password: '/auth/password',
  sessions: '/auth/sessions',
} as const;

export function createAuthApi(client: ApiClient) {
  return {
    /** Crea la cuenta y deja la sesión abierta. */
    register(input: RegisterInput): Promise<AuthResult> {
      return client.post<AuthResult>(AUTH_ROUTES.register, input, { skipRefresh: true });
    },

    login(input: LoginInput): Promise<AuthResult> {
      return client.post<AuthResult>(AUTH_ROUTES.login, input, { skipRefresh: true });
    },

    /** Cierra solo la sesión de este cliente; la del otro dispositivo sigue viva (FR-002). */
    logout(): Promise<void> {
      return client.post<void>(AUTH_ROUTES.logout, {}, { skipRefresh: true });
    },

    /** Perfil del usuario autenticado. Devuelve 401 si no hay sesión válida. */
    me(): Promise<AuthenticatedUser> {
      return client.get<AuthenticatedUser>(AUTH_ROUTES.me);
    },

    updateProfile(input: UpdateProfileInput): Promise<AuthenticatedUser> {
      return client.patch<AuthenticatedUser>(AUTH_ROUTES.me, input);
    },

    changePassword(input: ChangePasswordInput): Promise<void> {
      return client.post<void>(AUTH_ROUTES.password, input);
    },

    /** Sesiones abiertas del usuario, para que vea sus dispositivos. */
    sessions(): Promise<readonly SessionInfo[]> {
      return client.get<readonly SessionInfo[]>(AUTH_ROUTES.sessions);
    },

    /** Cierra una sesión concreta por su identificador. */
    revokeSession(sessionId: string): Promise<void> {
      return client.delete<void>(`${AUTH_ROUTES.sessions}/${sessionId}`);
    },
  };
}

export type AuthApi = ReturnType<typeof createAuthApi>;
