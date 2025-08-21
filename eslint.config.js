// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'components/HanziWriterQuiz.tsx'],
  },
  {
    files: ['app/module/3/index.tsx'],
    rules: {
      'import/namespace': 'off',
    },
  },
]);
