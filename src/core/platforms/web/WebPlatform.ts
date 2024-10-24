import { CorePlatform } from '../CorePlatform.js';
import { WebGlContext } from './WebGlContext.js';
import { Stage } from '../../Stage.js';

export class WebPlatform extends CorePlatform {
  private glContextWrapper!: WebGlContext;

  constructor() {
    super();
    const canvas = this.createCanvas();
    this.glContextWrapper = new WebGlContext(this.createWebGLContext(canvas));
  }

  ////////////////////////
  // WebGL Wrapper
  ////////////////////////

  override get gl() {
    return this.glContextWrapper;
  }

  ////////////////////////
  // Platform-specific methods
  ////////////////////////

  override createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    return canvas;
  }

  override createWebGLContext(
    canvas: HTMLCanvasElement,
  ): WebGLRenderingContext | WebGL2RenderingContext {
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    return gl;
  }

  override createCanvasRenderingContext2D(
    canvas: HTMLCanvasElement,
  ): CanvasRenderingContext2D {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('2D rendering context not supported');
    }
    return context;
  }

  override setCanvasPixelRatio(pixelRatio: number): void {
    const devicePixelRatio = window.devicePixelRatio || 1;
    document.body.style.zoom = (pixelRatio * devicePixelRatio).toString();
  }

  override setCanvasClearColor(
    context: CanvasRenderingContext2D,
    color: string,
  ): void {
    context.fillStyle = color;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
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
          if (stage.txMemManager.checkCleanup()) {
            stage.txMemManager.cleanup();
          }
          stage.eventBus.emit('idle');
          isIdle = true;
        }
        stage.flushFrameEvents();
        return;
      }

      isIdle = false;
      stage.drawFrame();
      stage.flushFrameEvents();
      requestAnimationFrame(runLoop);
    };
    requestAnimationFrame(runLoop);
  }

  /**
   * Implementation that supports both overloaded signatures for creating an ImageBitmap.
   */
  createImageBitmap(
    image: ImageBitmapSource,
    sxOrOptions?: number | ImageBitmapOptions,
    sy?: number,
    sw?: number,
    sh?: number,
    options?: ImageBitmapOptions,
  ): Promise<ImageBitmap> {
    // Check if the second argument is a number, meaning it's using the cropping version
    if (
      typeof sxOrOptions === 'number' &&
      sy !== undefined &&
      sw !== undefined &&
      sh !== undefined
    ) {
      return window.createImageBitmap(image, sxOrOptions, sy, sw, sh, options);
    } else {
      // Otherwise, assume it's using the non-cropping version
      return window.createImageBitmap(image, sxOrOptions as ImageBitmapOptions);
    }
  }

  getTimeStamp(): number {
    return performance ? performance.now() : Date.now();
  }
}
