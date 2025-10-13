import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import jestPlugin from 'eslint-plugin-jest';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['**/build/**', '**/dist/**', '**/node_modules/**'],
  },
  // Node.js scripts configuration
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        require: 'readonly',
        module: 'readonly',
      },
    },
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
        project: ['./tsconfig.app.json', './tsconfig.node.json', './tsconfig.test.json', './tsconfig.e2e.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "prefer-const": [
        "error",
        {
          destructuring: "all"
        }
      ],
      '@typescript-eslint/dot-notation': [
        'error',
        {
          allowIndexSignaturePropertyAccess: true
        },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowBoolean: true,
          allowNullish: true
        },
      ],
      // Allow classes with only static methods - valid architectural pattern for service classes
      '@typescript-eslint/no-extraneous-class': 'off',
      // Disable unnecessary-condition rule - conflicts with defensive programming when noUncheckedIndexedAccess is enabled
      // With noUncheckedIndexedAccess, array[i] returns T | undefined even in bounded loops, making defensive checks valuable
      '@typescript-eslint/no-unnecessary-condition': 'off',
      // Require explicit type conversions - disallow implicit coercion tricks like !! for boolean, + for number, etc.
      'no-implicit-coercion': ['error', {
        boolean: true,  // Disallow !!x, require Boolean(x)
        number: true,   // Disallow +x, require Number(x)
        string: true    // Disallow '' + x, require String(x)
      }],
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
