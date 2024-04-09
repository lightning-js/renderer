import type { ExampleSettings } from '../common/ExampleSettings.js';

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
    width: 1920,
    height: 540,
    parent: node,
    rtt: true,
    zIndex: 5,
    color: 0xffffffff,
  });

  const reflectionNode = renderer.createNode({
    x: 0,
    y: 540,
    width: 1920,
    height: 540,
    colorTop: 0xc0ffee00,
    colorBottom: 0x97abffff,
    parent: node,
    scaleY: -1,
    alpha: 0.8,
    // Copy source texture from rootRenderToTextureNode
    texture: rootRenderToTextureNode.texture,
  });

  new Array(105).fill(0).forEach((_, i) => {
    const a = renderer.createNode({
      parent: rootRenderToTextureNode,
      x: (i % 15) * 120 + 50,
      y: Math.floor(i / 15) * 140 + 1920,
      width: 120,
      height: 120,
      scale: 0.5,
      src: `https://picsum.photos/id/${i + 30}/120/120`,
    });

    const animation = a.animate(
      {
        rotation: Math.random() * Math.PI * 2,
        scale: 1.5,
        y: Math.floor(i / 15) * 140 + 250,
      },
      {
        duration: Math.random() * 4000 + 3000,
        loop: true,
        stopMethod: 'reverse',
        easing: 'ease-in-out',
      },
    );
    animation.start();
  });

  const rttLabel = renderer.createTextNode({
    parent: rootRenderToTextureNode,
    x: 80,
    y: 540,
    fontFamily: 'Ubuntu',
    fontSize: 40,
    text: 'RTT reflection demo',
  });

  const animation = rttLabel.animate(
    {
      y: 420,
    },
    {
      duration: 6000,
      delay: 400,
      loop: true,
      stopMethod: 'reverse',
      easing: 'ease-in-out',
    },
  );
  animation.start();

  setInterval(() => {
    const a = reflectionNode.animate(
      {
        colorTop: randomColor(),
        colorBottom: randomColor(),
      },
      {
        duration: 4000,
        easing: 'ease-in-out',
      },
    );
    a.start();
  }, 4400);
}
