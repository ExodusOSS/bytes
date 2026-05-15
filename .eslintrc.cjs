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
        // Hermes (and some other targets we ship to) does not support BigInt literal syntax.
        'no-restricted-syntax': [
          'error',
          {
            selector: 'Literal[bigint]',
            message:
              'BigInt literals (e.g. 1n) are not supported by all targets we ship to (e.g. Hermes); use BigInt(1) instead.',
          },
        ],
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
    {
      // Tests and benchmarks are not shipped, so BigInt literals are fine in fixtures.
      files: ['**/{tests,benchmarks}/**/*.?([cm])js'],
      rules: {
        'no-restricted-syntax': 'off',
      },
    },
  ],
}
