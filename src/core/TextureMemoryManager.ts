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
import { TextureType, type Texture } from './textures/Texture.js';
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
   * Interval between non-aggressive Texture Cleanups (in milliseconds)
   *
   * @remarks
   * Texture Memory Manager will perform a non aggressive Texture Cleanup no more
   * frequently than this interval when the scene becomes idle.
   *
   * @defaultValue `5,000` (5 seconds)
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

  /**
   * Do not exceed critical threshold
   *
   * @defaultValue `false`
   */
  doNotExceedCriticalThreshold: boolean;
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
  private orphanedTextures: Texture[] = [];
  private criticalThreshold: number = 124e6;
  private targetThreshold: number = 0.5;
  private cleanupInterval: number = 5000;
  private debugLogging: boolean = false;
  private loggingID: ReturnType<typeof setInterval> =
    0 as unknown as ReturnType<typeof setInterval>;
  private lastCleanupTime = 0;
  private baselineMemoryAllocation: number = 26e6;

  public criticalCleanupRequested = false;
  public doNotExceedCriticalThreshold: boolean = false;
  private originalSetTextureMemUse: (
    texture: Texture,
    byteSize: number,
  ) => void;

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
    this.originalSetTextureMemUse = this.setTextureMemUse;

    this.updateSettings(settings);
  }

  /**
   * Add a texture to the orphaned textures list
   *
   * @param texture - The texture to add to the orphaned textures list
   */
  addToOrphanedTextures(texture: Texture) {
    // if the texture is already in the orphaned textures list add it at the end
    if (this.orphanedTextures.includes(texture)) {
      this.removeFromOrphanedTextures(texture);
    }

    // If the texture can be cleaned up, add it to the orphaned textures list
    if (texture.preventCleanup === false) {
      this.orphanedTextures.push(texture);
    }
  }

  /**
   * Remove a texture from the orphaned textures list
   *
   * @param texture - The texture to remove from the orphaned textures list
   */
  removeFromOrphanedTextures(texture: Texture) {
    const index = this.orphanedTextures.indexOf(texture);
    if (index !== -1) {
      this.orphanedTextures.splice(index, 1);
    }
  }

  /**
   * Set the memory usage of a texture
   *
   * @param texture - The texture to set memory usage for
   * @param byteSize - The size of the texture in bytes
   */
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

  checkCriticalCleanup() {
    return this.memUsed > this.criticalThreshold;
  }

  cleanupQuick(critical: boolean) {
    // Free non-renderable textures until we reach the target threshold
    const platform = this.stage.platform;
    const memTarget = this.targetThreshold;
    const timestamp = platform.getTimeStamp();

    while (
      this.memUsed >= memTarget &&
      this.orphanedTextures.length > 0 &&
      (critical || platform.getTimeStamp() - timestamp < 10)
    ) {
      const texture = this.orphanedTextures.shift();

      if (texture === undefined) {
        continue;
      }

      if (texture.renderable === true) {
        // If the texture is renderable, we can't free it up
        continue;
      }

      this.destroyTexture(texture);
    }
  }

  /**
   * Destroy a texture and remove it from the memory manager
   *
   * @param texture - The texture to destroy
   */
  destroyTexture(texture: Texture) {
    const txManager = this.stage.txManager;
    txManager.removeTextureFromQueue(texture);
    txManager.removeTextureFromCache(texture);

    texture.destroy();

    this.removeFromOrphanedTextures(texture);
    this.loadedTextures.delete(texture);
  }
  cleanupDeep(critical: boolean) {
    // Free non-renderable textures until we reach the target threshold
    const memTarget = critical ? this.criticalThreshold : this.targetThreshold;

    // sort by renderability
    const filteredAndSortedTextures: Texture[] = [];
    const textures = [...this.loadedTextures.keys()];
    for (let i = 0; i < textures.length; i++) {
      const texture = textures[i];
      if (texture === undefined) {
        continue;
      }

      if (
        texture.type === TextureType.image ||
        texture.type === TextureType.noise ||
        texture.type === TextureType.renderToTexture
      ) {
        if (texture.renderable === true) {
          filteredAndSortedTextures.push(texture);
        } else {
          filteredAndSortedTextures.unshift(texture);
        }
      }
    }

    while (this.memUsed >= memTarget && filteredAndSortedTextures.length > 0) {
      const texture = filteredAndSortedTextures.shift();
      if (texture === undefined) {
        continue;
      }

      if (texture.preventCleanup === true) {
        continue;
      }

      if (texture.renderable === true) {
        break;
      }

      this.destroyTexture(texture);
    }
  }

  cleanup(aggressive: boolean = false) {
    const critical = this.criticalCleanupRequested;
    const criticalThreshold = this.criticalThreshold;
    const memUsed = this.memUsed;
    const stage = this.stage;
    this.lastCleanupTime = this.frameTime;

    if (critical === true) {
      stage.queueFrameEvent('criticalCleanup', {
        memUsed: this.memUsed,
        criticalThreshold: criticalThreshold,
      });
    }

    if (this.debugLogging === true) {
      console.log(
        `[TextureMemoryManager] Cleaning up textures. Critical: ${critical}. Aggressive: ${aggressive}`,
      );
    }

    // try a quick cleanup first
    this.cleanupQuick(critical);

    // if we're still above the target threshold, do a deep cleanup
    if (aggressive === true && memUsed >= criticalThreshold) {
      this.cleanupDeep(critical);
    }

    if (memUsed >= criticalThreshold) {
      stage.queueFrameEvent('criticalCleanupFailed', {
        memUsed: memUsed,
        criticalThreshold: criticalThreshold,
      });

      if (this.debugLogging === true || isProductionEnvironment === false) {
        console.warn(
          `[TextureMemoryManager] Memory usage above critical threshold after cleanup: ${memUsed}`,
        );
      }
    } else {
      this.criticalCleanupRequested = false;
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
      this.baselineMemoryAllocation,
    );

    return {
      criticalThreshold: this.criticalThreshold,
      targetThreshold: this.targetThreshold,
      renderableMemUsed,
      memUsed: this.memUsed,
      renderableTexturesLoaded,
      loadedTextures: this.loadedTextures.size,
      baselineMemoryAllocation: this.baselineMemoryAllocation,
    };
  }

  public updateSettings(settings: TextureMemoryManagerSettings): void {
    const { criticalThreshold, doNotExceedCriticalThreshold } = settings;

    this.doNotExceedCriticalThreshold = doNotExceedCriticalThreshold || false;
    this.criticalThreshold = Math.round(criticalThreshold);

    if (this.memUsed === 0) {
      this.memUsed = Math.round(settings.baselineMemoryAllocation);
    } else {
      const memUsedExBaseline = this.memUsed - this.baselineMemoryAllocation;
      this.memUsed = Math.round(
        settings.baselineMemoryAllocation + memUsedExBaseline,
      );
    }
    this.baselineMemoryAllocation = Math.round(
      settings.baselineMemoryAllocation,
    );
    const targetFraction = Math.max(
      0,
      Math.min(1, settings.targetThresholdLevel),
    );
    this.targetThreshold = Math.max(
      Math.round(criticalThreshold * targetFraction),
      this.baselineMemoryAllocation,
    );

    this.cleanupInterval = settings.cleanupInterval;
    this.debugLogging = settings.debugLogging;

    if (this.loggingID && !settings.debugLogging) {
      clearInterval(this.loggingID);
      this.loggingID = 0 as unknown as ReturnType<typeof setInterval>;
    }
    if (settings.debugLogging && !this.loggingID) {
      let lastMemUse = 0;
      this.loggingID = setInterval(() => {
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
    } else {
      this.setTextureMemUse = this.originalSetTextureMemUse;
    }
  }
}
