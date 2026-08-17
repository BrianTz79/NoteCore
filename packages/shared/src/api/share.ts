/**
 * Llamadas de la compartición, tipadas.
 *
 * Principio VIII: web y app llaman a estas funciones en lugar de escribir cada una sus
 * rutas y sus tipos de respuesta.
 */

import type { AcceptShareInput, CreateShareInput } from '../schemas/share.js';
import type { Share, ShareAcceptResult, SharePreview } from '../types/share.js';
import type { ApiClient } from './client.js';

export const SHARE_ROUTES = {
  /** Lista y creación de los compartidos del emisor. */
  root: '/shares',
  /** Vista previa por código, sin copiar nada (FR-030). */
  preview: (code: string) => `/shares/${code}/preview`,
  /** Aceptación: copia a la cuenta del receptor (FR-031). */
  accept: (code: string) => `/shares/${code}/accept`,
  /** Revocación por parte del emisor (FR-033). */
  byId: (id: string) => `/shares/${id}`,
} as const;

export function createShareApi(client: ApiClient) {
  return {
    /** Los compartidos que el usuario ha generado, con su estado ya resuelto (FR-033). */
    list(): Promise<readonly Share[]> {
      return client.get<readonly Share[]>(SHARE_ROUTES.root);
    },

    /**
     * Genera un compartido con el contenido seleccionado (FR-028, FR-029).
     *
     * Devuelve las tres modalidades resueltas —código, enlace y el contenido del QR— porque
     * las tres salen del mismo `code`: el enlace lo incrusta y el QR codifica el enlace.
     */
    create(input: CreateShareInput): Promise<Share> {
      return client.post<Share>(SHARE_ROUTES.root, input);
    },

    /**
     * La vista previa de un compartido (FR-030).
     *
     * Es de solo lectura: consultarla no copia nada. Se puede llamar sin haber decidido
     * todavía, que es justamente lo que el requisito pide.
     */
    preview(code: string): Promise<SharePreview> {
      return client.get<SharePreview>(SHARE_ROUTES.preview(code));
    },

    /**
     * Acepta un compartido y obtiene una copia independiente (FR-031).
     *
     * A partir de aquí no queda vínculo con el original: lo que el emisor edite después no
     * toca esta copia, ni al revés (Principio IV).
     */
    accept(code: string, input: AcceptShareInput = {}): Promise<ShareAcceptResult> {
      return client.post<ShareAcceptResult>(SHARE_ROUTES.accept(code), input);
    },

    /**
     * Revoca un compartido (FR-033).
     *
     * No lo borra: la fila se conserva con su marca de revocación para que quien abra el
     * enlace reciba "lo retiraron" en lugar de "no existe", que son cosas distintas.
     */
    revoke(id: string): Promise<Share> {
      return client.patch<Share>(SHARE_ROUTES.byId(id), { revoked: true });
    },
  };
}

export type ShareApi = ReturnType<typeof createShareApi>;
