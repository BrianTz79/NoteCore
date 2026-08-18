import { z } from 'zod';
import { entityIdSchema, requiredString } from './common.js';
import { MESSAGE_MAX_LENGTH, MESSAGE_PAGE_SIZE } from '../types/messaging.js';

/**
 * Validaciones de la mensajería (FR-043, FR-044).
 *
 * Principio II: la API valida con estos esquemas en el servidor —esa es la validación que
 * cuenta—. Web y app los reutilizan para no dejar enviar lo que se va a rechazar.
 *
 * Ninguno de estos esquemas comprueba **si se puede escribir**. Eso no es forma del dato: es
 * el estado de una relación que hay que ir a consultar, y vive en el servicio. Meterlo aquí
 * daría la falsa impresión de que validar el cuerpo basta para cumplir FR-044.
 */

/**
 * El texto de un mensaje.
 *
 * Se exige contenido de verdad, igual que en las publicaciones de la Fase 8: un mensaje de
 * solo espacios no dice nada y llenaría el hilo de renglones que no se distinguen de un
 * fallo de pintado.
 */
export const messageTextSchema = requiredString('el mensaje')
  .trim()
  .min(1, 'Escribe algo para enviar')
  .max(MESSAGE_MAX_LENGTH, `El mensaje no puede pasar de ${MESSAGE_MAX_LENGTH} caracteres`);

/**
 * Envío de un mensaje (FR-043).
 *
 * Al destinatario se le identifica por `@usuario` en la ruta, no aquí: es lo que el usuario
 * tiene delante viniendo de sus contactos o de un perfil, y así abrir una conversación por
 * primera vez y responder en una que ya existe son la misma llamada.
 *
 * `id` lo puede proponer el cliente, con la misma mecánica que la Fase 9: es lo que hace el
 * envío **idempotente**. Reenviar un mensaje cuya respuesta se perdió —la señal que cae con
 * el mensaje ya escrito en el servidor— encuentra el que ya existe en vez de mandarlo dos
 * veces. Un mensaje duplicado en un hilo es de los errores más visibles que hay.
 */
export const sendMessageSchema = z.object({
  text: messageTextSchema,
  id: entityIdSchema.optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

/**
 * Paginación del hilo: lo anterior a un mensaje dado.
 *
 * Se pagina por **cursor** y no por número de página. Un hilo crece por abajo mientras se
 * lee, así que "la página 2" significa cosas distintas según cuántos mensajes hayan llegado
 * entre una petición y la siguiente: se repetirían mensajes o se saltarían. Un cursor
 * anclado a un mensaje concreto no se mueve.
 */
export const messagePageSchema = z.object({
  /** Trae lo anterior a este mensaje. Sin él, la página más reciente. */
  antesDe: entityIdSchema.optional(),
  limite: z.coerce
    .number({ error: 'El límite debe ser un número' })
    .int('El límite debe ser un número entero')
    .min(1, 'El límite debe ser de al menos 1')
    .max(MESSAGE_PAGE_SIZE, `El límite no puede pasar de ${MESSAGE_PAGE_SIZE}`)
    .optional(),
});

export type MessagePageInput = z.infer<typeof messagePageSchema>;
