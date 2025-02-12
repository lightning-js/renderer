import type { ExampleSettings } from '../common/ExampleSettings.js';
import elevatorPng from '../assets/elevator.png';

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
    shader: renderer.createShader('RadialGradient', {
      width: 400,
      height: 400,
    }),
    parent: testRoot,
  });

  const RedRect2 = renderer.createNode({
    x: 720,
    y: 20,
    width: 600,
    height: 400,
    color: 0xff0000ff,
    shader: renderer.createShader('RadialGradient', {
      colors: [0xff00ffff, 0xffff00ff, 0x0000ffff, 0x00ff00ff],
      width: 600,
      height: 400,
    }),
    parent: testRoot,
  });

  const GreenRect = renderer.createNode({
    x: 20,
    y: 520,
    width: 600,
    height: 400,
    color: 0x00ff00ff,
    shader: renderer.createShader('RadialGradient', {
      colors: [0xff00ffff, 0xffff00ff, 0x0000ffff, 0x00ff00ff, 0xff0000ff],
      width: 400,
      height: 600,
    }),
    parent: testRoot,
  });

  const GreenRect2 = renderer.createNode({
    x: 720,
    y: 520,
    width: 600,
    height: 400,
    src: elevatorPng,
    shader: renderer.createShader('RadialGradient', {
      colors: [0x00000000, 0x000000ff],
      stops: [0.3, 1.0],
      width: 600,
      height: 400,
    }),
    parent: testRoot,
  });
}
