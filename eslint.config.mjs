import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import jestPlugin from 'eslint-plugin-jest';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['**/build/**', '**/dist/**', '**/node_modules/**'],
  },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      jest: jestPlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowBoolean: true,
          allowNullish: true
        },
      ],
    },
  },
  {
    // disable type-aware linting on JS files
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    // enable jest rules on test files, disable type-aware linting
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.e2e.ts'],
    extends: [jestPlugin.configs['flat/recommended'], tseslint.configs.disableTypeChecked],
  },
);
