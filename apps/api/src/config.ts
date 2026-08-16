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

  return {
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    port: env.PORT,
    databaseUrl,
    corsOrigins: env.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
    jwtSecret: env.JWT_SECRET,
    accessTokenSeconds: env.ACCESS_TOKEN_MINUTES * 60,
    refreshTokenSeconds: env.REFRESH_TOKEN_DAYS * 24 * 60 * 60,
    cookieDomain: env.COOKIE_DOMAIN && env.COOKIE_DOMAIN.length > 0 ? env.COOKIE_DOMAIN : null,
  } as const;
}

export const config = loadConfig();
