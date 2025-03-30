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
    const runLoop = () => {
      stage.updateFrameTime();
      stage.updateAnimations();

      if (!stage.hasSceneUpdates()) {
        // We still need to calculate the fps else it looks like the app is frozen
        stage.calculateFps();
        setTimeout(runLoop, 16.666666666666668);

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
      stage.currentZIndex = 0;
      requestAnimationFrame(runLoop);
    };
    // Start the loop
    runLoop();
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
