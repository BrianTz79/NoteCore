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
 * Si un error es un fallo de red y no una respuesta del servidor (FR-048, FR-049).
 *
 * **No se usa `instanceof`**, y es deliberado. Metro empaqueta `@notecore/shared` para la app
 * de una forma que puede dejar **dos copias** de este módulo en el bundle —una alcanzada por
 * el cliente de API y otra por la pantalla que captura el error—, y entonces `error
 * instanceof ApiError` es `false` aunque el error sea exactamente un `ApiError`. Se detectó
 * en el emulador: crear una actividad sin conexión respondía "Ocurrió un error inesperado" en
 * lugar de encolarse, porque la comprobación fallaba y el fallo de red se trataba como un
 * error cualquiera.
 *
 * Comprobar la **forma** —el `status` 0 que este cliente pone cuando `fetch` ni siquiera sale
 * del dispositivo— funciona con cualquier número de copias del módulo, que es justo la
 * propiedad que hace falta aquí.
 */
export function isNetworkError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { status?: unknown; code?: unknown };

  /**
   * Se mira **solo** el `status` 0, no el nombre de la clase.
   *
   * `status` es la marca que este cliente pone cuando `fetch` ni siquiera llega a hablar con
   * el servidor, y una respuesta HTTP real nunca vale 0 —el 0 no es un código de estado—.
   * Comprobar además `name === 'ApiError'` parecía más estricto pero era frágil: el APK de
   * release **minifica** el bundle, y ahí no se puede dar por hecho que el nombre de la clase
   * sobreviva. Es un caso que no aparece en desarrollo ni en las suites de Node, solo en el
   * teléfono con la app compilada, que es donde se detectó.
   */
  return candidate.status === 0;
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
  /**
   * Qué versión de este cliente es (Fase 25).
   *
   * Viaja en la cabecera `x-notecore-version` de cada petición y el servidor la guarda en la
   * sesión. Es lo que permite responder «cuánta gente se quedó en una versión vieja», que
   * hoy no tiene respuesta: sin esto, publicar un arreglo y no saber si llegó a nadie.
   *
   * En la app es el `versionCode` de Android; en la web, la versión del paquete. Opcional:
   * un cliente que no la mande sigue funcionando igual, y su sesión se queda sin versión —lo
   * cual también es un dato.
   *
   * **No es una credencial y no se usa para autorizar nada.** Un valor manipulado solo
   * ensucia una cifra del panel; por eso basta con una cabecera, igual que `x-notecore-client`.
   */
  readonly version?: string;
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

  /**
   * `DELETE`, con cuerpo opcional.
   *
   * El cuerpo lo estrenó el borrado de cuenta de la Fase 20, que manda la contraseña y la
   * palabra de confirmación. Podría haber sido un `POST /auth/delete`, pero el recurso es la
   * cuenta y el verbo correcto es este; `DELETE` con cuerpo es legal en HTTP y la API ya
   * analiza el JSON de cualquier método. Las demás llamadas lo omiten y no cambian en nada:
   * sin `body`, `send` ni siquiera pone la cabecera `content-type`.
   */
  delete<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: 'DELETE', ...(body !== undefined && { body }) });
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const headers: Record<string, string> = {
      'x-notecore-client': this.options.client,
      ...(this.options.version !== undefined && {
        'x-notecore-version': this.options.version,
      }),
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
