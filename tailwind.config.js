/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui'],
        display: ['Fraunces', 'serif'],
      },
      boxShadow: {
        soft: '0 16px 40px rgba(15, 23, 42, 0.12)',
        lift: '0 10px 26px rgba(15, 23, 42, 0.16)',
      },
    },
  },
  plugins: [],
}
