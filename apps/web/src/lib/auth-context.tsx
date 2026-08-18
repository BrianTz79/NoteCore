'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  AuthenticatedUser,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from '@notecore/shared';
import { ApiError, isNetworkError } from '@notecore/shared';
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

/**
 * Perfil recordado para poder abrir la aplicación sin conexión (FR-048).
 *
 * **No son credenciales**: la sesión sigue siendo la cookie `httpOnly`, que este código no
 * puede leer ni falsificar. Aquí solo se guarda con quién se pintó la pantalla la última vez,
 * que es lo que hace falta para saber qué cache leer mientras la API no contesta. Quien
 * manipulara esto vería su propia pantalla con un nombre inventado y ningún dato: cada
 * petición real la sigue autorizando el servidor (Principio III).
 */
const PROFILE_KEY = 'notecore:perfil';

function rememberProfile(profile: AuthenticatedUser): void {
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Sin almacenamiento se pierde solo la consulta sin conexión, no la sesión.
  }
}

function rememberedProfile(): AuthenticatedUser | null {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as AuthenticatedUser) : null;
  } catch {
    return null;
  }
}

function forgetProfile(): void {
  try {
    window.localStorage.removeItem(PROFILE_KEY);
  } catch {
    // Nada que hacer.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Al cargar se pregunta a la API si la cookie corresponde a una sesión viva.
  useEffect(() => {
    let cancelled = false;

    authApi
      .me()
      .then((profile) => {
        if (cancelled) return;
        setUser(profile);
        // Se recuerda quién es para poder abrir sin conexión (FR-048). No son credenciales
        // —la sesión sigue viviendo en la cookie `httpOnly`—, solo el nombre y el
        // identificador con los que pintar la pantalla y encontrar su cache.
        rememberProfile(profile);
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        /**
         * **Sin red no se cierra la sesión.**
         *
         * `status` 0 es "la petición no salió del dispositivo", no "no hay sesión": la
         * cookie sigue ahí y volverá a valer en cuanto haya conexión. Tratarlo como un 401
         * mandaba al usuario a la pantalla de entrada justo cuando abría la aplicación sin
         * señal —y entonces no podía consultar nada de lo guardado, que es precisamente lo
         * que FR-048 promete—.
         *
         * Un 401 sí es "no hay sesión", y ahí el perfil recordado se descarta: dejarlo
         * enseñaría el nombre de alguien que ya no está dentro.
         */
        if (isNetworkError(error)) {
          const recordado = rememberedProfile();
          if (recordado) setUser(recordado);
          return;
        }

        forgetProfile();

        // 401 aquí es lo normal: significa "no hay sesión", no un fallo.
        if (!(error instanceof ApiError)) console.error(error);
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
    rememberProfile(result.user);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const result = await authApi.register(input);
    setUser(result.user);
    rememberProfile(result.user);
  }, []);

  const logout = useCallback(async () => {
    // Aunque la llamada falle, la sesión se cierra en la interfaz: dejar al usuario dentro
    // porque el servidor no respondió sería peor que cerrarle la vista.
    await authApi.logout().catch(() => undefined);
    // El perfil recordado se olvida aquí: si no, al recargar sin conexión se volvería a
    // entrar con la cuenta que se acaba de cerrar.
    forgetProfile();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (input: UpdateProfileInput) => {
    const actualizado = await authApi.updateProfile(input);
    setUser(actualizado);
    rememberProfile(actualizado);
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
