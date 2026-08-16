'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  AuthenticatedUser,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from '@notecore/shared';
import { ApiError } from '@notecore/shared';
import { authApi } from './api';

/**
 * Estado de sesión de la web.
 *
 * No guarda tokens: viven en cookies `httpOnly` inaccesibles desde JavaScript. Lo único
 * que se mantiene en memoria es el perfil, y se recupera al cargar preguntando a la API.
 */

interface AuthState {
  readonly user: AuthenticatedUser | null;
  /** `true` mientras se comprueba si hay sesión al cargar la página. */
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

  // Al cargar se pregunta a la API si la cookie corresponde a una sesión viva.
  useEffect(() => {
    let cancelled = false;

    authApi
      .me()
      .then((profile) => {
        if (!cancelled) setUser(profile);
      })
      .catch((error: unknown) => {
        // 401 aquí es lo normal: significa "no hay sesión", no un fallo.
        if (!cancelled && !(error instanceof ApiError)) console.error(error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const result = await authApi.login(input);
    setUser(result.user);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const result = await authApi.register(input);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    // Aunque la llamada falle, la sesión se cierra en la interfaz: dejar al usuario dentro
    // porque el servidor no respondió sería peor que cerrarle la vista.
    await authApi.logout().catch(() => undefined);
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
