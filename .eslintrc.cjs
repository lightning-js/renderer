/* eslint-env node */
const config = {
  root: true,
  env: {
    browser: true,
    es2021: true,
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  parserOptions: {
    /**
     * Required for eslint to work in our Reference based TypeScript project
     * https://github.com/typescript-eslint/typescript-eslint/issues/2094#issuecomment-1564608505
     */
    EXPERIMENTAL_useSourceOfProjectReferenceRedirect: true,
    project: [
      './tsconfig.json',
      './tsconfig.vitest.json',
      './tsconfig.cfg.json',
      './examples/tsconfig.json',
      './visual-regression/tsconfig.json',
      './performance/tsconfig.json',
    ],
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    tsconfigRootDir: __dirname,
  },
  rules: {
    // Allow us to write async functions that don't use await
    // Intresting commentary on this: https://github.com/standard/eslint-config-standard-with-typescript/issues/217
    '@typescript-eslint/require-await': 'off',
    // Temporary relaxed rules while we tighten up our TypeScript code
    // TODO: Remove these rules once we eliminate all of the unnecessary `any` types in the code
    '@typescript-eslint/no-unsafe-argument': 'warn',
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/restrict-template-expressions': [
      'warn',
      {
        allowNumber: true,
        allowBoolean: true,
      },
    ],
  },
};

module.exports = config;
