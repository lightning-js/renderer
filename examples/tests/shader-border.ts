import type { ExampleSettings } from '../common/ExampleSettings.js';
import { Border } from '@lightningjs/renderer/webgl/shaders';

export async function automation(settings: ExampleSettings) {
  // Snapshot single page
  await test(settings);
  // await settings.snapshot();
}

export default async function ({
  renderer,
  testRoot,
  snapshot,
}: ExampleSettings) {
  const RedRect = renderer.createNode({
    x: 20,
    y: 20,
    width: 600,
    height: 400,
    color: 0xff0000ff,
    shader: renderer.createShader('Border', {
      bottom: 30,
      right: 10,
      radius: [50, 50, 50, 50],
    }),
    parent: testRoot,
  });

  const RedRect2 = renderer.createNode({
    x: 720,
    y: 20,
    width: 600,
    height: 400,
    color: 0xff0000ff,
    shader: renderer.createShader('Border', { width: 30, radius: 10 }),
    parent: testRoot,
  });

  const GreenRect = renderer.createNode({
    x: 20,
    y: 520,
    width: 600,
    height: 400,
    color: 0x00ff00ff,
    shader: renderer.createShader('Border', {
      width: 60,
      radius: [50, 20],
    }),
    parent: testRoot,
  });

  const GreenRect2 = renderer.createNode({
    x: 720,
    y: 520,
    width: 600,
    height: 400,
    color: 0x00ff00ff,
    shader: renderer.createShader('Border', {
      radius: [50, 20, 30],
      width: 10,
    }),
    parent: testRoot,
  });
}
