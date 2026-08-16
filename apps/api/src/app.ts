import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { AppError, errors, sendError } from './lib/errors.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { scheduleRoutes } from './routes/schedule.js';
import { attendanceRoutes } from './routes/attendance.js';

/**
 * Construye la instancia de Fastify.
 *
 * Se separa de `index.ts` para poder montar la app en pruebas sin abrir un puerto.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.isProduction ? 'info' : 'debug',
      ...(config.isProduction
        ? {}
        : { transport: { target: 'pino-pretty', options: { colorize: true } } }),
      // El cuerpo de las peticiones nunca se registra, pero por si acaso se redactan las
      // cabeceras que llevan credenciales.
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
  });

  await app.register(helmet);

  await app.register(cors, {
    origin: config.corsOrigins,
    // Necesario para que el navegador envíe y acepte las cookies de sesión.
    credentials: true,
    // El cliente se identifica con esta cabecera para etiquetar su sesión.
    allowedHeaders: ['content-type', 'authorization', 'x-notecore-client'],
  });

  await app.register(cookie);

  /**
   * Límite de peticiones.
   *
   * Global y holgado; las rutas de contraseña lo restringen mucho más por su cuenta.
   * Sin esto, `/auth/login` sería un objetivo gratuito para probar contraseñas en masa.
   */
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    /**
     * El límite se comunica con el mismo formato de error que el resto de la API.
     *
     * Lo que devuelve esta función llega al manejador de errores como un error más, así
     * que se construye un `AppError`: sin él, el manejador no reconocería el objeto y
     * respondería 500 en lugar de 429.
     */
    errorResponseBuilder: () => errors.demasiadosIntentos(),
  });

  /**
   * Traduce cualquier error a la respuesta del contrato.
   *
   * Los errores inesperados se registran completos pero se responden en genérico: un
   * mensaje de PostgreSQL en la respuesta filtraría detalles del esquema.
   */
  app.setErrorHandler((error: unknown, request, reply) => {
    if (error instanceof AppError) {
      return sendError(reply, error);
    }

    const fastifyError = error as { statusCode?: number; code?: string };

    // Cuerpo que no es JSON válido o mal formado: es culpa del cliente, no del servidor.
    if (
      fastifyError.code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE' ||
      fastifyError.code === 'FST_ERR_CTP_EMPTY_JSON_BODY' ||
      fastifyError.code === 'FST_ERR_CTP_BODY_TOO_LARGE'
    ) {
      return sendError(
        reply,
        new AppError('validacion', 'El cuerpo de la petición debe ser JSON válido.', 400),
      );
    }

    request.log.error(error, 'Error no controlado');

    return reply.code(fastifyError.statusCode ?? 500).send({
      error: {
        code: 'error_interno',
        message: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
      },
    });
  });

  app.setNotFoundHandler((_request, reply) =>
    sendError(reply, new AppError('no_encontrado', 'Esa ruta no existe.', 404)),
  );

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(scheduleRoutes);
  await app.register(attendanceRoutes);

  return app;
}
