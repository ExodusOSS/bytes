module.exports = {
  extends: ['@exodus/eslint-config/javascript'],
  overrides: [
    {
      files: ['**/*.?([cm])js'],
      parser: 'espree',
      rules: {
        '@exodus/import/no-extraneous-dependencies': [
          'error',
          {
            devDependencies: ['**/{tests,benchmarks}/**/*', '**/*.{test,bench}.*', '**/*.d.ts'],
          },
        ],
        // Subpath exports support is missing: https://github.com/import-js/eslint-plugin-import/issues/1810
        '@exodus/import/no-unresolved': [2, { ignore: ['@exodus/bytes/\\w+'] }],
        'one-var': 'off',
        'unicorn/no-for-loop': 'off',
        'unicorn/no-new-array': 'off',
        'unicorn/prefer-code-point': 'off',
        'unicorn/prefer-math-trunc': 'off',
        'unicorn/prefer-spread': 'off',
        'unicorn/text-encoding-identifier-case': 'off',
      },
    },
    {
      files: ['*.{test,bench}.?([cm])js'],
      rules: {
        'unicorn/no-useless-spread': 'off', // test vectors grouping
      },
    },
  ],
}
