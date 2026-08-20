import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  AuthResult,
  AuthenticatedUser,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from '@notecore/shared';
import { isNetworkError } from '@notecore/shared';
import { authApi, setSessionExpiredHandler, tokenStore } from './api';
import { offlineStorage } from './offline-storage';
import { limpiarWidget } from './widget';

/**
 * Estado de sesión de la app.
 *
 * A diferencia de la web, aquí sí se guardan los tokens: React Native no tiene cookies, y
 * `expo-secure-store` los cifra con el Keystore del sistema. La sesión persiste entre
 * arranques, que es lo que se espera de una app instalada.
 */

interface AuthState {
  readonly user: AuthenticatedUser | null;
  /** `true` mientras se restaura la sesión guardada al abrir la app. */
  readonly loading: boolean;
  login(input: LoginInput): Promise<void>;
  register(input: RegisterInput): Promise<void>;
  logout(): Promise<void>;
  updateProfile(input: UpdateProfileInput): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Perfil recordado para poder abrir la app sin conexión (FR-048).
 *
 * **No son credenciales**: los tokens siguen en `expo-secure-store`, cifrados con el Keystore.
 * Aquí solo se guarda con quién se pintó la última vez, que es lo que hace falta para saber
 * qué cache y qué cola leer mientras la API no contesta. Cada petición real la sigue
 * autorizando el servidor con el token (Principio III).
 */
const PROFILE_KEY = 'notecore:perfil';

async function rememberProfile(profile: AuthenticatedUser): Promise<void> {
  await offlineStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

async function rememberedProfile(): Promise<AuthenticatedUser | null> {
  const raw = await offlineStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthenticatedUser;
  } catch {
    return null;
  }
}

async function forgetProfile(): Promise<void> {
  await offlineStorage.removeItem(PROFILE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  /** Guarda los tokens recibidos y deja al usuario dentro. */
  const acceptSession = useCallback(async (result: AuthResult) => {
    await tokenStore.setTokens({
      accessToken: result.accessToken,
      ...(result.refreshToken !== undefined && { refreshToken: result.refreshToken }),
    });
    setUser(result.user);
    await rememberProfile(result.user);
  }, []);

  // Al abrir la app se intenta reutilizar la sesión guardada.
  useEffect(() => {
    let cancelled = false;

    // Si el token caducó y no pudo renovarse, se saca al usuario a la pantalla de entrada.
    setSessionExpiredHandler(() => setUser(null));

    void (async () => {
      const token = await tokenStore.getAccessToken();
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        // El cliente renueva por su cuenta si el access token ya caducó.
        const profile = await authApi.me();
        if (!cancelled) setUser(profile);
        await rememberProfile(profile);
      } catch (error) {
        /**
         * **Sin red no se cierra la sesión** (FR-048).
         *
         * `status` 0 es "la petición no salió del teléfono", no "la sesión no vale": el
         * token sigue guardado y volverá a servir en cuanto haya conexión. Limpiarlo aquí
         * echaba al usuario a la pantalla de entrada justo al abrir la app sin señal —el
         * caso que esta fase existe para resolver—, y de paso le escondía los cambios que
         * tuviera en la cola, porque la cola es de su cuenta.
         */
        if (isNetworkError(error)) {
          const recordado = await rememberedProfile();
          if (recordado && !cancelled) setUser(recordado);
        } else {
          // Sesión no recuperable: se limpia y se pide entrar de nuevo.
          await tokenStore.clear();
          await forgetProfile();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (input: LoginInput) => acceptSession(await authApi.login(input)),
    [acceptSession],
  );

  const register = useCallback(
    async (input: RegisterInput) => acceptSession(await authApi.register(input)),
    [acceptSession],
  );

  const logout = useCallback(async () => {
    // Se avisa al servidor para que borre la sesión, pero el cierre local ocurre igual:
    // sin conexión, el usuario debe poder salir de su cuenta en el teléfono.
    await authApi.logout().catch(() => undefined);
    await tokenStore.clear();
    // El perfil recordado se olvida aquí: si no, al abrir sin conexión se volvería a entrar
    // con la cuenta que se acaba de cerrar.
    await forgetProfile();
    // El widget de la pantalla de inicio también (FR-051): el horario de quien se fue no
    // puede quedarse a la vista de cualquiera que mire el teléfono. Es el Principio III
    // fuera de la app, que es justo donde se olvida.
    await limpiarWidget();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (input: UpdateProfileInput) => {
    const actualizado = await authApi.updateProfile(input);
    setUser(actualizado);
    await rememberProfile(actualizado);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, loading, login, register, logout, updateProfile }),
    [user, loading, login, register, logout, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}
