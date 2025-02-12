import type { ExampleSettings } from '../common/ExampleSettings.js';
import elevatorPng from '../assets/elevator.png';

export async function automation(settings: ExampleSettings) {
  // Snapshot single page
  await test(settings);
  await settings.snapshot();
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  const degToRad = (deg: number) => {
    return (Math.PI / 180) * deg;
  };
  const RedRect = renderer.createNode({
    x: 20,
    y: 20,
    width: 600,
    height: 400,
    color: 0xff0000ff,
    shader: renderer.createShader('LinearGradient'),
    parent: testRoot,
  });

  // RedRect.shader.props.angle = 50;

  const RedRect2 = renderer.createNode({
    x: 720,
    y: 20,
    width: 600,
    height: 400,
    color: 0xff0000ff,
    shader: renderer.createShader('LinearGradient', {
      colors: [0xff00ffff, 0xffff00ff, 0x0000ffff, 0x00ff00ff],
      angle: degToRad(45),
    }),
    parent: testRoot,
  });

  const GreenRect = renderer.createNode({
    x: 20,
    y: 520,
    width: 600,
    height: 400,
    color: 0x00ff00ff,
    shader: renderer.createShader('LinearGradient', {
      colors: [0xff00ffff, 0xffff00ff, 0x0000ffff, 0x00ff00ff, 0xff0000ff],
      angle: degToRad(70),
    }),
    parent: testRoot,
  });

  const GreenRect2 = renderer.createNode({
    x: 720,
    y: 520,
    width: 600,
    height: 400,
    src: elevatorPng,
    shader: renderer.createShader('LinearGradient', {
      colors: [0x000000ff, 0x00000000],
      stops: [0.5, 1.0],
      angle: degToRad(270),
    }),
    parent: testRoot,
  });
}
