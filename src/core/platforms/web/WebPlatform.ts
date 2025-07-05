import { Platform } from '../Platform.js';
import type { Stage } from '../../Stage.js';

export class WebPlatform extends Platform {
  ////////////////////////
  // Platform-specific methods
  ////////////////////////

  override createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    return canvas;
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

        if (!isIdle) {
          stage.shManager.cleanup();
          stage.eventBus.emit('idle');
          isIdle = true;
        }

        if (stage.txMemManager.checkCleanup() === true) {
          stage.txMemManager.cleanup(false);
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
  // ImageBitmap
  ////////////////////////

  override createImageBitmap(
    blob: ImageBitmapSource,
    sxOrOptions?: number | ImageBitmapOptions,
    sy?: number,
    sw?: number,
    sh?: number,
    options?: ImageBitmapOptions,
  ): Promise<ImageBitmap> {
    if (typeof sxOrOptions === 'number') {
      return createImageBitmap(
        blob,
        sxOrOptions,
        sy ?? 0,
        sw ?? 0,
        sh ?? 0,
        options,
      );
    } else {
      return createImageBitmap(blob, sxOrOptions);
    }
  }

  getTimeStamp(): number {
    return performance ? performance.now() : Date.now();
  }
}
