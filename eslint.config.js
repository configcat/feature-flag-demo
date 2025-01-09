// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const rxjs = require('@smarttools/eslint-plugin-rxjs');
const sonarjs = require('eslint-plugin-sonarjs');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = tseslint.config(
  {
    files: ['**/*.ts'],
    plugins: {
      rxjs,
    },
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      ...angular.configs.tsRecommended,
      rxjs.configs.recommended,
      sonarjs.configs.recommended,
      eslintPluginPrettierRecommended,
    ],
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off', // Sometimes we just know it.
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/unbound-method': ['error', { ignoreStatic: true }],
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/restrict-plus-operands': ['error', { allowNumberAndString: true }],
      '@typescript-eslint/no-extraneous-class': 'off', //TODO - do it
      '@smarttools/rxjs/no-implicit-any-catch': 'off',
      '@smarttools/rxjs/no-nested-subscribe': 'off',
      'sonarjs/cognitive-complexity': 'off',
      'sonarjs/regex-complexity': 'off',
      'sonarjs/slow-regex': 'off',
      'sonarjs/no-nested-functions': 'off',
      'sonarjs/no-selector-parameter': 'off',
      'sonarjs/no-misleading-array-reverse': 'off',
      'sonarjs/no-nested-conditional': 'off',
      'sonarjs/max-switch-cases': 'off',
      'sonarjs/no-nested-assignment': 'off',
      '@angular-eslint/no-async-lifecycle-method': 'error',
      '@angular-eslint/no-conflicting-lifecycle': 'error',
      '@angular-eslint/no-duplicates-in-metadata-arrays': 'error',
      '@angular-eslint/prefer-output-readonly': 'error',
      '@angular-eslint/relative-url-prefix': 'error',
      '@angular-eslint/use-component-selector': 'error',
      '@angular-eslint/use-lifecycle-interface': 'error',
      '@angular-eslint/prefer-signals': 'error',
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      // All rules for angular eslint-plugin: https://github.com/angular-eslint/angular-eslint/blob/main/packages/eslint-plugin/src/configs/all.json
    },
    ignores: [
      '**/competitor-data-import-module/**/*.ts',
      '**/_types/iterator-helpers.d.ts',
      '**/_types/utility-types.d.ts',
      '**/_utils/iterable-utils.ts',
      '**/_utils/string-utils.ts',
    ],
  },
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
      eslintPluginPrettierRecommended,
    ],
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      '@angular-eslint/template/click-events-have-key-events': 'off',
      '@angular-eslint/template/interactive-supports-focus': 'off',
      '@angular-eslint/template/no-autofocus': 'off',
      '@angular-eslint/template/prefer-control-flow': 'error',
      '@angular-eslint/template/use-track-by-function': 'error',
      '@angular-eslint/template/banana-in-box': 'error',
      '@angular-eslint/template/eqeqeq': 'error',
      '@angular-eslint/template/no-any': 'error',
      '@angular-eslint/template/no-distracting-elements': 'error',
      '@angular-eslint/template/no-duplicate-attributes': 'error',
      '@angular-eslint/template/no-interpolation-in-attributes': 'error',
      '@angular-eslint/template/attributes-order': 'error',
      '@angular-eslint/template/button-has-type': 'error',
      // All rules for angular eslint-plugin-template: https://github.com/angular-eslint/angular-eslint/blob/main/packages/eslint-plugin-template/src/configs/all.json
    },
  }
);
