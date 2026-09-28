const parsedArgbColors: Map<number, string> = new Map();
const parsedRgbaColors: Map<number, string> = new Map();

export function normalizeCanvasColor(rgbaColor: number) {
  let out = parsedRgbaColors.get(rgbaColor);
  if (out !== undefined) {
    return out;
  }
  const r = (rgbaColor >>> 24) & 0xff;
  const g = (rgbaColor >>> 16) & 0xff;
  const b = (rgbaColor >>> 8) & 0xff;
  const a = (rgbaColor & 0xff) / 255;
  out = `rgba(${r},${g},${b},${a})`;
  parsedRgbaColors.set(rgbaColor, out);
  return out;
}

export function normalizeCanvasColorArgb(argbColor: number) {
  let out = parsedArgbColors.get(argbColor);
  if (out !== undefined) {
    return out;
  }
  const a = ((argbColor >>> 24) & 0xff) / 255;
  const b = (argbColor >>> 16) & 0xff;
  const g = (argbColor >>> 8) & 0xff;
  const r = argbColor & 0xff;
  out = `rgba(${r},${g},${b},${a})`;
  parsedArgbColors.set(argbColor, out);
  return out;
}
