/**
 * Módulo local del widget de pantalla principal (FR-051).
 *
 * El puente hacia el widget vive en `apps/mobile/src/lib/widget.ts`, que es quien resuelve
 * `widgetSnapshot()` con las funciones de `@notecore/shared` y llama al lado nativo. Este
 * archivo solo existe porque el autolinking de Expo espera un punto de entrada de
 * JavaScript en cada módulo; el trabajo real de este módulo es todo Kotlin.
 */
export {};
