import type { ExampleSettings } from '../common/ExampleSettings.js';

export async function automation(settings: ExampleSettings) {
  // Snapshot single page
  await test(settings);
  await settings.snapshot();
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  /*
   * redRect will persist and change color every frame
   * greenRect will persist and be detached and reattached to the root every second
   * blueRect will be created and destroyed every 500 ms
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
      topLeft: [50, 50],
      topRight: [900, 0],
      bottomRight: [750, 700],
      bottomLeft: [100, 850],
    }),
  });

  /*
   * End: Sprite Map Demo
   */
  console.log('ready!');
}
