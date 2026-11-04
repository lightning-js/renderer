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
  /**
   * Stable cache key for the raster inputs (see {@link makeCanvasTextCacheKey}).
   *
   * @remarks
   * Textures created with equal keys share one raster via the texture
   * manager's keyCache — identical text in the same font/constraints uploads
   * and resides in GPU memory once no matter how many nodes use it. Omit (or
   * pass `null`) for an uncached, single-owner texture.
   */
  key?: string | null;
}

/**
 * Raster inputs that determine canvas text pixels.
 *
 * @remarks
 * Keep in sync with what `CanvasTextRenderer` consumes: `contain`,
 * `offsetY` and `verticalAlign` only affect node transforms (never pixels)
 * and are intentionally excluded, as is `color` for plain text (plain
 * rasters are white alpha masks tinted per node at draw time — rich text
 * bakes span colors, so it includes `color`).
 */
export interface CanvasTextCacheKeyProps {
  text: string;
  richText: boolean;
  fontFamily: string;
  fontStyle: string;
  fontSize: number;
  letterSpacing: number;
  lineHeight: number;
  textAlign: string;
  maxLines: number;
  overflowSuffix: string;
  wordBreak: string;
  maxWidth: number;
  maxHeight: number;
  color: number;
}

/**
 * Build a stable keyCache key for a canvas text raster.
 */
export function makeCanvasTextCacheKey(props: CanvasTextCacheKeyProps): string {
  return JSON.stringify([
    'CanvasText',
    props.richText === true ? 1 : 0,
    props.fontFamily,
    props.fontStyle,
    props.fontSize,
    props.letterSpacing,
    props.lineHeight,
    props.textAlign,
    props.maxLines,
    props.overflowSuffix,
    props.wordBreak,
    props.maxWidth,
    props.maxHeight,
    // Rich text bakes the node color into uncolored spans; plain text does not.
    props.richText === true ? props.color : 0,
    props.text,
  ]);
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

  /**
   * Release one owner's claim on this texture.
   *
   * @remarks
   * Drops `owner` from the renderable owners and aborts an in-flight load —
   * but only when no owner remains. A shared texture that other nodes still
   * need keeps loading untouched. GPU/data reclamation for unowned textures
   * happens through `TextureMemoryManager` cleanup, like image textures.
   */
  releaseOwner(owner: string | number): void {
    this.setRenderableOwner(owner, false);
    if (this.state === 'loading' && this.renderableOwners.size === 0) {
      this.cancel();
    }
  }

  override invalidateContext(): void {
    super.invalidateContext();
    this.disposeSource();
  }

  override destroy(): void {
    super.destroy();
    this.disposeSource();
  }

  // Textures with an explicit stable key (see makeCanvasTextCacheKey) are
  // shared via the manager's keyCache, which is stage-scoped; ownership is
  // tracked per node via renderableOwners. Key-less textures stay uncached.
  static override makeCacheKey(props: CanvasTextTextureProps): string | false {
    return props.key ?? false;
  }

  static override resolveDefaults(
    props: CanvasTextTextureProps,
  ): CanvasTextTextureProps {
    return {
      render: props.render,
      key: props.key ?? null,
    };
  }

  static z$__type__Props: CanvasTextTextureProps;
}
