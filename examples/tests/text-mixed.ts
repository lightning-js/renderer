import type { INode, ITextNode } from '../../dist/exports/index.js';
import type { ExampleSettings } from '../common/ExampleSettings.js';

export async function automation(settings: ExampleSettings) {
  await test(settings);
  await settings.snapshot();
}

/**
 * Tests that Single-Channel Signed Distance Field (SSDF) fonts are rendered
 * correctly.
 *
 * Text that is thinner than the certified snapshot may indicate that the
 * SSDF font atlas texture was premultiplied before being uploaded to the GPU.
 *
 * @param settings
 * @returns
 */
export default async function test(settings: ExampleSettings) {
  const { renderer, testRoot } = settings;

  let ssdf: ITextNode | undefined,
    canvas: ITextNode | undefined,
    factory: INode | undefined;

  const textFactory = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Unable to create canvas 2d context');
    ctx.fillStyle = 'red';
    ctx.font = '50px sans-serif';
    ctx.fillText('Factory', 0, 50);
    return ctx.getImageData(0, 0, 300, 200);
  };

  const drawText = (x = 0) => {
    // Set a smaller snapshot area
    ssdf = renderer.createTextNode({
      x,
      text: 'SSDF',
      color: 0x00ff00ff,
      fontFamily: 'Ubuntu-ssdf',
      parent: testRoot,
      fontSize: 80,
      lineHeight: 80 * 1.2,
    });

    canvas = renderer.createTextNode({
      x,
      color: 0xff0000ff,
      y: 100,
      text: `Canvas`,
      parent: testRoot,
      fontSize: 50,
    });

    factory = renderer.createNode({
      x,
      y: 150,
      width: 300,
      height: 200,
      parent: testRoot,
      texture: renderer.createTexture('ImageTexture', {
        src: textFactory,
      }),
    });
  };

  let offset = 0;
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (ssdf || canvas || factory) {
        ssdf?.destroy();
        ssdf = undefined;

        canvas?.destroy();
        canvas = undefined;

        factory?.destroy();
        factory = undefined;
      }

      setTimeout(() => {
        drawText();
      }, 200);
    }

    if (e.key === 'ArrowRight') {
      offset += 10;

      if (ssdf) ssdf.x = offset;
      if (canvas) canvas.x = offset;
      if (factory) factory.x = offset;
    }

    if (e.key === 'ArrowLeft') {
      offset -= 10;

      if (ssdf) ssdf.x = offset;
      if (canvas) canvas.x = offset;
      if (factory) factory.x = offset;
    }
  });

  drawText();
}
