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
import {
  ImageWorkerManager,
  type ImageWorkerFactory,
} from './lib/ImageWorker.js';
import { createImageWorker } from './lib/ImageWorkerDefault.js';
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
  add(font: FontFace): this;
}

export class WebPlatform extends Platform {
  private useImageWorker: boolean;
  private readonly numImageWorkers: number;
  private _imageWorkerManager: ImageWorkerManager | null = null;
  private hasWorker = !!self.Worker;
  private loopGeneration = 0;
  private frameHandle: number | null = null;
  private timerHandle: ReturnType<typeof setTimeout> | null = null;
  private detachContextEvents: (() => void) | null = null;

  constructor(settings: PlatformSettings = {}) {
    super(settings);

    this.numImageWorkers = settings.numImageWorkers ?? 0;
    this.useImageWorker = this.numImageWorkers > 0 && this.hasWorker;
  }

  /**
   * Image worker pool, created on first image load.
   *
   * @remarks
   * The pool object itself is free (no workers spawn until the first image);
   * workers then grow on demand up to `numImageWorkers` (see
   * {@link ImageWorkerManager}). Image decoding is asynchronous and off the
   * frame path either way.
   */
  private get imageWorkerManager(): ImageWorkerManager | null {
    if (this._imageWorkerManager === null && this.useImageWorker === true) {
      this._imageWorkerManager = this.createImageWorkerManager(
        this.numImageWorkers,
      );
    }
    return this._imageWorkerManager;
  }

  protected createImageWorkerManager(
    numImageWorkers: number,
  ): ImageWorkerManager {
    return new ImageWorkerManager(
      numImageWorkers,
      this.getImageWorkerFactory(),
    );
  }

  protected getImageWorkerFactory(): ImageWorkerFactory {
    return createImageWorker;
  }

  ////////////////////////
  // Platform-specific methods
  ////////////////////////

  override createCanvas() {
    return document.createElement('canvas');
  }

  override createOffscreenCanvas() {
    if (typeof OffscreenCanvas !== 'undefined') {
      return new OffscreenCanvas(0, 0);
    }
    return null;
  }

  override createContext(): GlContextWrapper {
    if (this.canvas === null) {
      throw new Error('Canvas has not been created yet.');
    }

    const gl = createWebGLContext(this.canvas, this.settings.forceWebGL2);
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
    if (this.detachContextEvents !== null) this.detachContextEvents();
    if (stage.renderer.mode === 'webgl' && this.canvas !== null) {
      const canvas = this.canvas;
      const onLost = (event: Event) => {
        event.preventDefault();
        // Loop invalidation happens inside Stage.onContextLost via
        // suspendFrameLoop(), so GL-error and canvas paths share one bump.
        stage.onContextLost();
      };
      const onRestored = () => {
        if (stage.contextState !== 'lost' && stage.contextState !== 'failed')
          return;
        if (stage.onContextRestored() !== true) return;
        this.scheduleRecoveryFrame(stage);
      };
      canvas.addEventListener('webglcontextlost', onLost);
      canvas.addEventListener('webglcontextrestored', onRestored);
      this.detachContextEvents = () => {
        canvas.removeEventListener('webglcontextlost', onLost);
        canvas.removeEventListener('webglcontextrestored', onRestored);
      };
      // Reconcile loss/restore that happened while stopped and detached:
      // a missed `webglcontextlost` without preventDefault may never fire
      // `webglcontextrestored`, so poll once here instead of per-frame.
      if (this.glw !== null && this.glw !== undefined) {
        const glLost = this.glw.isContextLost();
        if (glLost === true && stage.contextState === 'running') {
          stage.onContextLost();
        } else if (
          glLost === false &&
          (stage.contextState === 'lost' || stage.contextState === 'failed')
        ) {
          if (stage.onContextRestored() === true) {
            this.cancelScheduledFrame();
            this.scheduleRecoveryFrame(stage);
            return;
          }
        }
      }
    }
    this.cancelScheduledFrame();
    const generation = ++this.loopGeneration;
    let isIdle = false;
    let lastFrameTime = 0;

    // Intentionally `try`-free: app callbacks on this path are isolated at
    // their boundaries (Stage.updateFrameTime/ flushFrameEvents via emitSafe,
    // AnimationManager/CoreAnimation via emitSafe + safe easing). A bad client
    // callback therefore never propagates here, so the scheduling below always
    // runs. Internal renderer errors still throw loudly (fail fast) instead of
    // being swallowed as app errors.
    const scheduleFrame = (delay?: number) => {
      if (delay !== undefined) {
        this.timerHandle = setTimeout(() => {
          this.timerHandle = null;
          // A timeout may fire after loss or stopLoop; never enqueue its old rAF.
          if (generation === this.loopGeneration) {
            this.frameHandle = requestAnimationFrame(runLoop);
          }
        }, delay);
      } else {
        this.frameHandle = requestAnimationFrame(runLoop);
      }
    };

    const runLoop = (currentTime: number = 0) => {
      // Canceled/previous loops can still have queued callbacks; only the
      // current loop may draw, and a lost context cannot accept GPU work.
      if (generation !== this.loopGeneration) return;
      this.frameHandle = null;
      if (stage.contextState !== 'running') return;
      const targetFrameTime = stage.targetFrameTime;

      // Check if we should throttle this frame
      if (
        targetFrameTime > 0 &&
        currentTime - lastFrameTime < targetFrameTime
      ) {
        // Too early for next frame, schedule with setTimeout for precise timing
        const delay = targetFrameTime - (currentTime - lastFrameTime);
        scheduleFrame(delay);
        return;
      }

      stage.updateFrameTime();
      // frameTick handlers run synchronously and may destroy/suspend the stage.
      if (stage.contextState !== 'running') return;
      stage.updateAnimations();
      // Animation callbacks can do the same before scene traversal begins.
      if (stage.contextState !== 'running') return;

      if (stage.hasSceneUpdates() === false) {
        // We still need to calculate the fps else it looks like the app is frozen
        stage.calculateFps();

        if (targetFrameTime > 0) {
          // Use setTimeout for throttled idle frames
          scheduleFrame(Math.max(targetFrameTime, 16.666666666666668));
        } else {
          // Use standard idle timeout when not throttling
          scheduleFrame(16.666666666666668);
        }

        if (isIdle === false) {
          stage.shManager.cleanup();
          stage.eventBus.emitSafe(
            'idle',
            undefined,
            stage.platform.settings.handleLoopError,
          );
          isIdle = true;
        }

        // An idle listener may have suspended or destroyed the stage; skip
        // GPU-backed cleanup and queued events in that case.
        if (stage.contextState !== 'running') return;

        if (stage.txMemManager.checkCleanup() === true) {
          stage.txMemManager.cleanup();
        }

        stage.flushFrameEvents();
        return;
      }

      if (isIdle === true) {
        stage.eventBus.emitSafe(
          'active',
          undefined,
          stage.platform.settings.handleLoopError,
        );
        isIdle = false;
      }

      stage.drawFrame();
      // A loss detected during rendering must not flush frame events.
      if (stage.contextState !== 'running') return;
      stage.flushFrameEvents();
      // Event handlers can stop/restart the loop without changing contextState.
      // Do not schedule a second loop from this now-stale callback.
      if (
        generation !== this.loopGeneration ||
        stage.contextState !== 'running'
      )
        return;

      // Schedule next frame
      if (targetFrameTime > 0) {
        // Use setTimeout + rAF combination for precise FPS control
        const nextFrameDelay = Math.max(
          0,
          targetFrameTime - (performance.now() - currentTime),
        );
        scheduleFrame(nextFrameDelay);
      } else {
        // Use standard rAF when not throttling
        scheduleFrame();
      }
    };
    scheduleFrame();
  }

  // Run once after the browser restores the context, outside the normal loop.
  private drawRecoveryFrame(stage: Stage, generation: number): void {
    if (generation !== this.loopGeneration || stage.contextState !== 'running')
      return;
    this.frameHandle = null;

    stage.updateFrameTime();
    if (generation !== this.loopGeneration || stage.contextState !== 'running')
      return;
    stage.updateAnimations();
    if (generation !== this.loopGeneration || stage.contextState !== 'running')
      return;

    try {
      stage.drawFrame();
    } catch (error) {
      // A stopped/replaced callback must not fail a newer recovery attempt.
      if (
        generation !== this.loopGeneration ||
        stage.contextState !== 'running'
      )
        return;
      if (stage.onRecoveryFrameFailed(error) === false) throw error;
      return;
    }

    if (generation !== this.loopGeneration || stage.contextState !== 'running')
      return;
    stage.flushFrameEvents();
    if (generation !== this.loopGeneration || stage.contextState !== 'running')
      return;
    stage.onRecoveryFrameCompleted();
    if (
      generation === this.loopGeneration &&
      stage.contextState === 'running'
    ) {
      this.startLoop(stage);
    }
  }

  private cancelScheduledFrame(): void {
    if (this.frameHandle !== null) cancelAnimationFrame(this.frameHandle);
    if (this.timerHandle !== null) clearTimeout(this.timerHandle);
    this.frameHandle = null;
    this.timerHandle = null;
  }

  override suspendFrameLoop(): void {
    this.loopGeneration++;
    this.cancelScheduledFrame();
  }

  private scheduleRecoveryFrame(stage: Stage): void {
    this.cancelScheduledFrame();
    const generation = ++this.loopGeneration;
    this.frameHandle = requestAnimationFrame(() => {
      this.drawRecoveryFrame(stage, generation);
    });
  }

  override stopLoop(): void {
    this.loopGeneration++;
    this.cancelScheduledFrame();
    if (this.detachContextEvents !== null) this.detachContextEvents();
    this.detachContextEvents = null;
    // NOTE: read the backing field, not the lazy getter — tearing down must
    // never spawn workers.
    if (this._imageWorkerManager !== null) {
      for (const worker of this._imageWorkerManager.workers) {
        worker.terminate();
      }
      this._imageWorkerManager = null;
    }
  }

  ////////////////////////
  // Image handling
  ////////////////////////

  override fetch(url: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.responseType = 'blob';
      xhr.onreadystatechange = function () {
        if (xhr.readyState == XMLHttpRequest.DONE) {
          // On most devices like WebOS and Tizen, the file protocol returns 0 while http(s) protocol returns 200
          if (xhr.status === 0 || xhr.status === 200) {
            if (xhr.response instanceof Blob) {
              resolve(xhr.response);
            } else {
              reject(new Error('Expected blob response while loading image.'));
            }
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
      return {
        data: bitmap,
        premultiplyAlpha: hasAlphaChannel,
        premultiplied: true,
      };
    }

    // default createImageBitmap without crop but with options
    const bitmap = await createImageBitmap(blob, {
      premultiplyAlpha: hasAlphaChannel ? 'premultiply' : 'none',
      colorSpaceConversion: 'none',
      imageOrientation: 'none',
    });

    return {
      data: bitmap,
      premultiplyAlpha: hasAlphaChannel,
      premultiplied: true,
    };
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
    if (isBase64 === true) {
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

  override async loadFontFace(
    fontFamily: string,
    fontUrl: string,
  ): Promise<FontFace | null> {
    const font = await new FontFace(fontFamily, `url(${fontUrl})`).load();
    this.addFont(font);
    return font;
  }
}
