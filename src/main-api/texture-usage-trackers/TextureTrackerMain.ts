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
import type {
  ExtractProps,
  TextureMap,
  TextureOptions,
} from '../../core/CoreTextureManager.js';
import { Stage } from '../../core/Stage.js';
import {
  ManualCountTextureUsageTracker,
  type ManualCountTextureUsageTrackerOptions,
} from './ManualCountTextureUsageTracker.js';
import { FinalizationRegistryTextureUsageTracker } from './FinalizationRegistryTextureUsageTracker.js';
import type { TextureUsageTracker } from './TextureUsageTracker.js';
import { assertTruthy } from '../../utils.js';

/**
 * An immutable reference to a specific Texture type
 *
 * @remarks
 * See {@link TextureRef} for more details.
 */
export interface SpecificTextureRef<TxType extends keyof TextureMap> {
  readonly descType: 'texture';
  readonly txType: TxType;
  readonly props: ExtractProps<TextureMap[TxType]>;
  readonly options?: Readonly<TextureOptions>;
}

export interface TextureUsageTrackerOptions {
  useFinalizationRegistryTracker: boolean;
  textureCleanupOptions: ManualCountTextureUsageTrackerOptions;
}

type MapTextureRefs<TxType extends keyof TextureMap> =
  TxType extends keyof TextureMap ? SpecificTextureRef<TxType> : never;

/**
 * An immutable reference to a Texture
 *
 * @remarks
 * This structure should only be created by the RendererMain's `createTexture`
 * method. The structure is immutable and should not be modified once created.
 *
 * A `TextureRef` exists in the Main API Space and is used to point to an actual
 * `Texture` instance in the Core API Space. The `TextureRef` is used to
 * communicate with the Core API Space to create, load, and destroy the
 * `Texture` instance.
 *
 * This type is technically a discriminated union of all possible texture types.
 * If you'd like to represent a specific texture type, you can use the
 * `SpecificTextureRef` generic type.
 */
export type TextureRef = MapTextureRefs<keyof TextureMap>;

export class TextureTrackerMain {
  public textureTracker: TextureUsageTracker | null = null;
  private stage: Stage | null = null;
  private nextTextureId = 1;

  constructor(stage: Stage, options: TextureUsageTrackerOptions) {
    assertTruthy(stage);
    this.stage = stage;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { textureCleanupOptions, useFinalizationRegistryTracker } = options;

    this.textureTracker = useFinalizationRegistryTracker
      ? new FinalizationRegistryTextureUsageTracker(this.releaseCallback)
      : new ManualCountTextureUsageTracker(
          this.releaseCallback,
          textureCleanupOptions,
        );
  }

  releaseCallback = (textureId: number) => {
    const { stage } = this;
    assertTruthy(stage);
    stage.txManager.removeTextureIdFromCache(textureId);
  };

  createTexture<TxType extends keyof TextureMap>(
    textureType: TxType,
    props: SpecificTextureRef<TxType>['props'],
    options?: TextureOptions,
  ): SpecificTextureRef<TxType> {
    const { textureTracker } = this;
    assertTruthy(textureTracker);

    const id = this.nextTextureId++;
    const desc = {
      descType: 'texture',
      txType: textureType,
      props,
      options: {
        ...options,
        // This ID is used to identify the texture in the CoreTextureManager's
        // ID Texture Map cache.
        id,
      },
    } satisfies SpecificTextureRef<TxType>;

    textureTracker.registerTexture(desc as TextureRef);
    return desc;
  }

  decrementTextureRefCount(textureRef: TextureRef): void {
    const { textureTracker } = this;
    assertTruthy(textureTracker);
    textureTracker.decrementTextureRefCount(textureRef);
  }

  incrementTextureRefCount(textureRef: TextureRef): void {
    const { textureTracker } = this;
    assertTruthy(textureTracker);
    textureTracker.incrementTextureRefCount(textureRef);
  }
}
