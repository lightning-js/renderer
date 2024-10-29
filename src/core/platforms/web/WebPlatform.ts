import { CorePlatform } from '../CorePlatform.js';
import { WebGlContext } from './WebGlContext.js';
import type { Stage } from '../../Stage.js';
import { ContextSpy } from '../../lib/ContextSpy.js';

export class WebPlatform extends CorePlatform {
  constructor() {
    super();
  }

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

  override createWebGLContext(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    forceWebGL2 = false,
    contextSpy: ContextSpy | null,
  ): WebGlContext {
    const config: WebGLContextAttributes = {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: true,
      desynchronized: false,
      // Disabled because it prevents Visual Regression Tests from working
      // failIfMajorPerformanceCaveat: true,
      powerPreference: 'high-performance',
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
    };
    const gl =
      // TODO: Remove this assertion once this issue is fixed in TypeScript
      // https://github.com/microsoft/TypeScript/issues/53614
      (canvas.getContext(forceWebGL2 ? 'webgl2' : 'webgl', config) ||
        canvas.getContext(
          'experimental-webgl' as 'webgl',
          config,
        )) as unknown as WebGLRenderingContext | null;
    if (!gl) {
      throw new Error('Unable to create WebGL context');
    }
    if (contextSpy) {
      // Proxy the GL context to log all GL calls
      return new Proxy(new WebGlContext(gl), {
        get(target, prop) {
          const value = target[prop as never] as unknown;
          if (typeof value === 'function') {
            contextSpy.increment(String(prop));
            return value.bind(target);
          }
          return value;
        },
      });
    }

    // return WebGL Context Wrapper
    return new WebGlContext(gl);
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

  get createImageBitmap() {
    return self.createImageBitmap;
  }

  getTimeStamp(): number {
    return performance ? performance.now() : Date.now();
  }
}
