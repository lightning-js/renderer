/* global module */
/** @type {import('typedoc').TypeDocOptions} */
module.exports = {
  entryPoints: [
    './exports/main-api.ts',
    './exports/core-api.ts',
    './exports/utils.ts',
  ],
  out: 'docs',
};
