import type { ExampleSettings } from '../common/ExampleSettings.js';

export async function automation(settings: ExampleSettings) {
  // Snapshot single page
  await test(settings);
  await settings.snapshot();
}

export default async function test({
  renderer,
  testRoot,
  snapshot,
}: ExampleSettings) {
  const RedRect = renderer.createNode({
    x: 20,
    y: 20,
    width: 200,
    height: 200,
    color: 0xff0000ff,
    shader: renderer.createShader('Border'),
    parent: testRoot,
  });

  const RedRect2 = renderer.createNode({
    x: 250,
    y: 20,
    width: 200,
    height: 200,
    color: 0xff0000ff,
    shader: renderer.createShader('Border', { width: 30 }),
    parent: testRoot,
  });

  const GreenRect = renderer.createNode({
    x: 20,
    y: 250,
    width: 200,
    height: 200,
    color: 0x00ff00ff,
    shader: renderer.createShader('Border', {
      top: 10,
    }),
    parent: testRoot,
  });

  const GreenRect2 = renderer.createNode({
    x: 250,
    y: 250,
    width: 200,
    height: 200,
    color: 0x00ff00ff,
    shader: renderer.createShader('Border', {
      right: 10,
    }),
    parent: testRoot,
  });

  const GreenRect3 = renderer.createNode({
    x: 480,
    y: 250,
    width: 200,
    height: 200,
    color: 0x00ff00ff,
    shader: renderer.createShader('Border', {
      bottom: 10,
    }),
    parent: testRoot,
  });

  const GreenRect4 = renderer.createNode({
    x: 710,
    y: 250,
    width: 200,
    height: 200,
    color: 0x00ff00ff,
    shader: renderer.createShader('Border', {
      left: 10,
    }),
    parent: testRoot,
  });
}
