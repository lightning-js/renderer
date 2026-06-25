import type { ExampleSettings } from '../common/ExampleSettings.js';

export default async function ({ renderer, testRoot }: ExampleSettings) {
  const APP = renderer.createNode({
    x: 0,
    y: 0,
    w: 1920,
    h: 1080,
    color: 0x000000ff,
    parent: testRoot,
    interactive: false,
  });

  const MOUSE = renderer.createNode({
    x: 40,
    y: 40,
    w: 200,
    h: 200,
    color: 0xffffffff,
    parent: APP,
    interactive: true,
  });

  const MOUSE_RING = renderer.createNode({
    x: 40,
    y: 40,
    w: 200,
    h: 200,
    color: 0xff000000,
    parent: APP,
    interactive: false,
    shader: renderer.createShader('Border', { w: 20, color: 0xff0000ff }),
  });

  //print node ids:
  console.log('APP node id:', APP.id);
  console.log('MOUSE node id:', MOUSE.id);
  console.log('MOUSE_RING node id:', MOUSE_RING.id);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'c') {
      APP.interactive = !APP.interactive;
      console.log('APP interactive:', APP.interactive);
    }
  });

  window.addEventListener('mousemove', (e) => {
    const node = renderer.stage.getNodeFromPosition({
      x: e.clientX,
      y: e.clientY,
    });
    console.log('node at position', node);
  });
}
