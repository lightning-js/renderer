/* global module */
/** @type {import('typedoc').TypeDocOptions} */
module.exports = {
  entryPoints: [
    './exports/index.ts',
    './exports/webgl.ts',
    './exports/webgl-shaders.ts',
    './exports/canvas.ts',
    './exports/canvas-shaders.ts',
    './exports/utils.ts',
  ],
  out: 'typedocs',
};
