/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2026 Comcast Cable Communications Management, LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import type { TextureMemoryManager } from '../../TextureMemoryManager.js';
import type { Texture, TextureData } from '../../textures/Texture.js';
import { CanvasTexture } from './CanvasTexture.js';

// capabilities.ts detects ImageBitmap at import time.
vi.hoisted(() => {
  const g = globalThis as any;
  g.ImageBitmap ??= class {};
  g.ImageData ??= class {};
  g.HTMLCanvasElement ??= class {};
  g.HTMLImageElement ??= class {};
});

function setup(textureData: TextureData) {
  const source = {
    textureData,
    state: 'loading',
    dimensions: null,
    setState: vi.fn(),
    freeTextureData: vi.fn(() => {
      const data = source.textureData;
      source.textureData = null;
      data?.release?.();
    }),
    takeTextureDataRelease: vi.fn(() => {
      const release = source.textureData?.release;
      if (source.textureData) source.textureData.release = undefined;
      return release;
    }),
  } as unknown as Texture;
  const ctxTexture = new CanvasTexture(mock<TextureMemoryManager>(), source);
  return { ctxTexture, source };
}

const bitmap = () =>
  Object.assign(new ImageBitmap(), { width: 2, height: 2 }) as ImageBitmap;

describe('CanvasTexture', () => {
  it('keeps an uploaded source alive until the context texture releases it', () => {
    const release = vi.fn();
    const { ctxTexture } = setup({ data: bitmap(), release });

    ctxTexture.load();
    expect(ctxTexture.hasImage()).toBe(true);
    expect(release).not.toHaveBeenCalled();

    ctxTexture.release();

    expect(ctxTexture.hasImage()).toBe(false);
    expect(release).toHaveBeenCalledTimes(1);
  });
});
