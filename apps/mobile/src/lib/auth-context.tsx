import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  AuthResult,
  AuthenticatedUser,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from '@notecore/shared';
import { authApi, setSessionExpiredHandler, tokenStore } from './api';

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
      } catch {
        // Sesión no recuperable: se limpia y se pide entrar de nuevo.
        await tokenStore.clear();
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
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (input: UpdateProfileInput) => {
    setUser(await authApi.updateProfile(input));
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
