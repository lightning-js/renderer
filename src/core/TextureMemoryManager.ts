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
import { isProductionEnvironment } from '../utils.js';
import type { Stage } from './Stage.js';
import type { Texture } from './textures/Texture.js';
import { bytesToMb } from './utils.js';

export interface TextureMemoryManagerSettings {
  /**
   * Critical Threshold (in bytes)
   *
   * @remarks
   * When the amount of memory used by textures exceeds this threshold,
   * the Renderer will immediately trigger a Texture Cleanup towards the
   * Target Threshold Level.
   *
   * When set to `0`, the Texture Memory Manager is disabled.
   *
   * @defaultValue `124e6` (118 MB)
   */
  criticalThreshold: number;

  /**
   * Target Threshold Level (as fraction of Critical Threshold)
   *
   * @remarks
   * This value is the fractional level of the Critical Threshold that the
   * Texture Memory Manager will attempt to maintain by cleaning up textures.
   * The Texture Memory Manager will attempt to keep the memory usage below
   * this level by freeing up non-renderable textures.
   *
   * Valid Range: 0.0 - 1.0
   *
   * @defaultValue `0.5`
   */
  targetThresholdLevel: number;

  /**
   * Interval between Texture Cleanups (in milliseconds)
   *
   * @remarks
   * Texture Memory Manager will perform a Texture Cleanup no more
   * frequently than this interval generally when the scene becomes idle.
   *
   * @defaultValue `30,000` (30 seconds)
   */
  cleanupInterval: number;

  /**
   * Whether or not to log debug information
   *
   * @defaultValue `false`
   */
  debugLogging: boolean;

  /**
   * Baseline memory allocation for the Texture Memory Manager
   *
   * @remarks
   * Baseline texture memory is an allocation of memory by simply having a 1080p WebGL context.
   * This will be used on top of the memory used by textures to determine when to trigger a cleanup.
   *
   * @defaultValue `25e6` (25 MB)
   */
  baselineMemoryAllocation: number;
}

export interface MemoryInfo {
  criticalThreshold: number;
  targetThreshold: number;
  renderableMemUsed: number;
  memUsed: number;
  renderableTexturesLoaded: number;
  loadedTextures: number;
  baselineMemoryAllocation: number;
}

/**
 * LRU (Least Recently Used) style memory manager for textures
 *
 * @remarks
 * This class is responsible for managing the memory usage of textures
 * in the Renderer. It keeps track of the memory used by each texture
 * and triggers a cleanup when the memory usage exceeds a critical
 * threshold (`criticalThreshold`).
 *
 * The cleanup process will free up non-renderable textures until the
 * memory usage is below a target threshold (`targetThresholdLevel`).
 *
 * The memory manager's clean up process will also be triggered when the
 * scene is idle for a certain amount of time (`cleanupInterval`).
 */
export class TextureMemoryManager {
  private memUsed = 0;
  private loadedTextures: Map<Texture, number> = new Map();
  private criticalThreshold: number;
  private targetThreshold: number;
  private cleanupInterval: number;
  private debugLogging: boolean;
  private lastCleanupTime = 0;
  public criticalCleanupRequested = false;
  /**
   * The current frame time in milliseconds
   *
   * @remarks
   * This is used to determine when to perform Idle Texture Cleanups.
   *
   * Set by stage via `updateFrameTime` method.
   */
  public frameTime = 0;

  constructor(private stage: Stage, settings: TextureMemoryManagerSettings) {
    const { criticalThreshold } = settings;
    this.criticalThreshold = Math.round(criticalThreshold);
    const targetFraction = Math.max(
      0,
      Math.min(1, settings.targetThresholdLevel),
    );
    this.targetThreshold = Math.round(criticalThreshold * targetFraction);
    this.cleanupInterval = settings.cleanupInterval;
    this.debugLogging = settings.debugLogging;
    this.memUsed = Math.round(settings.baselineMemoryAllocation);

    if (settings.debugLogging) {
      let lastMemUse = 0;
      setInterval(() => {
        if (lastMemUse !== this.memUsed) {
          lastMemUse = this.memUsed;
          console.log(
            `[TextureMemoryManager] Memory used: ${bytesToMb(
              this.memUsed,
            )} mb / ${bytesToMb(this.criticalThreshold)} mb (${(
              (this.memUsed / this.criticalThreshold) *
              100
            ).toFixed(1)}%)`,
          );
        }
      }, 1000);
    }

    // If the threshold is 0, we disable the memory manager by replacing the
    // setTextureMemUse method with a no-op function.
    if (criticalThreshold === 0) {
      this.setTextureMemUse = () => {};
    }
  }

  setTextureMemUse(texture: Texture, byteSize: number) {
    if (this.loadedTextures.has(texture)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.memUsed -= this.loadedTextures.get(texture)!;
    }

    if (byteSize === 0) {
      this.loadedTextures.delete(texture);
      return;
    } else {
      this.memUsed += byteSize;
      this.loadedTextures.set(texture, byteSize);
    }

    if (this.memUsed > this.criticalThreshold) {
      this.criticalCleanupRequested = true;
    }
  }

  checkCleanup() {
    return (
      this.criticalCleanupRequested ||
      (this.memUsed > this.targetThreshold &&
        this.frameTime - this.lastCleanupTime >= this.cleanupInterval)
    );
  }

  cleanup() {
    const critical = this.criticalCleanupRequested;
    this.lastCleanupTime = this.frameTime;
    this.criticalCleanupRequested = false;

    if (critical) {
      this.stage.queueFrameEvent('criticalCleanup', {
        memUsed: this.memUsed,
        criticalThreshold: this.criticalThreshold,
      });
    }

    if (this.debugLogging) {
      console.log(
        `[TextureMemoryManager] Cleaning up textures. Critical: ${critical}`,
      );
    }

    /**
     * Sort the loaded textures by renderability, then by last touch time.
     *
     * This will ensure that the array is ordered by the following:
     * - Non-renderable textures, starting at the least recently rendered
     * - Renderable textures, starting at the least recently rendered
     */
    const textures = [...this.loadedTextures.keys()].sort(
      (textureA, textureB) => {
        const txARenderable = textureA.renderable;
        const txBRenderable = textureB.renderable;
        if (txARenderable === txBRenderable) {
          return (
            textureA.lastRenderableChangeTime -
            textureB.lastRenderableChangeTime
          );
        } else if (txARenderable) {
          return 1;
        } else if (txBRenderable) {
          return -1;
        }
        return 0;
      },
    );

    // Free non-renderable textures until we reach the target threshold
    const memTarget = this.targetThreshold;
    const txManager = this.stage.txManager;
    for (const texture of textures) {
      if (texture.renderable) {
        // Stop at the first renderable texture (The rest are renderable because of the sort above)
        // We don't want to free renderable textures because they will just likely be reloaded in the next frame
        break;
      }
      if (texture.preventCleanup === false) {
        texture.free();
        txManager.removeTextureFromCache(texture);
      }
      if (this.memUsed <= memTarget) {
        // Stop once we've freed enough textures to reach under the target threshold
        break;
      }
    }

    if (this.memUsed >= this.criticalThreshold) {
      this.stage.queueFrameEvent('criticalCleanupFailed', {
        memUsed: this.memUsed,
        criticalThreshold: this.criticalThreshold,
      });

      if (this.debugLogging === true || isProductionEnvironment() === false) {
        console.warn(
          `[TextureMemoryManager] Memory usage above critical threshold after cleanup: ${this.memUsed}`,
        );
      }
    }
  }

  /**
   * Get the current texture memory usage information
   *
   * @remarks
   * This method is for debugging purposes and returns information about the
   * current memory usage of the textures in the Renderer.
   */
  getMemoryInfo(): MemoryInfo {
    let renderableTexturesLoaded = 0;
    const renderableMemUsed = [...this.loadedTextures.keys()].reduce(
      (acc, texture) => {
        renderableTexturesLoaded += texture.renderable ? 1 : 0;
        return (
          acc + (texture.renderable ? this.loadedTextures.get(texture)! : 0)
        );
      },
      0,
    );
    return {
      criticalThreshold: this.criticalThreshold,
      targetThreshold: this.targetThreshold,
      renderableMemUsed,
      memUsed: this.memUsed,
      renderableTexturesLoaded,
      loadedTextures: this.loadedTextures.size,
      baselineMemoryAllocation: this.memUsed - renderableMemUsed,
    };
  }
}
