/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      borderRadius: {
        DEFAULT: '0.5rem', // matches reference --radius: 0.5rem (see src/theme/tokens.ts)
      },
    },
  },
  plugins: [],
};
