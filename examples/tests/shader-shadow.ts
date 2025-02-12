import type { ExampleSettings } from '../common/ExampleSettings.js';

export async function automation(settings: ExampleSettings) {
  // Snapshot single page
  await test(settings);
  await settings.snapshot();
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  const node = renderer.createNode({
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    color: 0xffffffff,
    parent: testRoot,
  });

  renderer.createNode({
    x: 300,
    y: 300,
    mount: 0.5,
    width: 250,
    height: 250,
    color: 0xff00ffff,
    shader: renderer.createShader('Shadow', {
      x: 50,
      spread: 50,
      blur: 100,
    }),
    parent: node,
  });

  renderer.createNode({
    x: 700,
    y: 300,
    mount: 0.5,
    width: 250,
    height: 250,
    color: 0xff00ffff,
    shader: renderer.createShader('RoundedWithShadow', {
      radius: 10,
      'shadow-x': 50,
      'shadow-spread': 50,
      'shadow-blur': 100,
    }),
    parent: node,
  });

  renderer.createNode({
    x: 1100,
    y: 300,
    mount: 0.5,
    width: 250,
    height: 250,
    color: 0xff00ffff,
    shader: renderer.createShader('RoundedWithBorderAndShadow', {
      radius: 10,
      'shadow-x': 50,
      'shadow-spread': 50,
      'shadow-blur': 100,
      'border-width': 20,
    }),
    parent: node,
  });
}
