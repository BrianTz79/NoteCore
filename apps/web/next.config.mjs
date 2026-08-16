/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `shared` se distribuye como TypeScript compilado dentro del monorepo;
  // Next debe transpilarlo junto con la app.
  transpilePackages: ['@notecore/shared'],
  // Salida standalone: la imagen de Docker queda mínima.
  output: 'standalone',
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
};

export default nextConfig;
