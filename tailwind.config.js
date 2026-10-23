/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // 'class' (not the Tailwind default 'media'): NativeWind's web runtime needs this to
  // programmatically toggle color scheme — React Navigation does so automatically on mount,
  // and with 'media' that throws ("Cannot manually set color scheme... use setFlag('darkMode',
  // 'class')"). RN itself still uses Appearance/useColorScheme, unaffected by this setting.
  darkMode: 'class',
  theme: {
    extend: {
      borderRadius: {
        DEFAULT: '0.5rem', // matches reference --radius: 0.5rem (see src/theme/tokens.ts)
      },
    },
  },
  plugins: [],
};
