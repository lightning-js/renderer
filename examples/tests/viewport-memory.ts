import type { ExampleSettings } from '../common/ExampleSettings.js';

function getRandomTitle(length = 10) {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export default async function test(settings: ExampleSettings) {
  const { renderer, testRoot } = settings;

  const containerNode = renderer.createNode({
    x: 200, // Offset from the left
    y: 200,
    w: 2000,
    h: 2000,
    color: 0x000000ff, // Black
    parent: testRoot,
    clipping: true,
  });

  const redCircle = renderer.createNode({
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    color: 0xff0000ff,
    shader: renderer.createShader('RoundedRectangle', {
      radius: 50,
    }),
    parent: testRoot,
  });

  const blueCircle = renderer.createNode({
    x: 150,
    y: 0,
    w: 100,
    h: 100,
    color: 0x0000ffff,
    shader: renderer.createShader('RoundedRectangle', {
      radius: 50,
    }),
    parent: testRoot,
  });

  const yellowCircle = renderer.createNode({
    x: 300,
    y: 0,
    w: 100,
    h: 100,
    color: 0xffff00ff,
    shader: renderer.createShader('RoundedRectangle', {
      radius: 50,
    }),
    parent: testRoot,
  });

  const spawnRow = function (rowIndex = 0, amount = 20) {
    let totalWidth = 0; // Track the total width used in the current row
    const gap = 10; // Define the gap between items

    // Create the row indicator (channel number)
    const channelIndicator = renderer.createTextNode({
      x: -60, // Position the indicator to the left of the row
      y: rowIndex * 100 + 40, // Center vertically in the row
      text: `Row ${rowIndex + 1}`, // Display channel number
      color: 0xffffffff, // White color for the indicator
      parent: containerNode,
    });

    for (let i = 0; i < amount; i++) {
      const randomWidth = Math.floor(Math.random() * 401) + 100; // Unique width between 100 and 500
      totalWidth += randomWidth + gap; // Include gap in total width calculation

      // Generate a random title with a random length between 5 and 15 characters
      const title = getRandomTitle(Math.floor(Math.random() * 11) + 10); // Random length between 5 and 15

      // Create a black rectangle to serve as the border
      const borderNode = renderer.createNode({
        x: totalWidth - randomWidth - gap, // Adjust position by subtracting the gap
        y: rowIndex * 100,
        w: randomWidth + gap, // Width of the black rectangle to include the gap
        h: 100, // Height of the border
        color: 0x000000ff, // Black
        parent: containerNode,
        clipping: true,
      });

      // Create the green node slightly smaller than the black rectangle
      const childNode = renderer.createNode({
        x: 5, // Offset for the green node to mimic a border
        y: 5, // Offset for the green node to mimic a border
        w: randomWidth, // Width of the green node
        h: 90, // Slightly smaller height
        color: 0x00ff00ff, // Green
        parent: borderNode,
        shader: renderer.createShader('RoundedRectangle', {
          radius: 10,
        }),
      });

      // Create text node inside the green node
      const nodeTest = renderer.createTextNode({
        x: 10,
        y: 10, // Center text vertically in the green node
        text: title,
        color: 0x000000ff,
        parent: childNode,
      });
    }
  };

  // Generate up to 200 rows
  for (let rowIndex = 0; rowIndex < 200; rowIndex++) {
    console.log(`Spawning row ${rowIndex + 1}`);
    spawnRow(rowIndex);
  }
}
