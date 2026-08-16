import type { InputHTMLAttributes, ReactNode } from 'react';

/**
 * Piezas de interfaz reutilizadas por los formularios de cuenta.
 *
 * La pasada de diseño integral es la Fase 11 (hallmark); aquí el objetivo es que las
 * pantallas sean claras y consistentes, no definitivas.
 */

export function Field({
  label,
  error,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
}) {
  const id = props.id ?? props.name;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-300">
        {label}
      </label>
      <input
        {...props}
        id={id}
        // `aria-invalid` y `aria-describedby` hacen que un lector de pantalla anuncie el
        // error junto al campo, no solo visualmente.
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`w-full rounded-lg border bg-slate-900 px-3.5 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-600 focus:ring-2 ${
          error
            ? 'border-red-800 focus:border-red-600 focus:ring-red-900/50'
            : 'border-slate-800 focus:border-sky-700 focus:ring-sky-900/50'
        }`}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Button({
  children,
  loading,
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const styles = {
    primary: 'bg-sky-600 text-white hover:bg-sky-500 disabled:bg-sky-900 disabled:text-sky-300',
    secondary: 'bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:text-slate-500',
    danger: 'bg-red-900/60 text-red-200 hover:bg-red-900 disabled:text-red-400',
  }[variant];

  return (
    <button
      {...props}
      disabled={props.disabled ?? loading}
      className={`rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed ${styles}`}
    >
      {loading ? 'Un momento…' : children}
    </button>
  );
}

/** Mensaje de error general del formulario, sobre los campos. */
export function FormError({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-red-900/60 bg-red-950/40 px-3.5 py-2.5 text-sm text-red-300">
      {message}
    </p>
  );
}

export function Card({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      {title ? <h2 className="text-lg font-medium text-slate-100">{title}</h2> : null}
      {children}
    </section>
  );
}
