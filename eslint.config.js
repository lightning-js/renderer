import eslintPluginTs from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: [
          './tsconfig.json',
          './tsconfig.vitest.json',
          './tsconfig.cfg.json',
          './visual-regression-tests/tsconfig.json',
          './visual-regression/tsconfig.json',
          './performance/tsconfig.json',
        ],
      },
    },
    plugins: {
      '@typescript-eslint': eslintPluginTs,
    },
    rules: {
      ...eslintPluginTs.configs.recommended.rules,
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
    },
  },
  {
    ignores: [
      '**/dist/**',
      'node_modules',
      '**config**.ts',
      '**/docs/**',
      'dist-vitest',
      'dist-cfg',
    ],
  },
];
