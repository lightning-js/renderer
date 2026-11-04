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

import type { CoreTextureManager } from '../CoreTextureManager.js';
import { Texture, TextureType, type TextureData } from './Texture.js';
import { hasImageBitmap } from '../platforms/capabilities.js';

export interface CanvasTextTextureProps {
  /** Create a fresh pixel source for each load, including after eviction or context loss. */
  render: () => ImageBitmap | HTMLCanvasElement | null;
}

/**
 * Rasterized canvas text with a regenerable source. The draw callback must
 * capture a snapshot of the text layout, not a mutable CoreTextNode's props.
 *
 * This uses the image type so the existing upload queue, context restore,
 * memory cleanup, and Canvas2D renderer all treat it as an image texture.
 */
export class CanvasTextTexture extends Texture {
  public override type: TextureType = TextureType.image;
  public props: CanvasTextTextureProps;
  private imageSource: ImageBitmap | HTMLCanvasElement | null = null;

  constructor(txManager: CoreTextureManager, props: CanvasTextTextureProps) {
    super(txManager);
    this.props = props;
  }

  override getTextureSource(): TextureData {
    // A previous upload can have scheduled source cleanup for the next
    // microtask. If we reload before it runs, release the previous source now
    // and don't let that cleanup dispose the new source instead.
    this.disposeSource();
    this.imageSource = this.props.render();
    return { data: this.imageSource, premultiplyAlpha: true };
  }

  private disposeSource(): void {
    const source = this.imageSource;
    this.imageSource = null;
    if (source === null) return;
    if (hasImageBitmap === true && source instanceof ImageBitmap) {
      source.close?.();
    } else {
      const sourceCanvas = source as HTMLCanvasElement;
      sourceCanvas.width = 0;
      sourceCanvas.height = 0;
    }
  }

  override freeTextureData(): void {
    // WebGL has finished reading the source synchronously by the time it
    // requests this cleanup. Canvas2D keeps the image as its display source,
    // so it can only be released when its context texture is freed.
    if (this.txManager.renderer?.mode !== 'canvas') {
      const generation = this.loadGeneration;
      const source = this.imageSource;
      queueMicrotask(() => {
        if (generation === this.loadGeneration && this.imageSource === source) {
          this.disposeSource();
        }
      });
    }
    super.freeTextureData();
  }

  override free(): void {
    super.free();
    this.disposeSource();
  }

  override invalidateContext(): void {
    super.invalidateContext();
    this.disposeSource();
  }

  override destroy(): void {
    super.destroy();
    this.disposeSource();
  }

  // Avoid sharing a texture until redraw inputs, stage scope, and ownership
  // can be represented safely by a stable cache key.
  static override makeCacheKey(_props: CanvasTextTextureProps): false {
    return false;
  }

  static override resolveDefaults(
    props: CanvasTextTextureProps,
  ): CanvasTextTextureProps {
    return props;
  }

  static z$__type__Props: CanvasTextTextureProps;
}
