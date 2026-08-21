import { z } from 'zod';

/**
 * Configuración leída del entorno y validada al arrancar.
 *
 * Si falta una variable o es inválida, el proceso muere aquí con un mensaje claro,
 * en vez de fallar más tarde de forma confusa.
 */

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_HOST: z.string().min(1).default('localhost'),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),

  /** Orígenes permitidos para CORS, separados por coma. */
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  /**
   * Secreto de firma de los tokens. 32 caracteres es el mínimo razonable para HS256;
   * `openssl rand -hex 32` genera 64.
   */
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),

  /**
   * Vida del token de acceso, en minutos. Corta a propósito: si se filtra, la ventana de
   * uso es pequeña, y el refresh token lo renueva sin que el usuario note nada.
   */
  ACCESS_TOKEN_MINUTES: z.coerce.number().int().positive().default(15),

  /** Vida del refresh token, en días. Define cuánto dura la sesión sin volver a entrar. */
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(30),

  /**
   * Dominio de las cookies de sesión. Vacío en desarrollo (el navegador usa el host de la
   * petición); en producción, el dominio compartido por web y API.
   */
  COOKIE_DOMAIN: z.string().optional(),

  /**
   * Prefijo bajo el que **el navegador** alcanza la API desde la web.
   *
   * En producción la web habla con la API por un rewrite del mismo origen
   * (`notecore.ourocore.net/api/...` → `api:3101/...`), así que el navegador pide el
   * refresco en `/api/auth/refresh`, no en `/auth/refresh`. La cookie de refresco lleva un
   * `path` estrecho a propósito, y un path que no coincide con la URL pedida **no se
   * envía**: el refresco respondía 401 y la sesión moría a los 15 minutos.
   *
   * Vacío en desarrollo, donde la web llama a la API sin prefijo. La app **no se ve
   * afectada** en ningún caso: manda el token por cabecera, no por cookie.
   */
  WEB_API_PREFIX: z
    .string()
    .default('')
    .refine(
      (value) => value === '' || (value.startsWith('/') && !value.endsWith('/')),
      'WEB_API_PREFIX debe empezar por "/" y no terminar en "/" (por ejemplo: /api)',
    ),

  /**
   * URL pública de la web, base de los enlaces de compartición (FR-028).
   *
   * La compone el servidor y no cada cliente: el enlace es lo que se codifica en el QR, así
   * que si la app armara una URL y la web otra, escanear y abrir el enlace llevarían a
   * sitios distintos —y FR-032 exige que las tres modalidades entreguen lo mismo—.
   *
   * Sin definir toma el primer origen de CORS, que en desarrollo es la web local. En
   * producción se fija explícitamente al dominio del túnel.
   */
  WEB_URL: z.string().url('WEB_URL debe ser una URL completa').optional(),

  /**
   * Interruptor del actualizador de la app fuera de la tienda (Fase 17).
   *
   * **Apagado por defecto, y eso es parte del diseño.** Las tiendas prohíben que una app se
   * autoactualice por su cuenta, así que el día que NoteCore suba a Play Store esta variable
   * se queda como está y todo el mecanismo desaparece: la ruta responde que no está
   * disponible, la app no pregunta y el permiso de instalación no entra en el manifiesto.
   *
   * Encenderlo exige además `RELEASES_DIR`: un actualizador encendido sin un directorio de
   * dónde servir el APK no puede publicar nada.
   */
  UPDATER_ENABLED: z
    .string()
    .default('false')
    .transform((valor) => valor === 'true' || valor === '1'),

  /**
   * Directorio del que se sirven los APK publicados.
   *
   * Dentro va el binario y su `.sha256`, más un `latest.json` que dice cuál es la versión
   * publicada. Es un directorio y no una tabla en la base de datos porque publicar una
   * versión es copiar dos archivos: meter eso en PostgreSQL obligaría a una migración y a un
   * panel de administración para algo que hoy hace `cp`.
   */
  RELEASES_DIR: z.string().optional(),

  /**
   * URL pública desde la que la **app** alcanza la API.
   *
   * Hace falta porque el enlace de descarga del APK tiene que ser absoluto: lo abre el
   * gestor de descargas de Android, que no tiene ni origen ni sesión de la que derivar nada.
   * No se reutiliza `WEB_URL` —esa es la web, y en producción son hostnames distintos a
   * propósito (ver la sección 7 de PROYECTO.md)—.
   *
   * Sin definir, el enlace se compone con el host de la petición, que es lo correcto en
   * desarrollo y lo que se debe fijar explícitamente en producción.
   */
  PUBLIC_API_URL: z
    .string()
    .url('PUBLIC_API_URL debe ser una URL completa')
    .optional(),
});

function loadConfig() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Configuración de entorno inválida:\n${issues}\n\n` +
        'Copia `.env.example` a `.env` y rellena los valores.',
    );
  }

  const env = parsed.data;

  const databaseUrl =
    `postgres://${encodeURIComponent(env.POSTGRES_USER)}:` +
    `${encodeURIComponent(env.POSTGRES_PASSWORD)}@` +
    `${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`;

  const corsOrigins = env.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return {
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    port: env.PORT,
    databaseUrl,
    corsOrigins,
    // El primer origen de CORS es la web en desarrollo; `http://localhost:3000` si no hay
    // ninguno, que es donde `next dev` levanta.
    webUrl: env.WEB_URL ?? corsOrigins[0] ?? 'http://localhost:3000',
    jwtSecret: env.JWT_SECRET,
    accessTokenSeconds: env.ACCESS_TOKEN_MINUTES * 60,
    refreshTokenSeconds: env.REFRESH_TOKEN_DAYS * 24 * 60 * 60,
    cookieDomain: env.COOKIE_DOMAIN && env.COOKIE_DOMAIN.length > 0 ? env.COOKIE_DOMAIN : null,
    webApiPrefix: env.WEB_API_PREFIX,
    /**
     * El actualizador solo está encendido si además sabe de dónde servir el APK.
     *
     * Las dos condiciones se combinan **aquí** y no en cada sitio que las consulte: con dos
     * banderas sueltas, un descuido dejaría la ruta anunciando una versión que no puede
     * entregar, y el usuario descargaría un 404.
     */
    updaterEnabled: env.UPDATER_ENABLED && Boolean(env.RELEASES_DIR),
    releasesDir: env.RELEASES_DIR ?? null,
    publicApiUrl: env.PUBLIC_API_URL ?? null,
  } as const;
}

export const config = loadConfig();
