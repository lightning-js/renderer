import type { ExampleSettings } from '../common/ExampleSettings.js';
import { BorderBottom } from '@lightningjs/renderer/webgl/shaders';

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
    shader: renderer.createShader(BorderBottom),
    parent: testRoot,
  });

  const RedRect2 = renderer.createNode({
    x: 720,
    y: 20,
    width: 600,
    height: 400,
    color: 0xff0000ff,
    shader: renderer.createShader(BorderBottom, { width: 30 }),
    parent: testRoot,
  });

  const GreenRect = renderer.createNode({
    x: 20,
    y: 520,
    width: 600,
    height: 400,
    color: 0x00ff00ff,
    shader: renderer.createShader(BorderBottom, {
      width: 40,
    }),
    parent: testRoot,
  });

  const GreenRect2 = renderer.createNode({
    x: 720,
    y: 520,
    width: 600,
    height: 400,
    color: 0x00000000,
    shader: renderer.createShader(BorderBottom, {
      width: 20,
    }),
    parent: testRoot,
  });
}
