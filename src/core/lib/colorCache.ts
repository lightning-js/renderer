import { parseToAbgrString, parseToRgbaString } from './colorParser.js';

const parsedArgbColors: Map<number, string> = new Map();
const parsedRgbaColors: Map<number, string> = new Map();

export function normalizeCanvasColor(rgbaColor: number) {
  let out = parsedRgbaColors.get(rgbaColor);
  if (out !== undefined) {
    return out;
  }

  out = parseToRgbaString(rgbaColor);
  parsedRgbaColors.set(rgbaColor, out);
  return out;
}

export function normalizeCanvasColorArgb(argbColor: number) {
  let out = parsedArgbColors.get(argbColor);
  if (out !== undefined) {
    return out;
  }

  out = parseToAbgrString(argbColor);
  parsedArgbColors.set(argbColor, out);
  return out;
}
