import type { ExampleSettings } from '../common/ExampleSettings.js';
import test from './alpha-blending.js';
interface AnimationExampleSettings {
  duration: number;
  easing: string;
  delay: number;
  loop: boolean;
  stopMethod: 'reverse' | 'reset' | false;
}

const animationSettings: Partial<AnimationExampleSettings> = {
  duration: 3000,
  delay: 400,
  loop: true,
  stopMethod: 'reverse',
  easing: 'ease-in-out-back',
};

const randomColor = () => {
  const randomInt = Math.floor(Math.random() * Math.pow(2, 32));
  const hexString = randomInt.toString(16).padStart(8, '0');
  return parseInt(hexString, 16);
};

const degToRad = (deg: number) => {
  return (Math.PI / 180) * deg;
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

  const label = renderer.createTextNode({
    parent: node,
    x: 40,
    y: 40,
    fontFamily: 'Ubuntu',
    fontSize: 40,
    text: 'Render to Texture',
  });

  const clippingRectangle = renderer.createNode({
    x: 0,
    y: 0,
    width: 1920,
    height: 500,
    parent: testRoot,
    clipping: true,
    color: 0x00000000,
  });

  const rootRenderToTextureNode = renderer.createNode({
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    parent: clippingRectangle,
    rtt: true,
    zIndex: 5,
    colorTop: 0xc0ffeeff,
    colorBottom: 0xbada55ff,
  });

  const clippingRectangleCopy = renderer.createNode({
    x: 0,
    y: 500,
    width: 1920,
    height: 500,
    parent: testRoot,
    clipping: true,
    color: 0x00000000,
  });

  const reflectionNode = renderer.createNode({
    x: 0,
    y: -580,
    width: 1920,
    height: 1080,
    colorBottom: 0xffffffff,
    colorTop: 0x00000000,
    parent: clippingRectangleCopy,
    scaleY: -1,
    alpha: 0.8,
    // Copy source texture from rootRenderToTextureNode
    texture: rootRenderToTextureNode.texture,
  });

  const rttLabel = renderer.createTextNode({
    parent: rootRenderToTextureNode,
    x: 80,
    y: 140,
    fontFamily: 'Ubuntu',
    fontSize: 40,
    text: 'RTT Cached text',
  });

  const rootChildRectangle = renderer.createNode({
    x: 400,
    y: 40,
    width: 50,
    height: 50,
    color: 0x0ffffffff,
    parent: testRoot,
  });

  new Array(105).fill(0).forEach((_, i) => {
    const a = renderer.createNode({
      parent: rootRenderToTextureNode,
      x: (i % 15) * 120 + 50,
      y: Math.floor(i / 15) * 140 + 150,
      width: 120,
      height: 120,
      scale: 0.5,
      src: '../assets/rocko.png',
    });

    const animation = a.animate(
      {
        rotation: Math.PI / 8,
        scale: 2.1,
        y: Math.floor(i / 15) * 140 + 250,
      },
      animationSettings,
    );
    animation.start();
  });
}
