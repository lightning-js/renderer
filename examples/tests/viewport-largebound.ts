import type { ExampleSettings } from '../common/ExampleSettings.js';
import type { CoreTextNode } from '../../dist/src/core/CoreTextNode.js';
import type { INode } from '../../dist/exports/index.js';

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
    x: -100,
    y: -100,
    w: 2040,
    h: 1280,
    color: 0xff0000ff, // Red
    parent: testRoot,
    clipping: true,
  });

  const nodeStatus = renderer.createTextNode({
    text: '',
    fontSize: 30,
    x: 10,
    y: 580,
    parent: testRoot,
  });

  const amountOfNodes = 11;
  const childNodeWidth = 1700 / amountOfNodes;

  // Create 11 child nodes
  for (let i = 0; i < amountOfNodes; i++) {
    const childNode = renderer.createNode({
      x: i * childNodeWidth + i * 100,
      y: 300,
      w: childNodeWidth,
      h: 300,
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

  function processAllNodes(containerNode: INode) {
    let status =
      'Container bound: ' + JSON.stringify(containerNode.renderState) + '\n';

    for (const node of containerNode.children) {
      status += `${
        (node.children[0] as CoreTextNode)?.text
      } bound: ${JSON.stringify(node.renderState)} \n`;
    }

    nodeStatus.text = status;
    console.log(status);
  }

  renderer.on('idle', () => {
    processAllNodes(containerNode);
  });

  let curPage = 1;
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

    if (e.key === 'ArrowUp') {
      curPage = Math.min(3, curPage + 1);
      page(curPage);
    }

    if (e.key === 'ArrowDown') {
      curPage = Math.max(1, curPage - 1);
      page(curPage);
    }

    processAllNodes(containerNode);
  };

  const page = (i = 1) => {
    switch (i) {
      case 1:
        containerNode.x = -100;
        break;

      case 2:
        containerNode.x = -1390;
        break;

      case 3:
        containerNode.x = -4000;
        break;
    }

    processAllNodes(containerNode);
  };

  return page;
}
