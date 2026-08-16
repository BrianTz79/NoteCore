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
  } as const;
}

export const config = loadConfig();
