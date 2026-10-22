const expoConfig = require('eslint-config-expo/flat');
const tseslint = require('typescript-eslint');
const reactHooks = require('eslint-plugin-react-hooks');
const a11y = require('eslint-plugin-react-native-a11y');

module.exports = tseslint.config(
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
  },
  {
    plugins: {
      'react-hooks': reactHooks,
      'react-native-a11y': a11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...a11y.configs.ios.rules,
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },
);
