import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist', 'src/api/generated'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Обращения к API — только через сгенерированный SDK (см. README):
      // прямой fetch в компонентах и тестах запрещён.
      'no-restricted-globals': ['error', {
        name: 'fetch',
        message: 'В API ходим только через сгенерированный SDK (client/src/api) — прямой fetch запрещён.',
      }],
      'no-restricted-properties': ['error',
        {
          object: 'window',
          property: 'fetch',
          message: 'В API ходим только через сгенерированный SDK (client/src/api) — прямой fetch запрещён.',
        },
        {
          object: 'globalThis',
          property: 'fetch',
          message: 'В API ходим только через сгенерированный SDK (client/src/api) — прямой fetch запрещён.',
        },
      ],
    },
  },
  {
    // api-модуль — легальная точка доступа к SDK (реэкспорт generated/),
    // ему правило прямого fetch не мешает; сам сгенерированный SDK — в ignores.
    files: ['src/api/**'],
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
    },
  },
  {
    // Playwright: конфиг и e2e-тесты выполняются в Node (process, test-раннер)
    files: ['playwright.config.js', 'e2e/**'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
