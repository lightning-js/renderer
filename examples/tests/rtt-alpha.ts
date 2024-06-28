import type { RendererMainSettings } from '../../dist/exports/main-api.js';
import type { ExampleSettings } from '../common/ExampleSettings.js';

interface AnimationExampleSettings {
  duration: number;
  easing: string;
  delay: number;
  loop: boolean;
  stopMethod: 'reverse' | 'reset' | false;
}

const animationSettings: Partial<AnimationExampleSettings> = {
  duration: 5000,
  delay: 100,
  // loop: true,
  easing: 'linear',
};

const randomColor = () => {
  const randomInt = Math.floor(Math.random() * Math.pow(2, 32));
  const hexString = randomInt.toString(16).padStart(8, '0');
  return parseInt(hexString, 16);
};

const degToRad = (deg: number) => {
  return (Math.PI / 180) * deg;
};

const numberOfElements = 4;

export function customSettings(): Partial<RendererMainSettings> {
  return {
    boundsMargin: 300,
  };
}

export default async function ({ renderer, testRoot }: ExampleSettings) {
  const node = renderer.createNode({
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    color: 0x000000ff,
    parent: testRoot,
    alpha: 1,
  });

  const rootRenderToTextureNode = renderer.createNode({
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    parent: node,
    zIndex: 5,
    colorTop: 0xc0ffeeff,
    colorBottom: 0xbada55ff,
  });

  const noChangeText = renderer.createTextNode({
    x: 20,
    y: 40,
    color: 0xff0000ff,
    alpha: 1.0,
    text: 'NO RTT',
    fontFamily: 'NotoSans',
    fontSize: 30,
    parent: node,
    zIndex: 5,
  });

  const noRTTText = renderer.createTextNode({
    x: 20,
    y: 40,
    color: 0xff0000ff,
    alpha: 1.0,
    text: 'NO RTT',
    fontFamily: 'NotoSans',
    fontSize: 30,
    parent: node,
    zIndex: 5,
  });

  const RTTText = renderer.createTextNode({
    x: 550,
    y: 40,
    color: 0xff0000ff,
    alpha: 1.0,
    text: 'RTT',
    fontFamily: 'NotoSans',
    fontSize: 30,
    parent: node,
    zIndex: 5,
  });

  const RTTOutText = renderer.createTextNode({
    x: 950,
    y: 40,
    color: 0xff0000ff,
    alpha: 1.0,
    text: 'RTT Out of Bounds',
    fontFamily: 'NotoSans',
    fontSize: 30,
    parent: node,
    zIndex: 5,
  });

  // NO RTT
  new Array(numberOfElements).fill(0).forEach((_, i) => {
    const a = renderer.createNode({
      parent: rootRenderToTextureNode,
      x: (i % 15) * 120 + 20,
      y: 1080 + 120,
      width: 120,
      height: 120,
      scale: 1,
      alpha: 0,
    });
    const b = renderer.createNode({
      parent: a,
      x: 0,
      y: 0,
      width: 120,
      height: 120,
      rtt: false,
      shader: renderer.createShader('DynamicShader', {
        effects: [
          {
            type: 'radius',
            props: {
              radius: 6,
            },
          },
        ],
      }),
    });
    const c = renderer.createNode({
      parent: b,
      x: 0,
      y: 0,
      width: 120,
      height: 120,
      scale: 1,
      // src: '../assets/rocko.png',
      src: `https://picsum.photos/id/${i + 30}/120/120`,
    });

    const animation = a.animate(
      {
        y: Math.floor(i / 15) * 120 + 150,
        alpha: 1,
      },
      animationSettings,
    );
    animation.start();
  });

  // RTT INBOUND
  new Array(numberOfElements).fill(0).forEach((_, i) => {
    const a = renderer.createNode({
      parent: rootRenderToTextureNode,
      x: (i % 15) * 120 + 520,
      y: 1080 + 120,
      width: 120,
      height: 120,
      scale: 1,
      alpha: 0,
    });
    const b = renderer.createNode({
      parent: a,
      x: 0,
      y: 0,
      width: 120,
      height: 120,
      rtt: true,
      shader: renderer.createShader('DynamicShader', {
        effects: [
          {
            type: 'radius',
            props: {
              radius: 30,
            },
          },
        ],
      }),
    });
    const c = renderer.createNode({
      parent: b,
      x: 0,
      y: 0,
      width: 130,
      height: 130,
      scale: 1,
      // src: '../assets/rocko.png',
      src: `https://picsum.photos/id/${i + 30}/130/130`,
    });

    const animation = a.animate(
      {
        y: Math.floor(i / 15) * 120 + 150,
        alpha: 1,
      },
      animationSettings,
    );
    animation.start();
  });

  // RTT NOT INBOUND
  new Array(numberOfElements).fill(0).forEach((_, i) => {
    const a = renderer.createNode({
      parent: rootRenderToTextureNode,
      x: (i % 15) * 120 + 1020,
      y: 1080 * 2,
      width: 120,
      height: 120,
      scale: 1,
      alpha: 0,
    });
    const b = renderer.createNode({
      parent: a,
      x: 0,
      y: 0,
      width: 120,
      height: 120,
      rtt: true,
    });
    const c = renderer.createNode({
      parent: b,
      x: 0,
      y: 0,
      width: 120,
      height: 120,
      scale: 1,
      src: `https://picsum.photos/id/${i + 30}/125/125`,
    });

    a.on('inBounds', (el) => {
      console.log('rect in render bounds');
    });

    a.on('outOfBounds', () => {
      console.log('rect out render bounds');
    });

    const animation = a.animate(
      {
        alpha: 1,
      },
      {
        duration: 300,
        delay: 1000,
        easing: 'linear',
      },
    );
    animation.start();

    const animationY = a.animate(
      {
        y: Math.floor(i / 15) * 120 + 150,
        // alpha: 1,
      },
      { ...animationSettings, delay: 5000 },
    );
    animationY.start();
  });
}
