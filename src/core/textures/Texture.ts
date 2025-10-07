/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast Cable Communications Management, LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the License);
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
import type { SubTextureProps } from './SubTexture.js';
import type { Dimensions } from '../../common/CommonTypes.js';
import { EventEmitter } from '../../common/EventEmitter.js';
import type { CoreContextTexture } from '../renderers/CoreContextTexture.js';

/**
 * Event handler for when a Texture is freed
 */
export type TextureFreedEventHandler = (target: any) => void;

/**
 * Event handler for when a Texture is loading
 */
export type TextureLoadingEventHandler = (target: any) => void;

/**
 * Event handler for when a Texture is loaded
 */
export type TextureLoadedEventHandler = (
  target: any,
  dimensions: Readonly<Dimensions>,
) => void;

/**
 * Represents compressed texture data.
 */
interface CompressedData {
  /**
   * GLenum spcifying compression format
   */
  glInternalFormat: number;

  /**
   * All mipmap levels
   */
  mipmaps?: ArrayBuffer[];

  /**
   * Supported container types ('pvr' or 'ktx').
   */
  type: 'pvr' | 'ktx';

  /**
   * The width of the compressed texture in pixels. Defaults to 0.
   *
   * @default 0
   */
  width: number;

  /**
   * The height of the compressed texture in pixels.
   **/
  height: number;
}

/**
 * Event handler for when a Texture fails to load
 */
export type TextureFailedEventHandler = (target: any, error: Error) => void;

/**
 * TextureData that is used to populate a CoreContextTexture
 */
export interface TextureData {
  /**
   * The texture data
   */
  data:
    | ImageBitmap
    | ImageData
    | SubTextureProps
    | CompressedData
    | HTMLImageElement
    | Uint8Array
    | null;
  /**
   * Premultiply alpha when uploading texture data to the GPU
   *
   * @defaultValue `false`
   */
  premultiplyAlpha?: boolean | null;
}

export type TextureState =
  | 'initial' // Before anything is loaded
  | 'loading' // Loading texture data and uploading to GPU
  | 'loaded' // Fully loaded and usable
  | 'failed' // Failed to load
  | 'freed'; // Released and must be reloaded

export enum TextureType {
  'generic' = 0,
  'color' = 1,
  'image' = 2,
  'noise' = 3,
  'renderToTexture' = 4,
  'subTexture' = 5,
}

/**
 * Represents a source of texture data for a CoreContextTexture.
 *
 * @remarks
 * Texture sources are used to populate a CoreContextTexture when that texture
 * is loaded. Texture data retrieved by the CoreContextTexture by the
 * `getTextureData` method. It's the responsibility of the concerete `Texture`
 * subclass to implement this method appropriately.
 */
export abstract class Texture extends EventEmitter {
  /**
   * The dimensions of the texture
   *
   * @remarks
   * Until the texture data is loaded for the first time the value will be
   * `null`.
   */
  private _dimensions: Dimensions | null = null;
  private _error: Error | null = null;

  // aggregate state
  public state: TextureState = 'initial';

  readonly renderableOwners: any[] = [];

  readonly renderable: boolean = false;

  public type: TextureType = TextureType.generic;

  public preventCleanup = false;

  public ctxTexture: CoreContextTexture | undefined;

  public textureData: TextureData | null = null;

  /**
   * Memory used by this texture in bytes
   *
   * @remarks
   * This is tracked by the TextureMemoryManager and updated when the texture
   * is loaded/freed. Set to 0 when texture is not loaded.
   */
  public memUsed = 0;

  public retryCount = 0;
  public maxRetryCount: number;

  /**
   * Timestamp when texture was created (for startup grace period)
   */
  private createdAt: number = Date.now();

  /**
   * Flag to track if grace period has expired to avoid repeated Date.now() calls
   */
  private gracePeriodExpired: boolean = false;

  /**
   * Grace period in milliseconds to prevent premature cleanup during app startup
   * This helps prevent race conditions when bounds calculation is delayed
   */
  private static readonly STARTUP_GRACE_PERIOD = 2000; // 2 seconds

  constructor(protected txManager: CoreTextureManager) {
    super();
    this.maxRetryCount = txManager.maxRetryCount;
  }

  get dimensions(): Dimensions | null {
    return this._dimensions;
  }

  get error(): Error | null {
    return this._error;
  }

  /**
   * Checks if the texture is within the startup grace period.
   * During this period, textures are protected from cleanup to prevent
   * race conditions during app initialization.
   */
  isWithinStartupGracePeriod(): boolean {
    // If grace period already expired, return false immediately
    if (this.gracePeriodExpired) {
      return false;
    }

    // Check if grace period has expired now
    const hasExpired =
      Date.now() - this.createdAt >= Texture.STARTUP_GRACE_PERIOD;

    if (hasExpired) {
      // Cache the result to avoid future Date.now() calls
      this.gracePeriodExpired = true;
      return false;
    }

    return true;
  }

  /**
   * Checks if the texture can be safely cleaned up.
   * Considers the renderable state, startup grace period, and renderable owners.
   */
  canBeCleanedUp(): boolean {
    // Never cleanup if explicitly prevented
    if (this.preventCleanup) {
      return false;
    }

    // Don't cleanup if still within startup grace period
    if (this.isWithinStartupGracePeriod()) {
      return false;
    }

    // Don't cleanup if not renderable
    if (this.renderable === true) {
      return false;
    }

    // Don't cleanup if there are still renderable owners
    if (this.renderableOwners.length > 0) {
      return false;
    }

    // Safe to cleanup
    return true;
  }

  /**
   * Add/remove an owner to/from the Texture based on its renderability.
   *
   * @remarks
   * Any object can own a texture, be it a CoreNode or even the state object
   * from a Text Renderer.
   *
   * When the reference to the texture that an owner object holds is replaced
   * or cleared it must call this with `renderable=false` to release the owner
   * association.
   *
   * @param owner
   * @param renderable
   */
  setRenderableOwner(owner: string | number, renderable: boolean): void {
    const oldSize = this.renderableOwners.length;
    const hasOwnerIndex = this.renderableOwners.indexOf(owner);

    if (renderable === true) {
      if (hasOwnerIndex === -1) {
        // Add the owner to the set
        this.renderableOwners.push(owner);
      }

      const newSize = this.renderableOwners.length;
      if (oldSize !== newSize && newSize === 1) {
        (this.renderable as boolean) = true;
        this.onChangeIsRenderable?.(true);
        this.load();
      }
    } else {
      if (hasOwnerIndex !== -1) {
        this.renderableOwners.splice(hasOwnerIndex, 1);
      }

      const newSize = this.renderableOwners.length;
      if (oldSize !== newSize && newSize === 0) {
        (this.renderable as boolean) = false;
        this.onChangeIsRenderable?.(false);

        // note, not doing a cleanup here, cleanup is managed by the Stage/TextureMemoryManager
        // when it deems appropriate based on memory pressure
      }
    }
  }

  load(): void {
    if (this.retryCount > this.maxRetryCount) {
      // We've exceeded the max retry count, do not attempt to load again
      return;
    }

    this.txManager.loadTexture(this);
  }

  /**
   * Event called when the Texture becomes renderable or unrenderable.
   *
   * @remarks
   * Used by subclasses like SubTexture propogate then renderability of the
   * Texture to other referenced Textures.
   *
   * @param isRenderable `true` if this Texture has renderable owners.
   */
  onChangeIsRenderable?(isRenderable: boolean): void;

  /**
   * Load the core context texture for this Texture.
   * The ctxTexture is created by the renderer and lives on the GPU.
   *
   * @returns
   */
  loadCtxTexture(): CoreContextTexture {
    if (this.ctxTexture === undefined) {
      this.ctxTexture = this.txManager.renderer.createCtxTexture(this);
    }

    return this.ctxTexture;
  }

  /**
   * Free the core context texture for this Texture.
   *
   * @remarks
   * The ctxTexture is created by the renderer and lives on the GPU.
   */
  free(): void {
    this.ctxTexture?.free();
  }

  /**
   * Release the texture data and core context texture for this Texture without changing state.
   *
   * @remarks
   * The ctxTexture is created by the renderer and lives on the GPU.
   */
  release(): void {
    this.ctxTexture?.release();
    this.ctxTexture = undefined;
    this.freeTextureData();
  }

  /**
   * Destroy the texture.
   *
   * @remarks
   * This method is called when the texture is no longer needed and should be
   * cleaned up.
   */
  destroy(): void {
    // Only free GPU resources if we're in a state where they exist
    if (this.state === 'loaded') {
      this.free();
    }

    // Always free texture data regardless of state
    this.freeTextureData();
  }

  /**
   * Free the source texture data for this Texture.
   *
   * @remarks
   * The texture data is the source data that is used to populate the CoreContextTexture.
   * e.g. ImageData that is downloaded from a URL.
   */
  freeTextureData(): void {
    queueMicrotask(() => {
      this.textureData = null;
    });
  }

  public setState(
    state: TextureState,
    errorOrDimensions?: Error | Dimensions,
  ): void {
    if (this.state === state) {
      return;
    }

    let payload: Error | Dimensions | null = null;
    if (state === 'loaded') {
      // Clear any previous error when successfully loading
      this._error = null;

      if (
        errorOrDimensions !== undefined &&
        'width' in errorOrDimensions === true &&
        'height' in errorOrDimensions === true &&
        errorOrDimensions.width !== undefined &&
        errorOrDimensions.height !== undefined
      ) {
        this._dimensions = errorOrDimensions;
      }

      payload = this._dimensions;
    } else if (state === 'failed') {
      this._error = errorOrDimensions as Error;
      payload = this._error;

      // increment the retry count for the texture
      // this is used to compare against maxRetryCount, if set
      // to determine if we should try loading again
      this.retryCount += 1;

      queueMicrotask(() => {
        this.release();
      });
    } else if (state === 'loading') {
      // Clear error and reset dimensions when starting to load
      // This ensures stale dimensions from previous loads don't persist
      this._error = null;
      this._dimensions = null;
    } else {
      this._error = null;
    }

    // emit the new state
    this.state = state;
    this.emit(state, payload);
  }

  /**
   * Get the texture data for this texture.
   *
   * @remarks
   * This method is called by the CoreContextTexture when the texture is loaded.
   * The texture data is then used to populate the CoreContextTexture.
   *
   * @returns
   * The texture data for this texture.
   */
  async getTextureData(): Promise<TextureData> {
    if (this.textureData === null) {
      this.textureData = await this.getTextureSource();
    }

    return this.textureData;
  }

  /**
   * Get the texture source for this texture.
   *
   * @remarks
   * This method is called by the CoreContextTexture when the texture is loaded.
   * The texture source is then used to populate the CoreContextTexture.
   */
  abstract getTextureSource(): Promise<TextureData>;

  /**
   * Make a cache key for this texture.
   *
   * @remarks
   * Each concrete `Texture` subclass must implement this method to provide an
   * appropriate cache key for the texture type including the texture's
   * properties that uniquely identify a copy of the texture. If the texture
   * type does not support caching, then this method should return `false`.
   *
   * @param props
   * @returns
   * A cache key for this texture or `false` if the texture type does not
   * support caching.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static makeCacheKey(props: unknown): string | false {
    return false;
  }

  /**
   * Resolve the default values for the texture's properties.
   *
   * @remarks
   * Each concrete `Texture` subclass must implement this method to provide
   * default values for the texture's optional properties.
   *
   * @param props
   * @returns
   * The default values for the texture's properties.
   */
  static resolveDefaults(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    props: unknown,
  ): Record<string, unknown> {
    return {};
  }

  /**
   * Retry the texture by resetting retryCount and setting state to 'initial'.
   *
   * @remarks
   * This allows the texture to be loaded again.
   */
  public retry(): void {
    this.release();
    this.retryCount = 0;
    this.load();
  }
}
