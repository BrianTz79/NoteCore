import type { OfflineStorage } from '@notecore/shared';

/**
 * Almacenamiento del navegador para el cache de consulta (FR-048).
 *
 * Principio VIII: la mecánica vive en `SyncEngine`; esto es solo el "dónde se guarda" que esa
 * clase pide, igual que en la app pero sobre `localStorage`.
 *
 * **Alcance de la web en esta fase**: cachear lo ya cargado para poder consultarlo sin
 * conexión, sin cola de escrituras. La constitución pide a la web offline "en la medida que
 * la plataforma lo permita" y FR-049 habla de la app; encolar escrituras aquí exigiría un
 * *service worker* con su propio ciclo de vida —instalación, actualización, versiones
 * cacheadas— que es una fuente conocida de fallos difíciles de reproducir, a cambio de una
 * capacidad que el navegador ya cubre peor que el teléfono.
 *
 * `localStorage` es síncrono, pero la interfaz es asíncrona porque la de la app lo es. Se
 * envuelve en promesas ya resueltas: el motor no tiene por qué saber de qué plataforma viene.
 */

/**
 * Si `localStorage` se puede usar.
 *
 * No basta con comprobar que existe: en modo privado de algunos navegadores existe y **lanza
 * al escribir**, y con las cookies de terceros bloqueadas el acceso puede fallar de entrada.
 * Se comprueba escribiendo de verdad, que es la única forma honesta de saberlo.
 */
function disponible(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const testigo = '__notecore_test__';
    window.localStorage.setItem(testigo, '1');
    window.localStorage.removeItem(testigo);
    return true;
  } catch {
    return false;
  }
}

export const offlineStorage: OfflineStorage = {
  async getItem(key) {
    if (!disponible()) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async setItem(key, value) {
    if (!disponible()) return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // `QuotaExceededError` con el almacenamiento lleno: se sigue sin cache en lugar de
      // romper la pantalla, que ya tiene sus datos en memoria.
    }
  },

  async removeItem(key) {
    if (!disponible()) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Borrar algo que ya no está no es un error.
    }
  },
};
