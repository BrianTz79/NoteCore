/**
 * Módulo local del actualizador de la app (Fase 17).
 *
 * El puente vive en `apps/mobile/src/lib/actualizacion.ts`, que es quien decide si hay
 * versión nueva —con `hayActualizacion()` de `@notecore/shared`— y llama al lado nativo.
 * Este archivo solo existe porque el autolinking de Expo espera un punto de entrada de
 * JavaScript en cada módulo; el trabajo real es todo Kotlin.
 *
 * **Para quitar el actualizador**: borrar este directorio, `src/lib/actualizacion.ts`,
 * `plugins/with-actualizador.js` y su línea en `app.json`. Nada más del producto lo
 * referencia.
 */
export {};
