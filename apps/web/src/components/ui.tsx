import type { InputHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';

/**
 * Piezas de interfaz de la web.
 *
 * Fase 11: el sistema está bloqueado en `design.md` y los valores en
 * `packages/shared/src/design/tokens.ts`. Nada de aquí inventa un color ni un tamaño —si
 * hace falta uno nuevo, entra primero en los tokens.
 *
 * Su equivalente en la app es `apps/mobile/src/components/ui.tsx`, con las mismas piezas y
 * los mismos nombres: la paridad del Principio I se comprueba abriendo los dos archivos.
 */

/* ==========================================================================
 * Formularios
 * ======================================================================== */

export function Field({
  label,
  error,
  hint,
  mono,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  /** Cifras tabulares: para horas, códigos y cantidades. */
  mono?: boolean;
}) {
  const id = props.id ?? props.name;

  return (
    <div className="space-y-nc-2xs">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-tinta2"
      >
        {label}
      </label>
      <input
        {...props}
        id={id}
        // `aria-invalid` y `aria-describedby` hacen que un lector de pantalla anuncie el
        // error junto al campo, no solo visualmente.
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`w-full rounded-md border bg-papel3 px-nc-sm py-nc-xs text-md text-tinta transition-colors duration-100 outline-none placeholder:text-tinta3 disabled:cursor-not-allowed disabled:opacity-50 ${
          mono ? 'font-mono tabular-nums' : ''
        } ${
          error
            ? 'border-error/70 focus:border-error'
            : 'border-filete2 hover:border-tinta3 focus:border-acento'
        }`}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-tinta3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ==========================================================================
 * Controles
 * ======================================================================== */

/**
 * Las tres voces de botón de `design.md § Voz de los controles`.
 *
 * `ghost` no está en el documento como voz propia porque no lo es: es el secundario sin
 * superficie, para las acciones que acompañan a una fila y no deben competir con ella.
 */
const VOCES = {
  primary:
    'bg-acento text-acento-tinta hover:bg-foco disabled:bg-acento/40 disabled:text-acento-tinta/60',
  secondary:
    'bg-papel3 text-tinta border border-filete2 hover:border-tinta3 hover:bg-filete disabled:text-tinta3',
  /**
   * Destructivo: **discreto en reposo**, rojo solo al apuntarlo.
   *
   * En una lista de cinco materias, cinco botones rojos rellenos gritan una acción que es
   * la menos frecuente de la pantalla y convierten el rojo en decoración —y entonces el
   * rojo del aviso de faltas, que sí importa, deja de destacar—. El color aparece cuando el
   * puntero se acerca, que es cuando la advertencia sirve de algo.
   */
  danger:
    'bg-transparent text-tinta3 border border-filete2 hover:border-error/60 hover:bg-error-fondo hover:text-error disabled:text-tinta3/50',
  ghost:
    'text-tinta2 hover:text-tinta hover:bg-papel3 disabled:text-tinta3',
} as const;

export function Button({
  children,
  loading,
  variant = 'primary',
  size = 'md',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: keyof typeof VOCES;
  size?: 'sm' | 'md';
}) {
  const dimension = size === 'sm' ? 'px-nc-sm py-nc-2xs text-sm' : 'px-nc-md py-nc-xs text-md';

  return (
    <button
      {...props}
      disabled={props.disabled ?? loading}
      // Cuando está cargando, el lector de pantalla debe saberlo aunque el texto no cambie.
      aria-busy={loading || undefined}
      /*
       * `self-start` evita que el botón se estire.
       *
       * Las pantallas son `flex flex-col`, cuyo `align-items` por defecto es `stretch`: un
       * botón suelto entre dos paneles se ensanchaba a toda la columna y adquiría un peso
       * que no le corresponde —«Añadir actividad» ocupaba 950 píxeles—. Quien de verdad
       * quiera un botón de ancho completo lo pide con `className="w-full"`, que gana porque
       * va después.
       */
      className={`inline-flex items-center justify-center gap-nc-xs self-start rounded-md font-medium transition-colors duration-100 disabled:cursor-not-allowed ${dimension} ${VOCES[variant]} ${props.className ?? ''}`}
    >
      {loading ? <Spinner /> : null}
      {loading ? 'Un momento…' : children}
    </button>
  );
}

/** Indicador de carga del propio control. Nunca una capa sobre toda la pantalla. */
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-3.5 shrink-0 animate-spin rounded-pill border-2 border-current border-t-transparent ${className}`}
    />
  );
}

/**
 * Enlace con voz de navegación.
 *
 * Existe para que ninguna pantalla vuelva a escribir `text-acento hover:text-foco` a
 * mano —que es como el acento acabó con dos valores distintos antes de esta fase—.
 */
export function NavLink({
  href,
  children,
  className = '',
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`text-md font-medium text-acento transition-colors duration-100 hover:text-foco ${className}`}
    >
      {children}
    </Link>
  );
}

/* ==========================================================================
 * Mensajes de estado
 * ======================================================================== */

export function FormError({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-error/40 bg-error-fondo px-nc-sm py-nc-xs text-sm text-error"
    >
      {message}
    </p>
  );
}

/** Aviso que no es un error: proximidad al límite, semestre archivado, sin conexión. */
export function Notice({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'aviso' | 'exito';
}) {
  const tonos = {
    info: 'border-acento-tenue bg-acento/10 text-tinta2',
    aviso: 'border-aviso/40 bg-aviso-fondo text-aviso',
    exito: 'border-exito/40 bg-exito/10 text-exito',
  }[tone];

  return (
    <p className={`rounded-md border px-nc-sm py-nc-xs text-sm ${tonos}`}>{children}</p>
  );
}

/**
 * Etiqueta de estado.
 *
 * Radio de píldora, y **nunca sobre algo pulsable**: la forma significa «esto es una
 * etiqueta», y si además se pudiera pulsar dejaría de significarlo.
 */
export function Tag({
  children,
  color,
  tone = 'neutro',
}: {
  children: ReactNode;
  /** Color de materia. Manda sobre `tone` cuando viene. */
  color?: string | undefined;
  tone?: 'neutro' | 'acento' | 'aviso' | 'error' | 'exito';
}) {
  if (color) {
    return (
      <span
        className="inline-flex items-center gap-nc-2xs rounded-pill px-nc-xs py-nc-3xs text-xs font-medium text-tinta"
        // El color de la materia es dato, no decoración: entra como valor y no como clase
        // porque viene de la base de datos.
        style={{ backgroundColor: `${color}26`, border: `1px solid ${color}66` }}
      >
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-pill"
          style={{ backgroundColor: color }}
        />
        {children}
      </span>
    );
  }

  const tonos = {
    neutro: 'bg-papel3 text-tinta2 border-filete2',
    acento: 'bg-acento/15 text-acento border-acento-tenue',
    aviso: 'bg-aviso-fondo text-aviso border-aviso/40',
    error: 'bg-error-fondo text-error border-error/40',
    exito: 'bg-exito/10 text-exito border-exito/40',
  }[tone];

  return (
    <span
      className={`inline-flex items-center rounded-pill border px-nc-xs py-nc-3xs text-xs font-medium ${tonos}`}
    >
      {children}
    </span>
  );
}

/* ==========================================================================
 * Superficies
 * ======================================================================== */

/**
 * Panel de contenido.
 *
 * Se separa con **filete**, nunca con sombra: `design.md` lo prohíbe explícitamente porque
 * una sombra sobre fondo oscuro es un halo sucio, no una elevación.
 */
export function Card({
  children,
  title,
  action,
  className = '',
}: {
  children: ReactNode;
  title?: string;
  /** Acción de la cabecera del panel: "Añadir", "Editar". */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-filete bg-papel2 ${className}`}
    >
      {title || action ? (
        <header className="flex items-center justify-between gap-nc-sm border-b border-filete px-nc-md py-nc-sm">
          {title ? (
            <h2 className="text-lg font-medium text-tinta">{title}</h2>
          ) : (
            <span />
          )}
          {action}
        </header>
      ) : null}
      <div className="space-y-nc-sm p-nc-md">{children}</div>
    </section>
  );
}

/**
 * Cabecera de pantalla del Workbench.
 *
 * Título en display a la izquierda, acción principal a la derecha, filete debajo. Es fija:
 * en el horario y en la agenda se hace mucho desplazamiento y perder el título —y la
 * salida— obliga a subir del todo para volver.
 */
export function ScreenHeader({
  title,
  subtitle,
  action,
  back,
}: {
  title: string;
  subtitle?: string | undefined;
  action?: ReactNode;
  /** Enlace de vuelta. La web lo pinta como migaja; la app, como flecha. */
  back?: { href: string; label: string } | undefined;
}) {
  return (
    <header className="sticky top-0 z-10 -mx-md border-b border-filete bg-papel/95 px-nc-md py-nc-sm backdrop-blur-sm">
      {back ? (
        <Link
          href={back.href}
          className="mb-nc-2xs inline-block text-sm text-tinta3 transition-colors duration-100 hover:text-tinta"
        >
          ← {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-nc-sm">
        <div className="min-w-0">
          <h1 className="text-2xl font-medium text-tinta">{title}</h1>
          {subtitle ? (
            <p className="mt-nc-3xs text-sm text-tinta3">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
    </header>
  );
}

/**
 * Estado vacío.
 *
 * Una línea que dice qué falta y **un solo** control que lo resuelve. Sin ilustración:
 * ocupa el espacio donde debería estar el contenido y no ayuda a que aparezca.
 */
export function EmptyState({
  message,
  action,
}: {
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-nc-sm rounded-lg border border-dashed border-filete2 px-nc-md py-nc-lg">
      <p className="text-md text-tinta3">{message}</p>
      {action}
    </div>
  );
}

/**
 * Un dato con su etiqueta.
 *
 * El valor va en mono tabular por defecto porque casi todos los datos de esta aplicación
 * son cifras que se comparan entre sí: faltas, horas, días restantes.
 */
export function Stat({
  label,
  value,
  tone = 'neutro',
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: 'neutro' | 'acento' | 'aviso' | 'error' | 'exito';
  hint?: string | undefined;
}) {
  const color = {
    neutro: 'text-tinta',
    acento: 'text-acento',
    aviso: 'text-aviso',
    error: 'text-error',
    exito: 'text-exito',
  }[tone];

  return (
    <div className="space-y-nc-3xs">
      <p className="text-xs font-medium tracking-wide text-tinta3 uppercase">{label}</p>
      <p className={`font-mono text-2xl tabular-nums ${color}`}>{value}</p>
      {hint ? <p className="text-xs text-tinta3">{hint}</p> : null}
    </div>
  );
}

/** Separador. La única línea del sistema: un filete de un píxel. */
export function Rule({ className = '' }: { className?: string }) {
  return <hr className={`border-0 border-t border-filete ${className}`} />;
}
