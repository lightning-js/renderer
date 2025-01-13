import type { INode, ITextNode } from '../../dist/exports/index.js';
import type { ExampleSettings } from '../common/ExampleSettings.js';

export const Colors = {
  Black: 0x000000ff,
  Red: 0xff0000ff,
  Green: 0x00ff00ff,
  Blue: 0x0000ffff,
  Magenta: 0xff00ffff,
  Gray: 0x7f7f7fff,
  White: 0xffffffff,
};

const textureType = ['Image', 'Color', 'Text', 'Gradient'];

const gradients = [
  'colorTl',
  'colorTr',
  'colorBl',
  'colorBr',
  'colorTop',
  'colorBottom',
  'colorLeft',
  'colorRight',
  'color',
];

export default async function ({ renderer, testRoot }: ExampleSettings) {
  const screenWidth = 1920;
  const screenHeight = 1080;
  const totalImages = 1000;

  // Calculate the grid dimensions for square images
  const gridSize = Math.ceil(Math.sqrt(totalImages)); // Approximate grid size
  const imageSize = Math.floor(
    Math.min(screenWidth / gridSize, screenHeight / gridSize),
  ); // Square size

  // Create a root node for the grid
  const gridNode = renderer.createNode({
    x: 0,
    y: 0,
    width: screenWidth,
    height: screenHeight,
    parent: testRoot,
  });

  // Create and position images in the grid
  new Array(totalImages).fill(0).forEach((_, i) => {
    const x = (i % gridSize) * imageSize;
    const y = Math.floor(i / gridSize) * imageSize;

    // pick a random texture type
    const texture = textureType[Math.floor(Math.random() * textureType.length)];

    // pick a random color from Colors
    const clr =
      Object.values(Colors)[
        Math.floor(Math.random() * Object.keys(Colors).length)
      ];

    const node = {
      parent: gridNode,
      x,
      y,
      width: imageSize,
      height: imageSize,
    } as Partial<INode> | Partial<ITextNode>;

    if (texture === 'Image') {
      node.src = `https://picsum.photos/id/${i}/${imageSize}/${imageSize}`;
    } else if (texture === 'Text') {
      (node as Partial<ITextNode>).text = `Text ${i}`;
      (node as Partial<ITextNode>).fontSize = 18;
      node.color = clr;
    } else if (texture === 'Gradient') {
      const gradient = gradients[Math.floor(Math.random() * gradients.length)];
      // @ts-ignore
      node[gradient] = clr;

      const secondGradient =
        gradients[Math.floor(Math.random() * gradients.length)];
      const secondColor =
        Object.values(Colors)[
          Math.floor(Math.random() * Object.keys(Colors).length)
        ];

      // @ts-ignore
      node[secondGradient] = secondColor;
    } else {
      node.color = clr;
    }

    if (texture === 'Text') {
      renderer.createTextNode(node as ITextNode);
    } else {
      renderer.createNode(node);
    }
  });
}
