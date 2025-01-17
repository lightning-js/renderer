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
  | 'initial'
  | 'freed'
  | 'loading'
  | 'loaded'
  | 'failed';

export enum TextureType {
  'generic' = 0,
  'color' = 1,
  'image' = 2,
  'noise' = 3,
  'renderToTexture' = 4,
  'subTexture' = 5,
}

export interface TextureStateEventMap {
  freed: TextureFreedEventHandler;
  loading: TextureLoadingEventHandler;
  loaded: TextureLoadedEventHandler;
  failed: TextureFailedEventHandler;
}

export type UpdateType = 'source' | 'coreCtx';

/**
 * Like the built-in Parameters<> type but skips the first parameter (which is
 * `target` currently)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ParametersSkipTarget<T extends (...args: any) => any> = T extends (
  target: any,
  ...args: infer P
) => any
  ? P
  : never;

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
  readonly dimensions: Readonly<Dimensions> | null = null;

  readonly error: Error | null = null;

  // aggregate state
  public state: TextureState = 'initial';
  // texture source state
  private sourceState: TextureState = 'initial';
  // texture (gpu) state
  private coreCtxState: TextureState = 'initial';

  readonly renderableOwners = new Set<unknown>();

  readonly renderable: boolean = false;

  readonly lastRenderableChangeTime = 0;

  public type: TextureType = TextureType.generic;

  public preventCleanup = false;

  public ctxTexture: CoreContextTexture | undefined;

  public textureData: TextureData | null = null;

  constructor(protected txManager: CoreTextureManager) {
    super();
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
  setRenderableOwner(owner: unknown, renderable: boolean): void {
    const oldSize = this.renderableOwners.size;

    if (renderable === true) {
      if (this.renderableOwners.has(owner) === false) {
        // Add the owner to the set
        this.renderableOwners.add(owner);
      }

      const newSize = this.renderableOwners.size;
      if (newSize > oldSize && newSize === 1) {
        (this.renderable as boolean) = true;
        (this.lastRenderableChangeTime as number) = this.txManager.frameTime;
        this.onChangeIsRenderable?.(true);

        // Check if the texture needs to be added to the loading queue
        if (this.state === 'freed' || this.state === 'initial') {
          this.txManager.loadTexture(this);
        }
      }
    } else {
      this.renderableOwners.delete(owner);
      const newSize = this.renderableOwners.size;
      if (newSize < oldSize && newSize === 0) {
        (this.renderable as boolean) = false;
        (this.lastRenderableChangeTime as number) = this.txManager.frameTime;
        this.onChangeIsRenderable?.(false);
      }
    }
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
    if (this.textureData !== null) {
      this.textureData = null;
      this.setSourceState('freed');
    }
  }

  private setState(
    state: TextureState,
    type: UpdateType,
    errorOrDimensions?: Error | Dimensions,
  ): void {
    const stateObj = type === 'source' ? 'sourceState' : 'coreCtxState';

    if (this[stateObj] === state) {
      return;
    }

    this[stateObj] = state;

    if (state === 'loaded') {
      (this.dimensions as Dimensions) = errorOrDimensions as Dimensions;
    } else if (state === 'failed') {
      (this.error as Error) = errorOrDimensions as Error;
    }

    this.updateState();
  }

  /**
   * Set the source state of the texture
   *
   * @remarks
   * The source of the texture can either be generated by the texture itself or
   * loaded from an external source.
   *
   * @param state State of the texture
   * @param errorOrDimensions Error or dimensions of the texture
   */
  public setSourceState(
    state: TextureState,
    errorOrDimensions?: Error | Dimensions,
  ): void {
    this.setState(state, 'source', errorOrDimensions);
  }

  /**
   * Set the core context state of the texture
   *
   * @remarks
   * The core context state of the texture is the state of the texture on the GPU.
   *
   * @param state State of the texture
   * @param errorOrDimensions Error or dimensions of the texture
   */
  public setCoreCtxState(
    state: TextureState,
    errorOrDimensions?: Error | Dimensions,
  ): void {
    this.setState(state, 'coreCtx', errorOrDimensions);
  }

  private updateState(): void {
    const ctxState = this.coreCtxState;
    const sourceState = this.sourceState;

    let newState: TextureState = 'freed';
    let payload: Error | Dimensions | null = null;

    if (sourceState === 'failed' || ctxState === 'failed') {
      newState = 'failed';
      payload = this.error; // Error set by the source
    } else if (sourceState === 'loading' || ctxState === 'loading') {
      newState = 'loading';
    } else if (sourceState === 'loaded' && ctxState === 'loaded') {
      newState = 'loaded';
      payload = this.dimensions; // Dimensions set by the source
    } else if (
      (sourceState === 'loaded' && ctxState === 'freed') ||
      (ctxState === 'loaded' && sourceState === 'freed')
    ) {
      // If one is loaded and the other is freed, then we are in a loading state
      newState = 'loading';
    } else {
      newState = 'freed';
    }

    if (this.state === newState) {
      return;
    }

    // emit the new state
    this.state = newState;
    this.emit(newState, payload);
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
}
