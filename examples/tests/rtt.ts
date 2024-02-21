import type { ExampleSettings } from '../common/ExampleSettings.js';
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
  loop: false,
  stopMethod: 'reverse',
  easing: 'ease-in-out-back',
};

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

  const label = renderer.createTextNode({
    parent: node,
    x: 40,
    y: 40,
    fontFamily: 'Ubuntu',
    fontSize: 40,
    text: 'Render to Texture',
  });

  const rootRenderToTextureNode = renderer.createNode({
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    parent: testRoot,
    rtt: true,
    zIndex: 5,
    colorTop: randomColor(),
    colorBottom: randomColor(),
  });

  const rootChildRectangle = renderer.createNode({
    x: 400,
    y: 40,
    width: 50,
    height: 50,
    color: 0x0ffffffff,
    parent: testRoot,
  });

  new Array(90).fill(0).forEach((_, i) => {
    renderer.createNode({
      parent: rootRenderToTextureNode,
      x: (i % 15) * 120 + 50,
      y: Math.floor(i / 15) * 140 + 150,
      width: 120,
      height: 120,
      src: '../assets/rocko.png',
    });
  });

  const rttRotate = rootRenderToTextureNode.animate(
    {
      rotation: Math.PI / 8,
      scale: 2.2,
    },
    animationSettings,
  );

  rttRotate.start();

  const rootRectRotate = rootChildRectangle.animate(
    {
      rotation: Math.PI / 4,
      scale: 1.2,
    },
    { ...animationSettings, loop: true },
  );
  rootRectRotate.start();

  setInterval(() => {
    const colorize = rootRenderToTextureNode.animate(
      {
        colorTop: randomColor(),
        colorBottom: randomColor(),
      },
      { easing: 'ease-in', duration: 1500 },
    );
    colorize.start();
  }, 5000);
}
