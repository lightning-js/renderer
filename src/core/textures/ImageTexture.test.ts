import { describe, expect, it } from 'vitest';
import { isSvgImage } from './ImageTexture.js';

describe('isSvgImage', () => {
  it('recognizes SVG URLs with and without query parameters', () => {
    expect(isSvgImage('image.svg')).toBe(true);
    expect(isSvgImage('image.svg?size=100')).toBe(true);
    expect(isSvgImage('image.png')).toBe(false);
  });

  it('does not run the SVG regex on URLs longer than 1000 characters', () => {
    expect(isSvgImage('a'.repeat(996) + '.svg')).toBe(true);
    expect(isSvgImage('a'.repeat(997) + '.svg')).toBe(false);
    expect(isSvgImage('.svg?'.repeat(1000) + 'x')).toBe(false);
  });
});
