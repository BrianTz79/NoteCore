package net.ourocore.notecore.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Puente entre la app y el widget (FR-051).
 *
 * La app resuelve `widgetSnapshot()` con las funciones de @notecore/shared y manda aquí el
 * JSON del resultado. Este módulo solo lo guarda y avisa al lanzador. No interpreta el
 * contenido: si lo hiciera, la regla de qué clase toca existiría en dos idiomas.
 */
class WidgetHorarioModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WidgetHorario")

    /**
     * Guarda el estado y repinta los widgets colocados.
     *
     * Es `AsyncFunction` y no `Function` porque escribe en disco: bloquear el hilo de
     * JavaScript para eso congelaría la interfaz durante la sincronización.
     */
    AsyncFunction("guardar") { json: String ->
      val context: Context = appContext.reactContext ?: return@AsyncFunction false
      context
        .getSharedPreferences(HorarioWidgetProvider.PREFS, Context.MODE_PRIVATE)
        .edit()
        .putString(HorarioWidgetProvider.CLAVE, json)
        .apply()
      HorarioWidgetProvider.refrescarTodos(context)
      true
    }

    /**
     * Borra el estado guardado.
     *
     * Se llama al cerrar sesión: el horario de quien se fue no puede quedarse visible en la
     * pantalla de inicio del teléfono. Es el Principio III llevado hasta el lanzador.
     */
    /**
     * Pide al sistema que coloque el widget en la pantalla de inicio.
     *
     * Existe porque arrastrarlo a mano desde el menú de widgets es un gesto que mucha gente
     * no descubre —hay que mantener pulsado el escritorio, entrar en «Widgets» y buscar la
     * app entre todas las instaladas—. Con esto, la app ofrece el atajo desde donde el
     * estudiante ya está mirando su horario.
     *
     * Quien decide es Android: muestra su propio diálogo de confirmación y la app no puede
     * saltárselo. En lanzadores que no admiten el fijado —`isRequestPinAppWidgetSupported`
     * devuelve false— se responde `false` y la interfaz oculta el botón, en lugar de
     * ofrecer algo que no va a pasar.
     */
    AsyncFunction("fijar") {
      val context: Context = appContext.reactContext ?: return@AsyncFunction false
      val manager = AppWidgetManager.getInstance(context)
      if (!manager.isRequestPinAppWidgetSupported) return@AsyncFunction false
      manager.requestPinAppWidget(
        ComponentName(context, HorarioWidgetProvider::class.java),
        null,
        null,
      )
      true
    }

    /** Si el lanzador de este teléfono admite que la app proponga colocar el widget. */
    AsyncFunction("sePuedeFijar") {
      val context: Context = appContext.reactContext ?: return@AsyncFunction false
      AppWidgetManager.getInstance(context).isRequestPinAppWidgetSupported
    }

    AsyncFunction("limpiar") {
      val context: Context = appContext.reactContext ?: return@AsyncFunction false
      context
        .getSharedPreferences(HorarioWidgetProvider.PREFS, Context.MODE_PRIVATE)
        .edit()
        .remove(HorarioWidgetProvider.CLAVE)
        .apply()
      HorarioWidgetProvider.refrescarTodos(context)
      true
    }
  }
}
