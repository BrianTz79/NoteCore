'use client';

import { useState } from 'react';
import {
  ApiError,
  REPORT_DETAIL_MAX_LENGTH,
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  REPORT_TARGET_LABELS,
  type ReportReason,
  type ReportTarget,
} from '@notecore/shared';
import { moderationApi } from '@/lib/api';
import { Button, FormError, Notice } from './ui';

/**
 * Reportar una publicación o un mensaje (Fase 21).
 *
 * Es **el mismo componente** para las dos superficies, y no dos parecidos: el formulario es
 * idéntico —motivo y explicación opcional— y lo único que cambia es la palabra con la que se
 * nombra lo reportado, que sale de `REPORT_TARGET_LABELS` en `shared`. Dos copias acabarían
 * ofreciendo motivos distintos según desde dónde se reporte.
 *
 * ## Por qué reportar y bloquear se pintan juntos pero separados
 *
 * El botón vive al lado de «Bloquear» en la publicación y en el hilo, con nombres distintos.
 * Son dos acciones distintas (ver `types/moderation.ts`): bloquear es una decisión privada de
 * quien bloquea y surte efecto en el acto; reportar avisa a quien mantiene el servicio y su
 * efecto llega después. Ofrecer solo una de las dos deja a la gente usando la que hay para lo
 * que no es.
 */
export function ReportDialog({
  target,
  targetId,
  authorName,
  onClose,
}: {
  target: ReportTarget;
  targetId: string;
  /** A quién se está reportando. Se muestra para que nadie reporte al de al lado por error. */
  authorName: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | undefined>();
  /** `null` mientras no se ha enviado; después, si ya lo había reportado antes. */
  const [enviado, setEnviado] = useState<{ yaReportado: boolean } | null>(null);

  async function enviar() {
    if (reason === null) {
      setError('Elige un motivo.');
      return;
    }

    setEnviando(true);
    setError(undefined);
    try {
      const recibo = await moderationApi.report({ target, targetId, reason, detail });
      setEnviado({ yaReportado: recibo.yaReportado });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo enviar el reporte.');
    } finally {
      setEnviando(false);
    }
  }

  /*
   * Enviado: se cierra el formulario y queda el acuse.
   *
   * No se cierra solo tras un segundo: quien acaba de reportar algo que le molesta necesita
   * leer que se registró, y una ventana que desaparece sola deja la duda de si se mandó.
   */
  if (enviado !== null) {
    return (
      <div className="space-y-nc-sm rounded-lg border border-filete bg-papel3 p-nc-sm">
        <Notice tone="exito">
          {enviado.yaReportado
            ? 'Ya habías reportado esto. Tu aviso sigue registrado.'
            : 'Gracias. Tu reporte quedó registrado y lo revisaremos.'}
        </Notice>
        {/*
          Se le recuerda el bloqueo aquí y no antes: reportar no cambia nada de lo que ve, y
          si lo que quiere es dejar de ver a esa persona, esta es la acción que lo hace.
        */}
        <p className="text-sm text-tinta3">
          Reportar no bloquea a {authorName}. Si no quieres ver más su contenido, bloquéala
          desde su perfil o desde aquí mismo.
        </p>
        <Button variant="secondary" onClick={onClose} data-testid="cerrar-reporte">
          Cerrar
        </Button>
      </div>
    );
  }

  return (
    <div
      className="space-y-nc-sm rounded-lg border border-filete bg-papel3 p-nc-sm"
      data-testid="dialogo-reporte"
    >
      <p className="text-sm text-tinta2">
        Reportar {REPORT_TARGET_LABELS[target].toLowerCase()} de{' '}
        <span className="text-tinta">{authorName}</span>
      </p>

      <fieldset className="space-y-nc-xs">
        <legend className="text-sm text-tinta3">¿Qué pasa con este contenido?</legend>
        {REPORT_REASONS.map((valor) => (
          <label
            key={valor}
            className="flex cursor-pointer items-center gap-nc-xs text-sm text-tinta"
          >
            <input
              type="radio"
              name={`motivo-${targetId}`}
              value={valor}
              checked={reason === valor}
              onChange={() => setReason(valor)}
              data-testid={`motivo-${valor}`}
              className="accent-acento"
            />
            {REPORT_REASON_LABELS[valor]}
          </label>
        ))}
      </fieldset>

      <div className="space-y-nc-2xs">
        <label htmlFor={`detalle-${targetId}`} className="text-sm text-tinta3">
          ¿Quieres añadir algo? (opcional)
        </label>
        <textarea
          id={`detalle-${targetId}`}
          data-testid="detalle-reporte"
          value={detail}
          maxLength={REPORT_DETAIL_MAX_LENGTH}
          onChange={(event) => setDetail(event.target.value)}
          rows={3}
          className="w-full rounded-lg border border-filete bg-papel2 px-nc-sm py-nc-xs text-tinta outline-none transition placeholder:text-tinta3 focus:border-acento focus:ring-2 focus:ring-acento-tenue"
        />
      </div>

      <FormError message={error} />

      <div className="flex flex-wrap gap-nc-sm">
        <Button onClick={() => void enviar()} loading={enviando} data-testid="enviar-reporte">
          Enviar reporte
        </Button>
        <Button variant="secondary" onClick={onClose} data-testid="cancelar-reporte">
          Cancelar
        </Button>
      </div>
    </div>
  );
}
