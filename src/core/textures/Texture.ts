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
    | null;
  /**
   * Premultiply alpha when uploading texture data to the GPU
   *
   * @defaultValue `false`
   */
  premultiplyAlpha?: boolean | null;
}

export type TextureState = 'freed' | 'loading' | 'loaded' | 'failed';

export interface TextureStateEventMap {
  freed: TextureFreedEventHandler;
  loading: TextureLoadingEventHandler;
  loaded: TextureLoadedEventHandler;
  failed: TextureFailedEventHandler;
}

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

  readonly state: TextureState = 'freed';

  readonly renderableOwners = new Set<unknown>();

  readonly renderable: boolean = false;

  readonly lastRenderableChangeTime = 0;

  public preventCleanup = false;

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
    if (renderable) {
      this.renderableOwners.add(owner);
      const newSize = this.renderableOwners.size;
      if (newSize > oldSize && newSize === 1) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        (this.renderable as boolean) = true;
        (this.lastRenderableChangeTime as number) = this.txManager.frameTime;
        this.onChangeIsRenderable?.(true);
      }
    } else {
      this.renderableOwners.delete(owner);
      const newSize = this.renderableOwners.size;
      if (newSize < oldSize && newSize === 0) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
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
   * Get the CoreContextTexture for this Texture
   *
   * @remarks
   * Each Texture has a corresponding CoreContextTexture that is used to
   * manage the texture's native data depending on the renderer's mode
   * (WebGL, Canvas, etc).
   *
   * The Texture and CoreContextTexture are always linked together in a 1:1
   * relationship.
   */
  get ctxTexture() {
    // The first time this is called, create the ctxTexture
    const ctxTexture = this.txManager.renderer.createCtxTexture(this);
    // And replace this getter with the value for future calls
    Object.defineProperty(this, 'ctxTexture', { value: ctxTexture });
    return ctxTexture;
  }

  /**
   * Set the state of the texture
   *
   * @remark
   * Intended for internal-use only but declared public so that it can be set
   * by it's associated {@link CoreContextTexture}
   *
   * @param state
   * @param args
   */
  setState<State extends TextureState>(
    state: State,
    ...args: ParametersSkipTarget<TextureStateEventMap[State]>
  ): void {
    if (this.state !== state) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      (this.state as TextureState) = state;
      if (state === 'loaded') {
        const loadedArgs = args as ParametersSkipTarget<
          TextureStateEventMap['loaded']
        >;
        (this.dimensions as Dimensions) = loadedArgs[0];
      } else if (state === 'failed') {
        const failedArgs = args as ParametersSkipTarget<
          TextureStateEventMap['failed']
        >;
        (this.error as Error) = failedArgs[0];
      }
      this.emit(state, ...args);
    }
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
  abstract getTextureData(): Promise<TextureData>;

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
