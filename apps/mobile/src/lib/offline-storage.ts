import { Directory, File, Paths } from 'expo-file-system';
import type { OfflineStorage } from '@notecore/shared';

/**
 * Almacenamiento persistente de la app para el cache y la cola (FR-048, FR-049).
 *
 * Principio VIII: la mecánica de la cola vive en `SyncEngine`; esto es solo el "dónde se
 * guarda" que esa clase pide como `OfflineStorage`, igual que `TokenStore` es el "dónde
 * viven los tokens" de `ApiClient`.
 *
 * **Por qué el sistema de archivos y no `SecureStore`**, que ya estaba instalado: sus
 * entradas están limitadas a 2048 bytes en Android, y un horario completo o una agenda con
 * treinta actividades los pasan con facilidad. Guardarlas allí fallaría en cuanto la cuenta
 * tuviera contenido de verdad —justo cuando el offline importa—, y además el cifrado por
 * hardware que lo hace lento no aporta nada aquí: esto es material que el usuario ya tiene
 * delante, no credenciales. Los tokens siguen en `SecureStore`, que es donde deben estar.
 *
 * **Por qué no `AsyncStorage`**: habría que añadirlo como módulo nativo y volver a ejecutar
 * `expo prebuild`. `expo-file-system` ya viene con el SDK de Expo que la app usa, así que
 * esta fase no añade ni un módulo nativo nuevo ni obliga a regenerar el proyecto Android.
 */

/** Carpeta propia dentro del área privada de la app, que el sistema no borra. */
const ROOT = new Directory(Paths.document, 'notecore-offline');

function ensureRoot(): void {
  if (!ROOT.exists) ROOT.create({ intermediates: true });
}

/**
 * Nombre de archivo seguro a partir de la clave.
 *
 * Las claves llevan `:` y el identificador del usuario (`notecore:<uuid>:cola`), y los dos
 * puntos no son válidos en algunos sistemas de archivos. Se sustituye por un guion bajo, que
 * conserva la unicidad porque el resto de la clave ya lo es.
 */
function fileFor(key: string): File {
  return new File(ROOT, `${key.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`);
}

export const offlineStorage: OfflineStorage = {
  async getItem(key) {
    try {
      const file = fileFor(key);
      if (!file.exists) return null;
      return await file.text();
    } catch {
      // Un archivo ilegible se trata como ausente: el cache se rehace con una lectura y la
      // cola prefiere perder una entrada a impedir que la app arranque.
      return null;
    }
  },

  async setItem(key, value) {
    ensureRoot();
    fileFor(key).write(value);
  },

  async removeItem(key) {
    try {
      const file = fileFor(key);
      if (file.exists) file.delete();
    } catch {
      // Borrar algo que ya no está no es un error.
    }
  },
};
