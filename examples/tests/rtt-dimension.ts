import type { ExampleSettings } from '../common/ExampleSettings.js';
import rocko from '../assets/rocko.png';

export async function automation(settings: ExampleSettings) {
  const page = await test(settings);

  const maxPages = 6;
  for (let i = 0; i < maxPages; i++) {
    page(i);
    await settings.snapshot();
  }
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  const fontFamily = 'SDF-Ubuntu';
  const node = renderer.createNode({
    x: 0,
    y: 0,
    w: 1920,
    h: 1080,
    color: 0x000000ff,
    parent: testRoot,
  });

  // RTT Node 1
  const rttNode = renderer.createNode({
    x: 100,
    y: 200,
    w: 300,
    h: 300,
    parent: node,
    rtt: true,
    clipping: true,
    zIndex: 5,
    colorTop: 0xfff00fff,
    colorBottom: 0x00ffffff,
  });

  renderer.createNode({
    x: 0,
    y: 0,
    w: 300,
    h: 300,
    parent: rttNode,
    color: 0xff0000ff,
  });

  renderer.createTextNode({
    x: 0,
    y: 0,
    text: 'Render to texture',
    parent: rttNode,
    fontSize: 48,
    color: 0xffffffff,
    fontFamily: fontFamily,
  });

  renderer.createNode({
    x: 50,
    y: 100,
    w: 300,
    h: 300,
    parent: rttNode,
    src: rocko,
  });

  // RTT Node 2
  const rttNode2 = renderer.createNode({
    x: 500,
    y: 200,
    w: 300,
    h: 300,
    parent: node,
    rtt: true,
    colorTop: 0xfff00fff,
    colorBottom: 0x00ffffff,
  });

  renderer.createNode({
    x: 0,
    y: 0,
    w: 300,
    h: 300,
    parent: rttNode2,
    color: 0xc0ff33ff,
  });

  renderer.createTextNode({
    x: 0,
    y: 0,
    text: 'Render to texture',
    parent: rttNode2,
    fontSize: 22,
    color: 0xff00ffff,
    fontFamily: fontFamily,
  });

  renderer.createNode({
    x: 50,
    y: 100,
    w: 300,
    h: 300,
    parent: rttNode2,
    src: rocko,
  });

  // RTT Node 2
  const rttNode3 = renderer.createNode({
    x: 900,
    y: 200,
    w: 800,
    h: 300,
    parent: node,
    rtt: true,
    colorTop: 0x67378dff,
    colorBottom: 0x9cbd61ff,
  });

  renderer.createNode({
    x: 0,
    y: 0,
    w: 300,
    h: 300,
    parent: rttNode3,
    color: 0xc0ff33ff,
  });

  renderer.createTextNode({
    x: 0,
    y: 0,
    text: 'Render to texture',
    parent: rttNode3,
    fontSize: 22,
    color: 0xff00ffff,
    fontFamily: fontFamily,
  });

  renderer.createNode({
    x: 50,
    y: 100,
    w: 300,
    h: 300,
    parent: rttNode3,
    src: rocko,
  });

  const nestedRTTNode1 = renderer.createNode({
    x: 400,
    y: 0,
    w: 150,
    h: 150,
    parent: rttNode3,
    rtt: true,
    colorTop: 0x26f1e0ff,
    colorBottom: 0xffffffff,
  });

  renderer.createNode({
    x: 0,
    y: 0,
    w: 150,
    h: 150,
    parent: nestedRTTNode1,
    color: 0xc0ff33ff,
  });

  renderer.createTextNode({
    x: 0,
    y: 0,
    text: 'Nested',
    parent: nestedRTTNode1,
    fontSize: 22,
    color: 0xff00ffff,
    fontFamily: fontFamily,
  });

  const rocko4 = renderer.createNode({
    x: -120,
    y: 50,
    w: 300,
    h: 300,
    parent: nestedRTTNode1,
    src: rocko,
  });

  // Copy source texture from rootRenderToTextureNode
  for (let i = 0; i < 50; i++) {
    renderer.createNode({
      parent: node,
      x: (i % 15) * 120 + 100,
      y: Math.floor(i / 15) * 120 + 600,
      w: 100,
      h: 100,
      texture: nestedRTTNode1.texture,
      // Flip every other one of them
      textureOptions: {
        flipY: i % 2 === 1,
      },
    });
  }

  const animation = rocko4.animate(
    {
      rotation: 0.3,
      scale: 1.5,
      y: 110,
      x: -50,
    },
    {
      duration: Math.random() * 4000 + 3000,
      loop: true,
      stopMethod: 'reverse',
      easing: 'ease-in-out',
    },
  );

  renderer.createTextNode({
    x: 100,
    y: 160,
    text: 'RTT Dimension',
    parent: node,
    fontSize: 22,
    color: 0xffffffff,
    fontFamily: fontFamily,
  });

  renderer.createTextNode({
    x: 900,
    y: 160,
    text: 'Nested RTT',
    parent: node,
    fontSize: 22,
    color: 0xffffffff,
    fontFamily: fontFamily,
  });

  renderer.createTextNode({
    x: 100,
    y: 560,
    text: 'Nested RTT copies',
    parent: node,
    fontSize: 22,
    color: 0xffffffff,
    fontFamily: fontFamily,
  });

  let curPage = 0;
  window.addEventListener('keydown', (e) => {
    if (e.key === 'r') {
      rttNode.rtt = !rttNode.rtt;
      rttNode2.rtt = !rttNode2.rtt;
      rttNode3.rtt = !rttNode3.rtt;
    }
    if (e.key === 's') {
      animation.start();
    }
    if (e.key === 'w') {
      rttNode.w = rttNode.w === 200 ? 300 : 200;
      rttNode.h = rttNode.h === 200 ? 300 : 200;
    }

    if (e.key === 'ArrowRight') {
      if (curPage > 6) {
        curPage = 0;
      }

      page(curPage++);
    }

    if (e.key === 'ArrowLeft') {
      if (curPage < 1) {
        curPage = 7;
      }

      page(curPage--);
    }
  });

  // Define the page function to configure different test scenarios
  const page = (i = 0) => {
    switch (i) {
      case 1:
        rttNode.rtt = false;
        rttNode.clipping = false;
        rttNode2.rtt = false;
        rttNode3.rtt = false;
        break;

      case 2:
        rttNode.rtt = true;
        rttNode2.rtt = true;
        rttNode3.rtt = true;
        break;

      case 4:
        // Modify child texture properties in nested RTT node
        rocko4.x = 0;
        break;

      case 5:
        nestedRTTNode1.rtt = false;
        break;

      case 6:
        nestedRTTNode1.rtt = true;
        break;

      default:
        // Reset to initial state
        rttNode.rtt = true;
        rttNode.clipping = true;
        rttNode2.rtt = true;
        rttNode3.rtt = true;
        nestedRTTNode1.rtt = true;
        break;
    }
  };

  return page;
}
