import type { ExampleSettings } from '../common/ExampleSettings.js';

export async function automation(settings: ExampleSettings) {
  const page = await test(settings);
  page(1);
  await settings.snapshot();

  page(2);
  await settings.snapshot();

  page(3);
  await settings.snapshot();
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  // Create a container node
  const containerNode = renderer.createNode({
    x: 10,
    y: 100,
    width: 1000,
    height: 600,
    color: 0xff0000ff, // Red
    parent: testRoot,
  });

  const status = renderer.createTextNode({
    text: 'Strict Bound: ',
    fontSize: 30,
    x: 10,
    y: 50,
    parent: testRoot,
  });

  const amountOfNodes = 11;
  const childNodeWidth = 1700 / amountOfNodes;

  // Create 11 child nodes
  for (let i = 0; i < amountOfNodes; i++) {
    const childNode = renderer.createNode({
      x: i * childNodeWidth + i * 100,
      y: 100,
      width: childNodeWidth,
      height: 300,
      color: 0x00ff00ff, // Green
      parent: containerNode,
    });

    const nodeTest = renderer.createTextNode({
      x: 10,
      y: 130,
      text: `Node ${i}`,
      color: 0x000000ff,
      parent: childNode,
    });
  }

  renderer.on('idle', () => {
    status.text = 'Strict Bound: ' + String(containerNode.strictBounds);
  });

  window.onkeydown = (e) => {
    if (e.key === 'ArrowRight') {
      containerNode.x -= 100;
    }

    if (e.key === 'ArrowLeft') {
      containerNode.x += 100;
    }

    if (e.key === ' ') {
      containerNode.strictBounds = !containerNode.strictBounds;
    }
  };

  const page = (i = 0) => {
    switch (i) {
      case 1:
        containerNode.x = -590;
        break;

      case 2:
        containerNode.x = -1390;
        break;

      case 3:
        containerNode.strictBounds = false;
        break;
    }
  };

  return page;
}
