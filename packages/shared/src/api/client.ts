/**
 * Cliente HTTP de la API, compartido por web y app.
 *
 * Principio VIII: la mecánica de llamar a la API —cabeceras, formato de error, renovación
 * del token caducado— se escribe UNA vez aquí. Web y app solo difieren en dónde guardan
 * los tokens, y eso se inyecta como `TokenStore`.
 */

import type { ApiErrorBody, ApiErrorCode, FieldError } from '../types/api.js';

/** Error lanzado por el cliente ante cualquier respuesta no exitosa. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly fields: readonly FieldError[];

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    fields: readonly FieldError[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.fields = fields;
  }

  /** Mensaje del campo indicado, si el servidor lo señaló. */
  fieldError(field: string): string | undefined {
    return this.fields.find((entry) => entry.field === field)?.message;
  }
}

/**
 * Dónde viven los tokens.
 *
 * En web devuelve siempre `null`: los tokens van en cookies `httpOnly` que el navegador
 * adjunta solo y que JavaScript no puede leer. En la app lee de almacenamiento seguro.
 */
export interface TokenStore {
  getAccessToken(): Promise<string | null> | string | null;
  getRefreshToken(): Promise<string | null> | string | null;
  setTokens(tokens: { accessToken: string; refreshToken?: string }): Promise<void> | void;
  clear(): Promise<void> | void;
}

export interface ApiClientOptions {
  readonly baseUrl: string;
  /** Identifica al cliente en las sesiones del usuario. */
  readonly client: 'web' | 'mobile';
  readonly tokens: TokenStore;
  /**
   * `true` en web: el navegador envía y recibe las cookies de sesión.
   * En React Native no hay cookies, así que se deja en `false`.
   */
  readonly useCookies?: boolean;
  /** Se invoca cuando la sesión ya no puede renovarse y el usuario debe volver a entrar. */
  readonly onSessionExpired?: () => void;
}

export interface RequestOptions {
  readonly method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  readonly body?: unknown;
  /** Rutas de autenticación que no deben intentar renovar el token ante un 401. */
  readonly skipRefresh?: boolean;
}

/** Respuesta de error tal como la envía la API, o `null` si el cuerpo no era el esperado. */
function parseErrorBody(payload: unknown): ApiErrorBody['error'] | null {
  if (typeof payload !== 'object' || payload === null || !('error' in payload)) return null;
  const { error } = payload as { error: unknown };
  if (typeof error !== 'object' || error === null) return null;
  const candidate = error as Partial<ApiErrorBody['error']>;
  if (typeof candidate.code !== 'string' || typeof candidate.message !== 'string') return null;
  return candidate as ApiErrorBody['error'];
}

export class ApiClient {
  private readonly options: ApiClientOptions;

  /**
   * Renovación en curso, si la hay. Varias peticiones que caducan a la vez comparten una
   * sola llamada a `/auth/refresh` en lugar de lanzar una cada una y rotar el token
   * varias veces en paralelo.
   */
  private refreshing: Promise<boolean> | null = null;

  constructor(options: ApiClientOptions) {
    this.options = options;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.send(path, options);

    // 401 con la sesión caducada: se renueva una vez y se reintenta.
    if (response.status === 401 && !options.skipRefresh) {
      const renewed = await this.refreshOnce();
      if (renewed) {
        return this.handle<T>(await this.send(path, options));
      }
      await this.options.tokens.clear();
      this.options.onSessionExpired?.();
    }

    return this.handle<T>(response);
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  post<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', ...(body !== undefined && { body }) });
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PATCH', body });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const headers: Record<string, string> = {
      'x-notecore-client': this.options.client,
    };

    if (options.body !== undefined) {
      headers['content-type'] = 'application/json';
    }

    // En web no hay token que adjuntar: viaja en la cookie `httpOnly`.
    if (!this.options.useCookies) {
      const accessToken = await this.options.tokens.getAccessToken();
      if (accessToken) headers['authorization'] = `Bearer ${accessToken}`;
    }

    try {
      return await fetch(`${this.options.baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers,
        ...(this.options.useCookies ? { credentials: 'include' as const } : {}),
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      });
    } catch {
      // `fetch` solo rechaza por fallo de red, no por códigos de error HTTP.
      throw new ApiError(
        'error_interno',
        'No se pudo conectar con el servidor. Revisa tu conexión.',
        0,
      );
    }
  }

  private async handle<T>(response: Response): Promise<T> {
    if (response.status === 204) return undefined as T;

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const error = parseErrorBody(payload);
      throw new ApiError(
        error?.code ?? 'error_interno',
        error?.message ?? 'Ocurrió un error inesperado.',
        response.status,
        error?.fields ?? [],
      );
    }

    return payload as T;
  }

  /** Renueva el token de acceso. Devuelve `false` si la sesión ya no es recuperable. */
  private refreshOnce(): Promise<boolean> {
    this.refreshing ??= this.doRefresh().finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  private async doRefresh(): Promise<boolean> {
    const refreshToken = this.options.useCookies
      ? null
      : await this.options.tokens.getRefreshToken();

    if (!this.options.useCookies && !refreshToken) return false;

    try {
      const response = await this.send('/auth/refresh', {
        method: 'POST',
        body: refreshToken ? { refreshToken } : {},
        skipRefresh: true,
      });

      if (!response.ok) return false;

      const result = (await response.json()) as { accessToken: string; refreshToken?: string };
      await this.options.tokens.setTokens({
        accessToken: result.accessToken,
        ...(result.refreshToken !== undefined && { refreshToken: result.refreshToken }),
      });
      return true;
    } catch {
      return false;
    }
  }
}
