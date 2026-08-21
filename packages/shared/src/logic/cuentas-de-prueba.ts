/**
 * Qué cuentas son de prueba y no cuentan para las estadísticas.
 *
 * ## El problema que resuelve
 *
 * Verificar una fase exige crear cuentas, y cada verificación desde la Fase 1 dejó las suyas. Para
 * cuando el panel de la Fase 25 las contó por primera vez, había **315 cuentas en producción y
 * solo una era real**: su primera lectura decía «315 usuarios · 147 con horario», que no informa,
 * desinforma.
 *
 * Se limpió a mano el 2026-08-21, pero limpiar a mano no es una solución: la siguiente fase vuelve
 * a llenarlo. Esto lo resuelve de raíz — una cuenta creada con un dominio de prueba **nace
 * marcada**, y el panel la ignora en todos sus números sin que nadie tenga que acordarse de nada.
 *
 * ## Por qué una columna y no un `LIKE` en cada consulta
 *
 * Porque el panel tiene doce consultas de conteo y cada una tendría que repetir el mismo patrón
 * sobre el correo. Un criterio repetido doce veces es un criterio que acaba divergiendo: se añade
 * un dominio a la lista, se actualizan once consultas y la duodécima sigue contando de más. Con
 * una columna, el criterio se evalúa **una vez, al registrarse**, y todas las consultas filtran por
 * lo mismo.
 *
 * Además el correo se puede cambiar, y una cuenta no debería dejar de ser de prueba —ni
 * convertirse en una— por editar un campo.
 *
 * ## Esto no es un permiso ni una restricción
 *
 * Una cuenta de prueba **funciona exactamente igual** que cualquier otra: entra, captura su
 * horario, escribe mensajes. Lo único que cambia es que el panel no la cuenta. No es una cuenta
 * degradada, es una cuenta que no ensucia una estadística.
 */

/**
 * Dominios de correo que marcan una cuenta como de prueba.
 *
 * Son dominios **reservados o propios**, nunca dominios reales de correo:
 *
 * - `test`, `example`, `invalid` y `localhost` los reserva el RFC 2606 justo para esto: no se
 *   pueden registrar, así que nadie va a tener un correo legítimo ahí
 * - `example.com`, `example.org` y `example.net` son los dominios de ejemplo del RFC 2606
 * - `ourocoreprueba.com` es propio y deliberado: da un dominio de prueba que se lee como tal
 *
 * **`prueba.mx` NO está en la lista, y es a propósito**: `.mx` es un dominio de país real y
 * `prueba.mx` podría estar registrado por alguien. Marcar cuentas por un dominio que otra persona
 * puede poseer las excluiría de las estadísticas sin que lo supieran. Para las pruebas propias
 * hay que usar los de aquí arriba.
 */
export const DOMINIOS_DE_PRUEBA: readonly string[] = [
  'test',
  'example',
  'invalid',
  'localhost',
  'example.com',
  'example.org',
  'example.net',
  'ourocoreprueba.com',
  'notecore.test',
  'test.local',
];

/**
 * Si un correo pertenece a una cuenta de prueba.
 *
 * Acepta tanto el dominio exacto (`alguien@example.com`) como cualquier subdominio o TLD reservado
 * (`alguien@notecore.test`, `alguien@lo-que-sea.example`), porque los TLD del RFC 2606 se usan de
 * las dos formas.
 *
 * El correo llega ya normalizado a minúsculas por `emailSchema`, pero se vuelve a normalizar aquí:
 * esta función decide si algo cuenta o no en una estadística, y no puede depender de que quien la
 * llame se haya acordado de normalizar.
 */
export function esCorreoDePrueba(email: string): boolean {
  const dominio = email.trim().toLowerCase().split('@')[1];
  if (dominio === undefined || dominio.length === 0) return false;

  return DOMINIOS_DE_PRUEBA.some(
    (candidato) => dominio === candidato || dominio.endsWith(`.${candidato}`),
  );
}
