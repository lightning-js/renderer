import type { ExampleSettings } from '../common/ExampleSettings.js';
import test from './alpha-blending.js';
interface AnimationExampleSettings {
  duration: number;
  easing: string;
  delay: number;
  loop: boolean;
  stopMethod: 'reverse' | 'reset' | false;
}

const randomColor = () => {
  const randomInt = Math.floor(Math.random() * Math.pow(2, 32));
  const hexString = randomInt.toString(16).padStart(8, '0');
  return parseInt(hexString, 16);
};

export default async function ({ renderer, testRoot }: ExampleSettings) {
  const node = renderer.createNode({
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    color: 0x000000ff,
    parent: testRoot,
  });

  // RTT Node 1
  const rttNode = renderer.createNode({
    x: 100,
    y: 200,
    width: 300,
    height: 300,
    parent: node,
    rtt: true,
    zIndex: 5,
    colorTop: 0xfff00fff,
    colorBottom: 0x00ffffff,
  });

  const rect = renderer.createNode({
    x: 0,
    y: 0,
    width: 300,
    height: 300,
    parent: rttNode,
    color: 0xff0000ff,
  });

  const label1 = renderer.createTextNode({
    x: 0,
    y: 0,
    text: 'Render to texture',
    parent: rttNode,
    fontSize: 48,
    color: 0xffffffff,
    fontFamily: 'Ubuntu',
  });

  const rocko1 = renderer.createNode({
    x: 50,
    y: 100,
    width: 300,
    height: 300,
    parent: rttNode,
    src: '../assets/rocko.png',
  });

  // RTT Node 2
  const rttNode2 = renderer.createNode({
    x: 500,
    y: 200,
    width: 300,
    height: 300,
    parent: node,
    rtt: true,
    colorTop: 0xfff00fff,
    colorBottom: 0x00ffffff,
  });

  const rect2 = renderer.createNode({
    x: 0,
    y: 0,
    width: 300,
    height: 300,
    parent: rttNode2,
    color: 0xc0ff33ff,
  });

  const label2 = renderer.createTextNode({
    x: 0,
    y: 0,
    text: 'Render to texture',
    parent: rttNode2,
    fontSize: 22,
    color: 0xff00ffff,
    fontFamily: 'Ubuntu',
  });

  const rocko2 = renderer.createNode({
    x: 50,
    y: 100,
    width: 300,
    height: 300,
    parent: rttNode2,
    src: '../assets/rocko.png',
  });

  // RTT Node 2
  const rttNode3 = renderer.createNode({
    x: 900,
    y: 200,
    width: 800,
    height: 300,
    parent: node,
    rtt: true,
    colorTop: 0x67378dff,
    colorBottom: 0x9cbd61ff,
  });

  const rect3 = renderer.createNode({
    x: 0,
    y: 0,
    width: 300,
    height: 300,
    parent: rttNode3,
    color: 0xc0ff33ff,
  });

  const label3 = renderer.createTextNode({
    x: 0,
    y: 0,
    text: 'Render to texture',
    parent: rttNode3,
    fontSize: 22,
    color: 0xff00ffff,
    fontFamily: 'Ubuntu',
  });

  const rocko3 = renderer.createNode({
    x: 50,
    y: 100,
    width: 300,
    height: 300,
    parent: rttNode3,
    src: '../assets/rocko.png',
  });

  const nestedRTTNode1 = renderer.createNode({
    x: 400,
    y: 0,
    width: 150,
    height: 150,
    parent: rttNode3,
    rtt: true,
    colorTop: 0x26f1e0ff,
    colorBottom: 0xffffffff,
  });

  const rect4 = renderer.createNode({
    x: 0,
    y: 0,
    width: 150,
    height: 150,
    parent: nestedRTTNode1,
    color: 0xc0ff33ff,
  });

  const label4 = renderer.createTextNode({
    x: 0,
    y: 0,
    text: 'Nested',
    parent: nestedRTTNode1,
    fontSize: 22,
    color: 0xff00ffff,
    fontFamily: 'Ubuntu',
  });

  const rocko4 = renderer.createNode({
    x: -120,
    y: 50,
    width: 300,
    height: 300,
    parent: nestedRTTNode1,
    src: '../assets/rocko.png',
  });

  // Copy source texture from rootRenderToTextureNode
  for (let i = 0; i < 50; i++) {
    const a = renderer.createNode({
      parent: node,
      x: (i % 15) * 120 + 100,
      y: Math.floor(i / 15) * 120 + 600,
      width: 100,
      height: 100,
      texture: nestedRTTNode1.texture,
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

  animation.start();

  renderer.createTextNode({
    x: 100,
    y: 160,
    text: 'RTT Dimension',
    parent: node,
    fontSize: 22,
    color: 0xffffffff,
    fontFamily: 'Ubuntu',
  });

  renderer.createTextNode({
    x: 900,
    y: 160,
    text: 'Nested RTT',
    parent: node,
    fontSize: 22,
    color: 0xffffffff,
    fontFamily: 'Ubuntu',
  });

  renderer.createTextNode({
    x: 100,
    y: 560,
    text: 'Nested RTT copies',
    parent: node,
    fontSize: 22,
    color: 0xffffffff,
    fontFamily: 'Ubuntu',
  });
}
