const { defineConfig } = require('eslint/config');
const recommendedConfig = require('@eslint/js').configs.recommended;
const eslintConfigPrettier = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  {
    ...recommendedConfig,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script', // CommonJS
      jest: true,
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-redeclare': 'error',
      'no-console': 'warn',
      eqeqeq: ['error', 'always'],
      camelcase: ['error', { properties: 'always' }],
    },
  },
  eslintConfigPrettier,
]);
