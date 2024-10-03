import type { ExampleSettings } from '../common/ExampleSettings.js';

export async function automation(settings: ExampleSettings) {
  // Snapshot single page
  await test(settings);
  await settings.snapshot();
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  const size = 500;

  const parent = renderer.createNode({
    parent: testRoot,
  });

  // shown to illustrate original dimensions
  const bg1 = renderer.createNode({
    x: 100,
    y: 100,
    width: size,
    height: size,
    alpha: 0.2,
    color: 0x000000ff,
    parent,
  });

  // shown to illustrate original dimensions
  const bg2 = renderer.createNode({
    x: 700,
    y: 100,
    width: size,
    height: size,
    alpha: 0.2,
    color: 0x000000ff,
    parent,
  });

  // shown to illustrate original dimensions
  const bg3 = renderer.createNode({
    x: 1300,
    y: 100,
    width: size,
    height: size,
    alpha: 0.2,
    color: 0x000000ff,
    parent,
  });

  // distorted using pixel values
  const pixels = renderer.createNode({
    x: 100,
    y: 100,
    width: size,
    height: size,
    parent,
    src: `https://picsum.photos/${size}/${size}`,
    shader: renderer.createShader('DistortShader', {
      topLeft: { x: 20, y: 50 },
      topRight: { x: 400, y: 0 },
      bottomRight: { x: 350, y: 300 },
      bottomLeft: { x: 50, y: 350 },
    }),
  });

  // distorted using normalized values
  const normalized = renderer.createNode({
    x: 700,
    y: 100,
    width: size,
    height: size,
    parent,
    src: `https://picsum.photos/${size}/${size}`,
    shader: renderer.createShader('DistortShader', {
      normalized: true,
      topLeft: { x: 0.1, y: 0.1 },
      topRight: { x: 0.75, y: 0.2 },
      bottomRight: { x: 0.95, y: 0.7 },
      bottomLeft: { x: 0.05, y: 0.9 },
    }),
  });

  // distorted children inside a distorted container (requires rtt=true)
  const nested = renderer.createNode({
    x: 1300,
    y: 100,
    width: size,
    height: size,
    parent,
    rtt: true,
    shader: renderer.createShader('DistortShader', {
      normalized: true,
      topLeft: { x: 0.1, y: 0.1 },
      topRight: { x: 0.75, y: 0.2 },
      bottomRight: { x: 0.95, y: 0.7 },
      bottomLeft: { x: 0.05, y: 0.9 },
    }),
  });

  const nestedBg = renderer.createNode({
    width: size,
    height: size,
    color: 0x990000ff,
    parent: nested,
  });

  // a distorted image inside a distorted container
  const image = renderer.createNode({
    x: size / 2,
    y: size / 2,
    width: size / 2,
    height: size / 2,
    mount: 0.5,
    parent: nested,
    src: `https://picsum.photos/${size}/${size}`,
    shader: renderer.createShader('DistortShader', {
      normalized: true,
      topLeft: { x: 0.1, y: 0.1 },
      topRight: { x: 0.75, y: 0.2 },
      bottomRight: { x: 0.95, y: 0.7 },
      bottomLeft: { x: 0.05, y: 0.9 },
    }),
  });

  const text = renderer.createTextNode({
    mount: 0.5,
    x: size / 2,
    y: size / 2,
    text: 'Hello, World!',
    fontFamily: 'Ubuntu',
    textRendererOverride: 'sdf',
    fontSize: 70,
    parent: nested,
  });

  /*
   * End: Sprite Map Demo
   */
  console.log('ready!');
}
