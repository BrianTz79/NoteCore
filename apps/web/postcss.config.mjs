/** @type {import('postcss-load-config').Config} */
const config = {
  // Tailwind 4 usa su propio plugin de PostCSS y ya no necesita autoprefixer.
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
