import type { Point } from '@lightningjs/renderer';
import type { ExampleSettings } from '../common/ExampleSettings.js';
import type { CoreNode } from '../../dist/src/core/CoreNode.js';

const getRandomValue = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
};

const getRandomColor = () => {
  const randomInt = Math.floor(Math.random() * Math.pow(2, 24)); // Use 24 bits for RGB
  const hexString = randomInt.toString(16).padStart(6, '0'); // RGB hex without alpha
  return parseInt(hexString + 'FF', 16); // Append 'FF' for full alpha
};

const getRandomBezierCurve = () => {
  // Generate random values for control points within specified ranges
  const x1 = Math.random(); // 0 to 1
  const y1 = Math.random() * 2; // Allow values above 1
  const x2 = Math.random(); // 0 to 1
  const y2 = Math.random() * 2 - 1; // Allow values between -1 and 1

  // Return the Bezier curve in the required format
  return `cubic-bezier(${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(
    2,
  )}, ${y2.toFixed(2)})`;
};

export default async function ({ renderer, testRoot }: ExampleSettings) {
  const holder = renderer.createNode({
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    color: 0x000000ff,
    parent: testRoot,
  });

  // Copy source texture from rootRenderToTextureNode
  for (let i = 0; i < 50; i++) {
    const dimension = getRandomValue(30, 150);
    const node = renderer.createNode({
      parent: holder,
      x: getRandomValue(0, 1820),
      y: getRandomValue(0, 980),
      width: dimension,
      height: dimension,
      color: getRandomColor(),
      interactive: true,
      zIndex: getRandomValue(0, 100),
    });

    node
      .animate(
        {
          x: getRandomValue(0, 1820),
          y: getRandomValue(0, 980),
        },
        {
          duration: getRandomValue(8000, 12000),
          delay: getRandomValue(0, 5000),
          stopMethod: 'reverse',
          loop: true,
          easing: getRandomBezierCurve(),
        },
      )
      .start();
  }

  document.addEventListener('touchstart', (e: TouchEvent) => {
    const { changedTouches } = e;
    if (changedTouches.length) {
      const touch = changedTouches.item(0);

      const x = touch?.clientX ?? 0;
      const y = touch?.clientY ?? 0;

      const eventData: Point = {
        x,
        y,
      };
      // const nodes: CoreNode[] = renderer.stage.findNodesAtPoint(eventData);
      const topNode: CoreNode | null =
        renderer.stage.getNodeFromPosition(eventData);

      if (topNode) {
        topNode.scale = 1.5;
        setTimeout(() => {
          topNode.scale = 1;
        }, 150);
      }
    }
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    const x = e?.clientX ?? 0;
    const y = e?.clientY ?? 0;

    const eventData: Point = {
      x,
      y,
    };

    const topNode: CoreNode | null =
      renderer.stage.getNodeFromPosition(eventData);
    if (topNode) {
      topNode.scale = 1.5;
      setTimeout(() => {
        topNode.scale = 1;
      }, 150);
    }
  });
}
