/**
 * Tipos de la actualización de la app fuera de la tienda (FR-052, Fase 17).
 *
 * ## Por qué esto existe
 *
 * NoteCore no está en Play Store, así que la app se instala a mano. Sin un mecanismo
 * propio, cada versión nueva obliga a avisar a cada usuario y a que reinstale. La API
 * publica cuál es la última versión y dónde está su APK; la app compara al abrir y ofrece
 * descargarla.
 *
 * ## Lo que hay que saber antes de tocar nada aquí
 *
 * **Todo esto va detrás de un interruptor y tiene que poder desaparecer.** Las tiendas
 * prohíben que una app se autoactualice por fuera, así que el día que NoteCore suba a Play
 * Store esto se apaga con una variable de entorno y el resto del producto no se entera. Por
 * eso los tipos de la actualización viven en su propio archivo y no repartidos entre otros:
 * quitarlos es borrar un módulo, no perseguir campos por todo `shared`.
 *
 * **La decisión no la toma el cliente.** Qué versión es la última y si hay que actualizar se
 * resuelve con `hayActualizacion()` en `logic/updates.ts`, que ejecutan la app y la web sobre
 * el mismo dato del servidor. Comparar versiones a mano en cada cliente es exactamente cómo
 * se acaba con dos reglas distintas y una que envejece.
 */

/**
 * La versión de Android que la API publica como la última.
 *
 * `versionCode` y `versionName` no son dos formas de lo mismo, y confundirlos es el error
 * clásico de este mecanismo:
 *
 * - **`versionCode`** es un entero que Android usa para ordenar versiones. Es el único que
 *   decide si una instalación es una actualización o un intento de degradar (que Android
 *   rechaza). **Es el que compara `hayActualizacion()`**
 * - **`versionName`** es el texto que lee la persona («0.2.0»). No se compara jamás: dos
 *   publicaciones pueden llamarse igual, y ordenar textos daría que «0.10.0» es anterior a
 *   «0.9.0»
 */
export interface AndroidRelease {
  /** Entero creciente. Lo que Android compara y lo único que decide si hay novedad. */
  readonly versionCode: number;
  /** El nombre visible de la versión, para la persona. Nunca se compara. */
  readonly versionName: string;
  /** URL absoluta del APK. La compone el servidor, no el cliente. */
  readonly downloadUrl: string;
  /**
   * SHA-256 del APK en hexadecimal minúsculas.
   *
   * Se comprueba **antes de instalar**: es lo que impide que una descarga cortada o
   * alterada llegue al instalador de Android. La firma de la app protege del APK ajeno;
   * esto protege del binario corrupto, que es un caso distinto y mucho más frecuente.
   */
  readonly sha256: string;
  /** Tamaño en bytes, para poder anunciar la descarga antes de empezarla. */
  readonly sizeBytes: number;
  /** Qué trae de nuevo, en una o dos frases. Vacío si no se anotó nada. */
  readonly notes: string;
  /** Fecha de publicación, ISO 8601. */
  readonly publishedAt: string;
}

/**
 * Lo que responde la API cuando se le pregunta por la última versión.
 *
 * Es un objeto y no directamente `AndroidRelease | null` porque tiene que poder decir
 * **«el actualizador está apagado»**, que no es lo mismo que «no hay versión publicada».
 * Un cliente que reciba `disponible: false` deja de preguntar y no enseña nada; uno que
 * reciba `release: null` sabe que el mecanismo funciona pero todavía no hay APK.
 */
export interface LatestReleaseResponse {
  /** `false` cuando el actualizador está apagado en el servidor. */
  readonly disponible: boolean;
  /** La última versión publicada, o `null` si no hay ninguna. */
  readonly release: AndroidRelease | null;
}

/** En qué punto está la descarga e instalación, para lo que la pantalla muestra. */
export type EstadoDeActualizacion =
  | 'inactivo'
  | 'descargando'
  | 'verificando'
  | 'lista'
  | 'instalando'
  | 'error';
