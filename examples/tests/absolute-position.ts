import type { INode } from '@lightningjs/renderer';
import type { ExampleSettings } from '../common/ExampleSettings.js';

export default async function ({ renderer, testRoot }: ExampleSettings) {
  function createTextNode(container: INode, label?: string | undefined) {
    const textNode = renderer.createTextNode({
      x: 10,
      y: 10,
      text: `${label ? label + '\n' : ''}X: ${container.x} => absX: ${
        container.absX
      }\nY: ${container.y} => absY: ${container.absY}\nMountX: ${
        container.mountX
      } | MountY: ${container.mountY}`,
      parent: container,
    });
    return textNode;
  }

  /* Create a grid to show the values */
  for (let index = 1; index <= Math.ceil(testRoot.width / 100); index++) {
    renderer.createNode({
      x: index * 100,
      y: 0,
      width: 2,
      height: testRoot.height,
      color: index % 5 ? 0xffffff40 : 0xffffffa0,
      parent: testRoot,
    });
  }
  for (let index = 1; index <= Math.ceil(testRoot.height / 100); index++) {
    renderer.createNode({
      x: 0,
      y: index * 100,
      width: testRoot.width,
      height: 2,
      color: index % 5 ? 0xffffff40 : 0xffffffa0,
      parent: testRoot,
    });
  }

  const defaultRect = renderer.createNode({
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    mountX: 0,
    color: 0x00ff00ff,
    parent: testRoot,
  });
  createTextNode(defaultRect, 'Default');

  const mount1Rect = renderer.createNode({
    x: 600,
    y: 200,
    width: 200,
    height: 200,
    color: 0x0000ffff,
    mount: 1,
    parent: testRoot,
  });
  createTextNode(mount1Rect, 'Mount 1');

  const scaleRect = renderer.createNode({
    x: 700,
    y: 100,
    width: 200,
    height: 200,
    scale: 1.2,
    color: 0xff0000ff,
    parent: testRoot,
  });
  createTextNode(scaleRect, 'Scale 1.2');

  const rotationPivot0Rect = renderer.createNode({
    x: 1100,
    y: 100,
    width: 200,
    height: 200,
    rotation: Math.PI / 6,
    pivot: 0,
    color: 0xff0000ff,
    parent: testRoot,
  });
  createTextNode(rotationPivot0Rect, 'Rotation Pivot 0');

  const rotationPivot1Rect = renderer.createNode({
    x: 1300,
    y: 100,
    width: 200,
    height: 200,
    rotation: Math.PI / 6,
    pivot: 1,
    color: 0xff0000ff,
    parent: testRoot,
  });
  createTextNode(rotationPivot1Rect, 'Rotation Pivot 1');

  const mountX1Rect = renderer.createNode({
    x: 300,
    y: 500,
    width: 200,
    height: 200,
    color: 0x0000ffff,
    mountX: 1,
    mountY: 0,
    parent: testRoot,
  });
  createTextNode(mountX1Rect, 'MountX 1');

  const mountY1Rect = renderer.createNode({
    x: 400,
    y: 600,
    width: 200,
    height: 200,
    color: 0x0000ffff,
    mountX: 0,
    mountY: 1,
    parent: testRoot,
  });
  createTextNode(mountY1Rect, 'MountY 1');

  const mountThirdRect = renderer.createNode({
    x: 700,
    y: 600,
    width: 200,
    height: 200,
    color: 0x0000ffff,
    mountX: 0.33,
    mountY: 0.66,
    parent: testRoot,
  });
  createTextNode(mountThirdRect, 'MountX 0.33 MountY 0.66');

  const mountScaleRect = renderer.createNode({
    x: 1200,
    y: 600,
    width: 200,
    height: 200,
    color: 0x0000ffff,
    mountX: 1,
    mountY: 0.5,
    scale: 1.5,
    parent: testRoot,
  });
  createTextNode(mountScaleRect, 'Mount and Scale 1.5');
}
