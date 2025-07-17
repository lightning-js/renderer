/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2025 Comcast Cable Communications Management, LLC.
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

import type { Stage } from '../../Stage.js';
import type { WebGlRenderer } from './WebGlRenderer.js';
import type { WebGlContextWrapper } from '../../lib/WebGlContextWrapper.js';

// Type definitions
interface PoolConfig {
  size: number;
  maxRegions: number;
  regionSize: number;
}

interface PoolRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  inUse: boolean;
  allocatedWidth: number;
  allocatedHeight: number;
}

export interface FramebufferRegion {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
  x: number;
  y: number;
  width: number;
  height: number;
  allocatedWidth: number;
  allocatedHeight: number;
  pool: FramebufferPool;
  region: PoolRegion;
}

/**
 * Individual framebuffer pool managing sub-regions
 */
class FramebufferPool {
  private glw: WebGlContextWrapper;
  private framebuffer!: WebGLFramebuffer;
  private texture!: WebGLTexture;
  private regions: PoolRegion[] = [];
  private freeRegions: PoolRegion[] = [];
  private size: number;
  private regionSize: number;
  private maxRegions: number;

  constructor(glw: WebGlContextWrapper, config: PoolConfig) {
    this.glw = glw;
    this.size = config.size;
    this.regionSize = config.regionSize;
    this.maxRegions = config.maxRegions;

    this.createFramebuffer();
    this.initializeRegions();
  }

  /**
   * Allocate a region from this pool
   */
  allocate(width: number, height: number): FramebufferRegion | null {
    // Early return if no free regions
    if (this.freeRegions.length === 0) {
      return null;
    }

    const region = this.freeRegions.pop();
    if (!region) {
      return null;
    }

    region.inUse = true;
    region.allocatedWidth = width;
    region.allocatedHeight = height;

    return {
      framebuffer: this.framebuffer,
      texture: this.texture,
      x: region.x,
      y: region.y,
      width: region.width,
      height: region.height,
      allocatedWidth: width,
      allocatedHeight: height,
      pool: this,
      region: region,
    };
  }

  /**
   * Free a region back to the pool
   */
  free(region: FramebufferRegion): void {
    const poolRegion = region.region;
    poolRegion.inUse = false;
    poolRegion.allocatedWidth = 0;
    poolRegion.allocatedHeight = 0;
    this.freeRegions.push(poolRegion);
  }

  /**
   * Get the number of available regions
   */
  get availableRegions(): number {
    return this.freeRegions.length;
  }

  /**
   * Get the total number of regions
   */
  get totalRegions(): number {
    return this.regions.length;
  }

  /**
   * Create the backing framebuffer and texture
   */
  private createFramebuffer(): void {
    const glw = this.glw;
    const size = this.size;

    // Create texture
    const texture = glw.createTexture();
    if (!texture) {
      throw new Error('Failed to create texture for framebuffer pool');
    }
    this.texture = texture;

    glw.bindTexture(texture);
    glw.texImage2D(
      0,
      glw.RGBA as number,
      size,
      size,
      0,
      glw.RGBA as number,
      glw.UNSIGNED_BYTE as number,
      null,
    );
    glw.texParameteri(glw.TEXTURE_MIN_FILTER as number, glw.LINEAR as number);
    glw.texParameteri(glw.TEXTURE_MAG_FILTER as number, glw.LINEAR as number);
    glw.texParameteri(
      glw.TEXTURE_WRAP_S as number,
      glw.CLAMP_TO_EDGE as number,
    );
    glw.texParameteri(
      glw.TEXTURE_WRAP_T as number,
      glw.CLAMP_TO_EDGE as number,
    );

    // Create framebuffer
    const framebuffer = glw.createFramebuffer();
    if (!framebuffer) {
      throw new Error('Failed to create framebuffer for framebuffer pool');
    }
    this.framebuffer = framebuffer;

    // Bind framebuffer and attach texture
    glw.bindFramebuffer(framebuffer);
    glw.framebufferTexture2D(glw.COLOR_ATTACHMENT0 as number, texture, 0);

    // Restore default bindings
    glw.bindFramebuffer(null);
    glw.bindTexture(null);
  }

  /**
   * Initialize the region grid
   */
  private initializeRegions(): void {
    const regionSize = this.regionSize;
    const size = this.size;
    const regionsPerRow = Math.floor(size / regionSize);

    let regionCount = 0;
    for (let y = 0; y < regionsPerRow && regionCount < this.maxRegions; y++) {
      for (let x = 0; x < regionsPerRow && regionCount < this.maxRegions; x++) {
        const region: PoolRegion = {
          x: x * regionSize,
          y: y * regionSize,
          width: regionSize,
          height: regionSize,
          inUse: false,
          allocatedWidth: 0,
          allocatedHeight: 0,
        };

        this.regions.push(region);
        this.freeRegions.push(region);
        regionCount++;
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.framebuffer) {
      this.glw.deleteFramebuffer(this.framebuffer);
    }
    if (this.texture) {
      this.glw.deleteTexture(this.texture);
    }
    this.regions.length = 0;
    this.freeRegions.length = 0;
  }
}

/**
 * High-performance framebuffer pool for SDF text rendering
 * Manages large framebuffers with sub-regions to avoid allocation overhead
 */
export class WebGlFramebufferPool {
  private stage: Stage;
  private glw: WebGlContextWrapper;
  private pools: Map<string, FramebufferPool> = new Map();

  // Pool configurations for different use cases
  private readonly poolConfigs: Record<string, PoolConfig> = {
    'sdf-text-small': { size: 2048, maxRegions: 64, regionSize: 256 },
    'sdf-text-medium': { size: 4096, maxRegions: 32, regionSize: 512 },
    'sdf-text-large': { size: 4096, maxRegions: 16, regionSize: 1024 },
  };

  constructor(stage: Stage) {
    this.stage = stage;
    this.glw = (stage.renderer as WebGlRenderer).glw;
  }

  /**
   * Allocate a sub-region from the appropriate pool
   */
  allocateRegion(width: number, height: number): FramebufferRegion | null {
    // Determine which pool to use based on size
    let poolKey = '';
    if (width <= 256 && height <= 256) {
      poolKey = 'sdf-text-small';
    } else if (width <= 512 && height <= 512) {
      poolKey = 'sdf-text-medium';
    } else if (width <= 1024 && height <= 1024) {
      poolKey = 'sdf-text-large';
    } else {
      // Too large for pooling, fallback to individual framebuffer
      console.warn(
        `Text size ${width}x${height} too large for framebuffer pooling`,
      );
      return null;
    }

    console.log(
      `WebGlFramebufferPool.allocateRegion: Using pool '${poolKey}' for ${width}x${height} text`,
    );

    // Get or create pool
    let pool = this.pools.get(poolKey);
    if (!pool) {
      const config = this.poolConfigs[poolKey];
      if (!config) {
        return null;
      }
      console.log(
        `WebGlFramebufferPool.allocateRegion: Creating new pool '${poolKey}' with config:`,
        config,
      );
      pool = this.createPool(config);
      this.pools.set(poolKey, pool);
    }

    const result = pool.allocate(width, height);
    console.log(
      `WebGlFramebufferPool.allocateRegion: Pool allocation result:`,
      result
        ? {
            x: result.x,
            y: result.y,
            width: result.width,
            height: result.height,
            allocatedWidth: result.allocatedWidth,
            allocatedHeight: result.allocatedHeight,
          }
        : 'null',
    );

    return result;
  }

  /**
   * Free a previously allocated region
   */
  freeRegion(region: FramebufferRegion): void {
    region.pool.free(region);
  }

  /**
   * Get pool statistics for debugging
   */
  getPoolStats(): Record<string, { available: number; total: number }> {
    const stats: Record<string, { available: number; total: number }> = {};

    for (const [poolKey, pool] of this.pools) {
      stats[poolKey] = {
        available: pool.availableRegions,
        total: pool.totalRegions,
      };
    }

    return stats;
  }

  /**
   * Create a new framebuffer pool
   */
  private createPool(config: PoolConfig): FramebufferPool {
    return new FramebufferPool(this.glw, config);
  }

  /**
   * Cleanup all pools and resources
   */
  destroy(): void {
    for (const pool of this.pools.values()) {
      pool.destroy();
    }
    this.pools.clear();
  }
}
