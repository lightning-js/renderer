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
    rtt: false,
    zIndex: 5,
    colorTop: 0xc0ffee00,
    colorBottom: 0xbada5500,
  });

  new Array(2000).fill(0).forEach((_, i) => {
    const image = i % 105;
    const a = renderer.createNode({
      parent: rootRenderToTextureNode,
      x: (i % 15) * 120 + 120,
      y: Math.floor(i / 15) * 120 + 150,
      width: 120,
      height: 120,
      scale: 0.85,
      // src: '../assets/rocko.png',
      src: `https://picsum.photos/id/${image + 30}/120/120`,
    });

    const animation = a.animate(
      {
        y: Math.floor(i / 15) * 120 - 5000,
      },
      animationSettings,
    );

    animation.start();
  });
}
