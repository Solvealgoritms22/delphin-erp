import eslint from '@eslint/js';
import angular from 'angular-eslint';
import jsdoc from 'eslint-plugin-jsdoc';
import perfectionist from 'eslint-plugin-perfectionist';
import unusedImports from 'eslint-plugin-unused-imports';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  // Global ignores
  globalIgnores(['.angular/', 'dist/']),

  // Base configs
  eslint.configs.recommended,

  // Unused imports
  {
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
    },
  },

  // Perfectionist
  {
    files: ['**/*.ts'],
    plugins: {
      perfectionist: perfectionist,
    },
    rules: {
      'perfectionist/sort-imports': 'off',
    },
  },

  // Typescript
  {
    files: ['**/*.ts'],
    extends: [
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
      jsdoc.configs['flat/contents-typescript'],
      jsdoc.configs['flat/logical-typescript'],
      jsdoc.configs['flat/stylistic-typescript'],
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: (import.meta as any).dirname,
      },
    },
    processor: angular.processInlineTemplates,
    rules: {
      // Turn off no-unused-vars as it conflicts with unused-imports
      '@typescript-eslint/no-unused-vars': 'off',

      // Allow any where dynamic types, event payloads, or dialogs are used
      '@typescript-eslint/no-explicit-any': 'off',

      // Array type flexibility
      '@typescript-eslint/array-type': 'off',

      // Prefer "type" over "interface" for type definitions
      '@typescript-eslint/consistent-type-definitions': ['warn', 'type'],

      // Disable useless assignment false positives
      'no-useless-assignment': 'off',

      // Angular
      '@angular-eslint/component-selector': [
        'warn',
        {
          type: ['element', 'attribute'],
          prefix: '',
          style: 'kebab-case',
        },
      ],
      '@angular-eslint/directive-selector': [
        'warn',
        {
          type: 'attribute',
          prefix: '',
          style: 'camelCase',
        },
      ],
      '@typescript-eslint/consistent-indexed-object-style': 'off',
      'no-empty': 'off',
      'no-useless-escape': 'off',
      '@angular-eslint/component-class-suffix': 'off',
      '@angular-eslint/directive-class-suffix': 'off',
      '@angular-eslint/no-input-rename': 'off',
      '@angular-eslint/template/prefer-control-flow': 'off',
      '@angular-eslint/template/label-has-associated-control': 'off',
      '@angular-eslint/template/click-events-have-key-events': 'off',
      '@angular-eslint/template/interactive-supports-focus': 'off',
    },
  },

  // HTML
  {
    files: ['**/*.html'],
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility,
    ],
    rules: {
      '@angular-eslint/template/prefer-control-flow': 'off',
      '@angular-eslint/template/label-has-associated-control': 'off',
      '@angular-eslint/template/click-events-have-key-events': 'off',
      '@angular-eslint/template/interactive-supports-focus': 'off',
    },
  },

  // Test files
  {
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  }
);
