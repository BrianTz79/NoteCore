package net.ourocore.notecore.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Puente entre la app y la familia de widgets (FR-051, Fases 11 y 16).
 *
 * La app resuelve `widgetFamily()` con las funciones de @notecore/shared y manda aquí el
 * JSON del resultado. Este módulo solo lo guarda y avisa al lanzador. No interpreta el
 * contenido: si lo hiciera, las reglas de qué clase toca, qué falta urge y qué vence
 * pronto existirían en dos idiomas.
 */
class WidgetHorarioModule : Module() {

  /**
   * Las cuatro clases de widget, por su nombre corto.
   *
   * La tabla vive aquí y no en JavaScript porque es lo que traduce un nombre —lo único que
   * el lado JS conoce— a una clase de Android. Un nombre desconocido devuelve `null` y la
   * llamada responde `false`, en lugar de reventar por un `ClassNotFoundException` que
   * dejaría la app sin arrancar la próxima vez.
   */
  private fun claseDeWidget(nombre: String): Class<*>? = when (nombre) {
    "horario" -> HorarioWidgetProvider::class.java
    "dia" -> DiaWidgetProvider::class.java
    "faltas" -> FaltasWidgetProvider::class.java
    "agenda" -> AgendaWidgetProvider::class.java
    else -> null
  }

  override fun definition() = ModuleDefinition {
    Name("WidgetHorario")

    /**
     * Guarda el estado de los cuatro widgets y los repinta.
     *
     * Recibe dos JSON y no uno porque son dos formas distintas: el compacto conserva la
     * suya —la de la Fase 11, con la clave `snapshot` que ya está escrita en los teléfonos
     * de quien tiene el widget colocado— y los tres de lista comparten la nueva. Cambiar
     * la clave del primero le habría dejado el widget en blanco al actualizar la app.
     *
     * Es `AsyncFunction` y no `Function` porque escribe en disco: bloquear el hilo de
     * JavaScript para eso congelaría la interfaz durante la sincronización.
     */
    AsyncFunction("guardar") { compacto: String, familia: String ->
      val context: Context = appContext.reactContext ?: return@AsyncFunction false
      context
        .getSharedPreferences(HorarioWidgetProvider.PREFS, Context.MODE_PRIVATE)
        .edit()
        .putString(HorarioWidgetProvider.CLAVE, compacto)
        .putString(HorarioWidgetProvider.CLAVE_FAMILIA, familia)
        .apply()
      HorarioWidgetProvider.refrescarTodos(context)
      true
    }

    /**
     * Pide al sistema que coloque un widget en la pantalla de inicio.
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
    AsyncFunction("fijar") { cual: String ->
      val context: Context = appContext.reactContext ?: return@AsyncFunction false
      val clase = claseDeWidget(cual) ?: return@AsyncFunction false
      val manager = AppWidgetManager.getInstance(context)
      if (!manager.isRequestPinAppWidgetSupported) return@AsyncFunction false
      manager.requestPinAppWidget(ComponentName(context, clase), null, null)
      true
    }

    /** Si el lanzador de este teléfono admite que la app proponga colocar un widget. */
    AsyncFunction("sePuedeFijar") {
      val context: Context = appContext.reactContext ?: return@AsyncFunction false
      AppWidgetManager.getInstance(context).isRequestPinAppWidgetSupported
    }

    /**
     * Borra el estado guardado de los cuatro.
     *
     * Se llama al cerrar sesión. El horario, las faltas y las entregas de quien se fue no
     * pueden quedarse visibles en la pantalla de inicio del teléfono: es el Principio III
     * —aislamiento de datos— llevado hasta el lanzador, que es donde se olvida. Los cuatro
     * widgets se borran, no solo el original: uno que se quedara mostrando las materias en
     * riesgo del usuario anterior sería la misma fuga por otra puerta.
     */
    AsyncFunction("limpiar") {
      val context: Context = appContext.reactContext ?: return@AsyncFunction false
      context
        .getSharedPreferences(HorarioWidgetProvider.PREFS, Context.MODE_PRIVATE)
        .edit()
        .remove(HorarioWidgetProvider.CLAVE)
        .remove(HorarioWidgetProvider.CLAVE_FAMILIA)
        .apply()
      HorarioWidgetProvider.refrescarTodos(context)
      true
    }
  }
}
