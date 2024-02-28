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
  duration: 14000,
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
  const clippingNode = renderer.createNode({
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    parent: node,
    clipping: true,
    color: 0x00000000,
  });

  const rootRenderToTextureNode = renderer.createNode({
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    parent: clippingNode,
    rtt: true,
    zIndex: 5,
    colorTop: 0xc0ffeeff,
    colorBottom: 0xbada55ff,
  });

  new Array(105).fill(0).forEach((_, i) => {
    const a = renderer.createNode({
      parent: rootRenderToTextureNode,
      x: (i % 15) * 120 + 120,
      y: Math.floor(i / 15) * 120 + 150,
      width: 120,
      height: 120,
      scale: 0.85,
      // src: '../assets/rocko.png',
      src: `https://picsum.photos/id/${i + 30}/120/120`,
    });
  });

  new Array(20).fill(0).forEach((_, i) => {
    const a = renderer.createNode({
      x: (i % 1) * 1920,
      y: Math.floor(i / 1) * 800,
      width: 1920,
      height: 1080,
      parent: testRoot,
      alpha: 1,
      color: 0xffffffff,
      // Copy source texture from rootRenderToTextureNode
      texture: rootRenderToTextureNode.texture,
    });

    const animation = a.animate(
      {
        y: Math.floor(i / 1) * 800 - 15000,
      },
      animationSettings,
    );
    animation.start();
  });

  setTimeout(() => {
    rootRenderToTextureNode.alpha = 0;
  }, 2000);
}
