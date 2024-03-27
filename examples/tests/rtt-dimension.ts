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

  const rootRenderToTextureNode = renderer.createNode({
    x: 0,
    y: 0,
    width: 960,
    height: 540,
    parent: node,
    rtt: true,
    zIndex: 5,
    colorTop: 0xffffffff,
    colorBottom: 0xffffffff,
  });

  const rect = renderer.createNode({
    parent: rootRenderToTextureNode,
    x: 0,
    y: 530,
    width: 960,
    height: 100,
    color: 0xffca12ff,
    zIndex: 3,
  });

  const image1 = renderer.createNode({
    parent: rootRenderToTextureNode,
    x: -100,
    y: 0,
    width: 400,
    height: 400,
    src: '../assets/rocko.png',
  });

  const image2 = renderer.createNode({
    parent: rootRenderToTextureNode,
    x: 250,
    y: 0,
    width: 200,
    height: 200,
    src: '../assets/rocko.png',
  });

  const image3 = renderer.createNode({
    parent: rootRenderToTextureNode,
    x: 120,
    y: 100,
    width: 200,
    height: 200,
    src: '../assets/rocko.png',
  });

  const rect1 = renderer.createNode({
    parent: rootRenderToTextureNode,
    x: 300,
    y: 300,
    width: 100,
    height: 100,
    color: 0xffca12ff,
    zIndex: 3,
  });

  const rect2 = renderer.createNode({
    parent: rootRenderToTextureNode,
    x: 100,
    y: 100,
    width: 20,
    height: 20,
    color: 0xffca12ff,
    zIndex: 3,
  });

  const label = renderer.createTextNode({
    parent: rootRenderToTextureNode,
    fontFamily: 'Ubuntu',
    fontSize: 37,
    text: 'Render to texture',
    color: 0xc0ff33ff,
    zIndex: 20,
  });

  const label1 = renderer.createTextNode({
    parent: node,
    fontFamily: 'Ubuntu',
    fontSize: 234,
    text: 'Render to texture',
    color: 0xc0ff33ff,
    zIndex: 20,
    y: 700,
    clipping: true,
  });

  const animation = image1.animate(
    {
      x: 100,
      y: 100,
      scale: 3,
    },
    {
      duration: 5000,
      easing: 'ease-in-out',
      delay: 0,
      loop: true,
      stopMethod: 'reverse',
    },
  );

  const animation1 = rect1.animate(
    {
      x: 20,
      y: 20,
      scale: 2,
    },
    {
      duration: 5000,
      easing: 'ease-in-out',
      delay: 0,
      loop: true,
      stopMethod: 'reverse',
    },
  );

  // Trigger changes in RTT children
  // animation.start();
  // animation1.start();

  /* Copy nodes */
  const copyNode = renderer.createNode({
    x: 961,
    y: 0,
    width: 960,
    height: 540,
    parent: node,
    texture: rootRenderToTextureNode.texture,
    zIndex: 5,
    scaleX: -1,
    alpha: 0.5,
    colorTop: randomColor(),
    colorBottom: randomColor(),
  });

  const copyNode1 = renderer.createNode({
    x: 0,
    y: 541,
    width: 960,
    height: 540,
    parent: node,
    texture: rootRenderToTextureNode.texture,
    zIndex: 5,
    scaleY: -1,
    alpha: 0.5,
    colorTop: randomColor(),
    colorBottom: randomColor(),
  });

  const copyNode2 = renderer.createNode({
    x: 961,
    y: 541,
    width: 960,
    height: 540,
    parent: node,
    texture: rootRenderToTextureNode.texture,
    zIndex: 5,
    scaleY: -1,
    scaleX: -1,
    alpha: 0.5,
    colorTop: randomColor(),
    colorBottom: randomColor(),
  });
  const c1Anim = copyNode.animate(
    {
      x: 800,
    },
    {
      duration: 1000,
      easing: 'ease-in-out',
      delay: 0,
      loop: true,
      stopMethod: 'reverse',
    },
  );
  const c2Anim = copyNode1.animate(
    {
      y: 600,
    },
    {
      duration: 1000,
      easing: 'ease-in-out',
      delay: 0,
      loop: true,
      stopMethod: 'reverse',
    },
  );

  const c3Anim = copyNode2.animate(
    {
      x: 800,
      y: 600,
    },
    {
      duration: 1000,
      easing: 'ease-in-out',
      delay: 0,
      loop: true,
      stopMethod: 'reverse',
    },
  );
  c1Anim.start();
  c2Anim.start();
  c3Anim.start();
}
