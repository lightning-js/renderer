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
    project: ['./tsconfig.json', './tsconfig.eslint.json'],
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    tsconfigRootDir: __dirname,
  },
  rules: {
    // Temporary relaxed rules while we tighten up our TypeScript code
    // TODO: Remove these rules once we eliminate all of the unnecessary `any` types in the code
    '@typescript-eslint/no-unsafe-argument': 'warn',
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
  },
  // Temporarily we also ignore all JavaScript files since they will be ultimately converted to TS.
  // TODO: Remove this once we have converted all of the JavaScript files to TypeScript
  ignorePatterns: ['**/*.js'],
};

module.exports = config;
