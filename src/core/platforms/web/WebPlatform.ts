/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2026 Comcast Cable Communications Management, LLC.
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

import { Platform, type PlatformSettings } from '../Platform.js';
import { ImageWorkerManager } from './lib/ImageWorker.js';
import type { Stage } from '../../Stage.js';
import {
  dataURIToBlob,
  isBase64Image,
  convertUrlToAbsolute,
  createWebGLContext,
} from './lib/utils.js';

import type { ImageResponse } from '../../textures/ImageTexture.js';
import { loadSvg } from './lib/textureSvg.js';
import { loadCompressedTexture } from './lib/textureCompression.js';
import { WebGlContextWrapper } from './WebGlContextWrapper.js';
import type { GlContextWrapper } from '../GlContextWrapper.js';

/**
 * make fontface add not show errors
 */
interface FontFaceSetWithAdd extends FontFaceSet {
  add(font: FontFace): void;
}

export class WebPlatform extends Platform {
  private useImageWorker: boolean;
  private imageWorkerManager: ImageWorkerManager | null = null;
  private hasWorker = !!self.Worker;

  constructor(settings: PlatformSettings = {}) {
    super(settings);

    const numImageWorkers = settings.numImageWorkers ?? 0;
    this.useImageWorker = numImageWorkers > 0 && this.hasWorker;

    if (this.useImageWorker === true) {
      this.imageWorkerManager = new ImageWorkerManager(numImageWorkers);
    }
  }

  ////////////////////////
  // Platform-specific methods
  ////////////////////////

  override createCanvas(): HTMLCanvasElement {
    return document.createElement('canvas');
  }

  override createContext(): GlContextWrapper {
    const gl = createWebGLContext(this.canvas!, this.settings.forceWebGL2);
    this.glw = new WebGlContextWrapper(gl);
    return this.glw;
  }

  override getElementById(id: string): HTMLElement | null {
    return document.getElementById(id);
  }

  ////////////////////////
  // Update loop
  ////////////////////////

  override startLoop(stage: Stage): void {
    let isIdle = false;
    let lastFrameTime = 0;

    const runLoop = (currentTime: number = 0) => {
      const targetFrameTime = stage.targetFrameTime;

      // Check if we should throttle this frame
      if (
        targetFrameTime > 0 &&
        currentTime - lastFrameTime < targetFrameTime
      ) {
        // Too early for next frame, schedule with setTimeout for precise timing
        const delay = targetFrameTime - (currentTime - lastFrameTime);
        setTimeout(() => requestAnimationFrame(runLoop), delay);
        return;
      }

      stage.updateFrameTime();
      stage.updateAnimations();

      if (!stage.hasSceneUpdates()) {
        // We still need to calculate the fps else it looks like the app is frozen
        stage.calculateFps();

        if (targetFrameTime > 0) {
          // Use setTimeout for throttled idle frames
          setTimeout(
            () => requestAnimationFrame(runLoop),
            Math.max(targetFrameTime, 16.666666666666668),
          );
        } else {
          // Use standard idle timeout when not throttling
          setTimeout(() => requestAnimationFrame(runLoop), 16.666666666666668);
        }

        if (isIdle === false) {
          stage.shManager.cleanup();
          stage.eventBus.emit('idle');
          isIdle = true;
        }

        if (stage.txMemManager.checkCleanup() === true) {
          stage.txMemManager.cleanup();
        }

        stage.flushFrameEvents();
        return;
      }

      isIdle = false;
      stage.drawFrame();
      stage.flushFrameEvents();

      // Schedule next frame
      if (targetFrameTime > 0) {
        // Use setTimeout + rAF combination for precise FPS control
        const nextFrameDelay = Math.max(
          0,
          targetFrameTime - (performance.now() - currentTime),
        );
        setTimeout(() => requestAnimationFrame(runLoop), nextFrameDelay);
      } else {
        // Use standard rAF when not throttling
        requestAnimationFrame(runLoop);
      }
    };
    requestAnimationFrame(runLoop);
  }

  ////////////////////////
  // Image handling
  ////////////////////////

  override fetch(url: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.responseType = '';
      xhr.onreadystatechange = function () {
        if (xhr.readyState == XMLHttpRequest.DONE) {
          // On most devices like WebOS and Tizen, the file protocol returns 0 while http(s) protocol returns 200
          if (xhr.status === 0 || xhr.status === 200) {
            resolve(xhr.response);
          } else {
            reject(xhr.statusText);
          }
        }
      };
      xhr.open('GET', url, true);
      xhr.send(null);
    });
  }

  override async createImage(
    blob: Blob,
    premultiplyAlpha: boolean | null,
    sx: number | null,
    sy: number | null,
    sw: number | null,
    sh: number | null,
  ): Promise<ImageResponse> {
    const hasAlphaChannel = premultiplyAlpha ?? blob.type.includes('image/png');

    if (sw !== null && sh !== null) {
      // createImageBitmap with crop
      const bitmap = await createImageBitmap(blob, sx || 0, sy || 0, sw, sh, {
        premultiplyAlpha: hasAlphaChannel ? 'premultiply' : 'none',
        colorSpaceConversion: 'none',
        imageOrientation: 'none',
      });
      return { data: bitmap, premultiplyAlpha: hasAlphaChannel };
    }

    // default createImageBitmap without crop but with options
    const bitmap = await createImageBitmap(blob, {
      premultiplyAlpha: hasAlphaChannel ? 'premultiply' : 'none',
      colorSpaceConversion: 'none',
      imageOrientation: 'none',
    });

    return { data: bitmap, premultiplyAlpha: hasAlphaChannel };
  }

  override async loadImage(
    src: string,
    premultiplyAlpha: boolean | null,
    sx?: number | null,
    sy?: number | null,
    sw?: number | null,
    sh?: number | null,
  ): Promise<ImageResponse> {
    const isBase64 = isBase64Image(src);
    const absoluteSrc = convertUrlToAbsolute(src);
    const x = sx ?? null;
    const y = sy ?? null;
    const width = sw ?? null;
    const height = sh ?? null;

    // check if image worker is enabled
    if (this.imageWorkerManager !== null && isBase64 === false) {
      return this.imageWorkerManager.getImage(
        absoluteSrc,
        premultiplyAlpha,
        x,
        y,
        width,
        height,
      );
    }

    // fallback to main thread loading
    let blob: Blob;
    if (isBase64Image(src) === true) {
      blob = dataURIToBlob(src);
    } else {
      blob = await this.fetch(absoluteSrc);
    }

    return this.createImage(blob, premultiplyAlpha, x, y, width, height);
  }

  override async loadSvg(
    src: string,
    width: number | null,
    height: number | null,
    sx?: number | null,
    sy?: number | null,
    sw?: number | null,
    sh?: number | null,
  ): Promise<ImageResponse> {
    return loadSvg(
      convertUrlToAbsolute(src),
      width,
      height,
      sx ?? null,
      sy ?? null,
      sw ?? null,
      sh ?? null,
    );
  }

  override async loadCompressedTexture(src: string): Promise<ImageResponse> {
    return loadCompressedTexture(convertUrlToAbsolute(src));
  }

  ////////////////////////
  // Utilities
  ////////////////////////

  getTimeStamp(): number {
    return performance ? performance.now() : Date.now();
  }

  override addFont(font: FontFace): void {
    (document.fonts as FontFaceSetWithAdd).add(font);
  }
}
