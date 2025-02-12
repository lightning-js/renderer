import type { ExampleSettings } from '../common/ExampleSettings.js';

export async function automation(settings: ExampleSettings) {
  // Snapshot single page
  await test(settings);
  await settings.snapshot();
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  const RedRect = renderer.createNode({
    x: 20,
    y: 20,
    width: 600,
    height: 400,
    color: 0xff0000ff,
    shader: renderer.createShader('HolePunch'),
    parent: testRoot,
  });

  const RedRect2 = renderer.createNode({
    x: 720,
    y: 20,
    width: 600,
    height: 400,
    color: 0xff0000ff,
    shader: renderer.createShader('HolePunch', {
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      radius: 10,
    }),
    parent: testRoot,
  });

  const GreenRect = renderer.createNode({
    x: 20,
    y: 520,
    width: 600,
    height: 400,
    color: 0x00ff00ff,
    shader: renderer.createShader('HolePunch', {
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      radius: 10,
    }),
    parent: testRoot,
  });

  const GreenRect2 = renderer.createNode({
    x: 720,
    y: 520,
    width: 600,
    height: 400,
    color: 0x00ff00ff,
    shader: renderer.createShader('HolePunch', {
      x: 270,
      y: 200,
      width: 225,
      height: 150,
      radius: [50, 20, 30],
    }),
    parent: testRoot,
  });
}
