package net.ourocore.notecore.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews

/**
 * Widget «Faltas» (Fase 16).
 *
 * Solo las materias cerca del límite o ya en él. Un widget que enseñara las nueve, la
 * mayoría en verde, no diría nada de un vistazo: habría que leerlo entero para descubrir
 * que no pasa nada.
 *
 * **No decide nada.** La regla vive en `widgetFaltas()` de
 * packages/shared/src/logic/widgets.ts y la ejecuta la app, que deja el resultado ya
 * resuelto —texto, colores y todo— donde este proveedor lo lee. Aquí solo se delega en
 * [PintorDeListas], que es el mismo para los tres widgets de lista.
 */
class FaltasWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray,
  ) {
    val vista = construirVista(context)
    for (id in appWidgetIds) appWidgetManager.updateAppWidget(id, vista)
  }

  companion object {
    /**
     * Construye la vista de este widget.
     *
     * Es `internal` y no privada porque [HorarioWidgetProvider.refrescarTodos] la llama
     * al guardar un estado nuevo: los cuatro widgets se repintan a la vez, en el mismo
     * broadcast, para que no puedan mostrar dos momentos distintos del mismo horario.
     */
    internal fun construirVista(context: Context): RemoteViews =
      PintorDeListas.construir(context, "faltas", "notecore://faltas")
  }
}
