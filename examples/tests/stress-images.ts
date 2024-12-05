import type { ExampleSettings } from '../common/ExampleSettings.js';

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

    renderer.createNode({
      parent: gridNode,
      x,
      y,
      width: imageSize,
      height: imageSize,
      src: `https://picsum.photos/id/${i}/${imageSize}/${imageSize}`, // Random images
    });
  });
}
