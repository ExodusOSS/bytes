module.exports = {
  extends: ['@exodus/eslint-config/javascript'],
  overrides: [
    {
      files: ['**/*.?([cm])js'],
      parser: 'espree',
      rules: {
        'unicorn/no-new-array': 'off',
        'unicorn/prefer-code-point': 'off',
      },
    },
    {
      files: ['*.{test,bench}.?([cm])js'],
      rules: {
        // Subpath exports support is missing: https://github.com/import-js/eslint-plugin-import/issues/1810
        '@exodus/import/no-unresolved': [2, { ignore: ['@exodus/bytes/\\w+'] }],
        'unicorn/no-useless-spread': 'off', // test vectors grouping
      },
    },
  ],
}
