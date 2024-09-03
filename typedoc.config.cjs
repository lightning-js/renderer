/* global module */
/** @type {import('typedoc').TypeDocOptions} */
module.exports = {
  entryPoints: [
    './exports/index.ts',
    './exports/webgl.ts',
    './exports/canvas.ts',
    './exports/utils.ts',
  ],
  out: 'typedocs',
};
