import threadx from '@lightningjs/threadx';
import { renderProperties, type RenderProps } from '../renderProperties.js';
import type { IRenderDriver } from './IRenderDriver.js';
import type { Primitive, PrimitiveProps } from './Primitive.js';

export interface ThreadXRendererSettings {
  RendererWorker: new () => Worker;
}

export class ThreadXRenderDriver implements IRenderDriver {
  private settings: ThreadXRendererSettings;

  constructor(settings: ThreadXRendererSettings) {
    this.settings = settings;
  }

  async init(canvas: HTMLCanvasElement): Promise<void> {
    const buffers = [
      threadx.buffer({
        name: 'bolt',
        length: 2e6,
        mapping: renderProperties,
      }),
      threadx.buffer({
        name: 'mutations',
        length: 2e6,
        mapping: renderProperties,
      }),
      threadx.textbuffer({
        name: 'images',
        length: 1e5,
      }),
    ];
    const threads = [{ id: 'gl', src: new this.settings.RendererWorker() }];
    await threadx.init(threads, buffers);
    const offscreenCanvas = canvas.transferControlToOffscreen();
    await new Promise<void>((resolve) => {
      const worker = threadx.worker('gl');
      worker.addEventListener('message', ({ data }: { data: any }) => {
        if (data.event === 'ready') {
          resolve();
        }
      });
      worker.postMessage(
        {
          event: 'canvas',
          payload: {
            offscreenCanvas,
          },
        },
        [offscreenCanvas],
      );
    });
  }
  createPrimitiveRaw(primitive: Primitive): void {
    threadx.send('bolt', primitive.props);
    if (primitive.props.src || primitive.props.src === '') {
      threadx.send('images', {
        id: primitive.id,
        value: primitive.props.src,
      });
    }
    this.onCreatePrimitive(primitive);
  }
  mutatePrimitiveRaw(
    primitive: Primitive,
    mutations: Partial<PrimitiveProps>,
  ): void {
    mutations.elementId = primitive.id;
    if (mutations.src || mutations.src === '') {
      threadx.send('images', {
        id: primitive.id,
        value: mutations.src,
      });
    }
    threadx.send('mutations', mutations);
  }
  destroyPrimitiveRaw(primitive: Primitive): void {
    this.onDestroyPrimitive(primitive);
    const worker = threadx.worker('gl');
    worker.postMessage({
      event: 'destroy',
      payload: {
        elementId: primitive.id,
      },
    });
  }

  onCreatePrimitive(primitive: Primitive): void {
    return;
  }
  onDestroyPrimitive(primitive: Primitive): void {
    return;
  }
}
