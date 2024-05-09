import type { ExampleSettings } from '../common/ExampleSettings.js';

export async function automation(settings: ExampleSettings) {
  // Snapshot single page
  await test(settings);
  await settings.snapshot();
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  /*
   * redRect shown to illustrate original dimensions
   * image is distorted
   */

  const parent = renderer.createNode({
    x: 100,
    y: 100,
    width: 900,
    height: 900,
    color: 0xcc0000ff,
    parent: testRoot,
  });

  const child = renderer.createNode({
    width: 900,
    height: 900,
    parent,
    src: `https://picsum.photos/900/900`,
    shader: renderer.createShader('Distort', {
      topLeft: { x: 50, y: 50 },
      topRight: { x: 900, y: 0 },
      bottomRight: { x: 750, y: 700 },
      bottomLeft: { x: 100, y: 850 },
    }),
  });

  /*
   * End: Sprite Map Demo
   */
  console.log('ready!');
}
