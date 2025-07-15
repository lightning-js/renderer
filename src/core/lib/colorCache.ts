import { parseToAbgrString, parseToRgbaString } from './colorParser.js';

const parsedArgbColors: Map<number, string> = new Map();
const parsedRgbaColors: Map<number, string> = new Map();

export function normalizeCanvasColor(color: number, isRGBA: boolean = false) {
  let targetCache = isRGBA === true ? parsedRgbaColors : parsedArgbColors;
  let out = targetCache.get(color);
  if (out !== undefined) {
    return out;
  }

  if (isRGBA === true) {
    out = parseToRgbaString(color);
  } else {
    out = parseToAbgrString(color);
  }
  targetCache.set(color, out);
  return out;
}
