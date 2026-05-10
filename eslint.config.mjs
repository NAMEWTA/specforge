import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['scripts/**/*.{mjs,js}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
  },
  {
    ignores: [
      'dist/',
      'node_modules/',
      'tests/',
      'templates/',
      'bin/',
      'references/',
      'openspec/',
      'temp/',
      '.specforge/',
      'specforge/',
      '*.config.ts',
      '*.config.mjs',
    ],
  },
];
