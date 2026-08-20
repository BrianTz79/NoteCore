/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `shared` se distribuye como TypeScript compilado dentro del monorepo;
  // Next debe transpilarlo junto con la app.
  transpilePackages: ['@notecore/shared'],
  // Salida standalone: la imagen de Docker queda mínima.
  output: 'standalone',
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,

  /**
   * La API se sirve bajo `/api` del **mismo origen** que la web.
   *
   * No es una preferencia estética: las cookies de sesión son `httpOnly` con
   * `sameSite: lax`, y `lax` no las manda en peticiones cross-site. Con la web en
   * `notecore.ourocore.net` y la API en un host aparte, el navegador se guardaría la
   * cookie en cada `fetch` y la sesión no duraría ni una recarga. Sirviéndola bajo el
   * mismo origen, la petición no es cruzada y la cookie viaja como en desarrollo.
   *
   * El reenvío ocurre en el servidor de Next, dentro de la red de Docker, así que el
   * tráfico web→API no sale a internet. `API_ORIGIN` solo existe en el servidor; el
   * navegador nunca ve esa dirección.
   *
   * La app móvil **no pasa por aquí**: manda el token por cabecera y habla directamente
   * con `notecore-api.ourocore.net`, donde no hay cookie que proteger.
   */
  /**
   * Cabeceras de seguridad de la web.
   *
   * La API ya las emite con helmet, pero eso no cubre las páginas: las sirve Next, y sin
   * esto salían sin ninguna. La que de verdad faltaba es `X-Frame-Options` —sin ella
   * cualquier sitio puede meter NoteCore en un iframe invisible y recoger las pulsaciones
   * del usuario sobre botones que él cree de otra página—.
   *
   * No se define aquí una CSP: las necesidades de Next (estilos y scripts en línea con
   * nonce) hacen que una escrita a mano rompa la aplicación o quede tan permisiva que no
   * protege. Es una decisión consciente, no un olvido.
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Nadie puede embeber la web en un marco de otro origen.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // El navegador respeta el Content-Type declarado y no lo adivina.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Un año de HTTPS obligatorio, subdominios incluidos.
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // La URL completa solo se manda a nuestro propio origen.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // La web no usa ninguna de estas: se niegan explícitamente.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },

  async rewrites() {
    const destino = process.env.API_ORIGIN ?? 'http://api:3101';
    return [{ source: '/api/:path*', destination: `${destino}/:path*` }];
  },
};

export default nextConfig;
