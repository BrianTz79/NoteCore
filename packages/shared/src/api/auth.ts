/**
 * Llamadas de cuenta y sesión, tipadas.
 *
 * Principio VIII: web y app llaman a estas funciones en lugar de escribir cada una sus
 * rutas y sus tipos de respuesta.
 */

import type {
  ChangePasswordInput,
  DeleteAccountInput,
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
  /**
   * Borrado de cuenta (Fase 20).
   *
   * `DELETE /auth/me` y no `POST /auth/delete`: el recurso es la propia cuenta y el verbo ya
   * dice qué se le hace. Quién se borra sale del token, nunca de la ruta ni del cuerpo — con
   * un identificador en la URL, esta sería la ruta que hay que probar con el `id` de otro.
   */
  deleteAccount: '/auth/me',
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

    /**
     * Borra la cuenta y todos sus datos, sin vuelta atrás (Fase 20).
     *
     * Al volver, la sesión de este cliente ya no existe —ni ninguna otra de la cuenta—, así
     * que quien llame debe llevar a la persona fuera en lugar de intentar refrescar nada.
     */
    deleteAccount(input: DeleteAccountInput): Promise<void> {
      return client.delete<void>(AUTH_ROUTES.deleteAccount, input);
    },
  };
}

export type AuthApi = ReturnType<typeof createAuthApi>;
