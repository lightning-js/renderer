/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2024 Comcast Cable Communications Management, LLC.
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
import type { CoreContextTexture } from './renderers/CoreContextTexture.js';

export class TextureMemoryManager {
  private memUsed = 0;
  private textures: Map<CoreContextTexture, number> = new Map();
  private threshold: number;
  public gcRequested = false;

  /**
   * @param byteThreshold Number of texture bytes to trigger garbage collection
   */
  constructor(byteThreshold: number) {
    this.threshold = byteThreshold;

    // If the threshold is 0, we disable the memory manager by replacing the
    // setTextureMemUse method with a no-op function.
    if (byteThreshold === 0) {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      this.setTextureMemUse = () => {};
    }
  }

  setTextureMemUse(ctxTexture: CoreContextTexture, byteSize: number) {
    if (this.textures.has(ctxTexture)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.memUsed -= this.textures.get(ctxTexture)!;
    }

    if (byteSize === 0) {
      this.textures.delete(ctxTexture);
      return;
    } else {
      this.memUsed += byteSize;
      this.textures.set(ctxTexture, byteSize);
    }

    if (this.memUsed > this.threshold) {
      this.gcRequested = true;
    }
  }

  gc() {
    this.gcRequested = false;
    this.textures.forEach((byteSize, ctxTexture) => {
      if (!ctxTexture.renderable) {
        ctxTexture.free();
      }
    });
  }
}
