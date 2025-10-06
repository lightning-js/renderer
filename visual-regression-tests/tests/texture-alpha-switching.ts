import type { INode, RendererMainSettings } from '@lightningjs/renderer';
import type { ExampleSettings } from '../common/ExampleSettings.js';

export function customSettings(): Partial<RendererMainSettings> {
  return {
    textureMemory: {
      cleanupInterval: 5000,
      criticalThreshold: 13e6,
      baselineMemoryAllocation: 5e6,
      doNotExceedCriticalThreshold: true,
      debugLogging: false,
    },
  };
}

export default async function ({ renderer, testRoot }: ExampleSettings) {
  const holder1 = renderer.createNode({
    x: 150,
    y: 150,
    parent: testRoot,
    // src: 'https://images.unsplash.com/photo-1690360994204-3d10cc73a08d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80',
    alpha: 0,
  });

  const nodeWidth = 200;
  const nodeHeight = 200;
  const gap = 10; // Define the gap between items

  const spawnRow = function (rowIndex = 0, amount = 8) {
    const y = rowIndex * (nodeHeight + gap);

    const rowNode = renderer.createNode({
      x: 0,
      y: y,
      parent: holder1,
      color: 0x000000ff,
    });

    for (let i = 0; i < amount; i++) {
      const id = rowIndex * amount + i;

      const childNode = renderer.createNode({
        x: i * nodeWidth, // Adjust position by subtracting the gap
        y: 0,
        w: nodeWidth, // Width of the green node
        h: nodeHeight, // Slightly smaller height
        parent: rowNode,
      });

      const imageNode = renderer.createNode({
        x: 0,
        y: 0,
        w: nodeWidth,
        h: nodeHeight,
        parent: childNode,
        src: `https://picsum.photos/id/${id}/${nodeWidth}/${nodeHeight}`, // Random images
      });

      imageNode.on('failed', () => {
        console.log(`Image failed to load for node ${id}`);
        childNode.color = 0xffff00ff; // Change color to yellow on error
      });

      renderer.createTextNode({
        x: 0,
        y: 0,
        autosize: true,
        parent: childNode,
        text: `Card ${id}`,
        fontSize: 20,
        color: 0xffffffff,
      });
    }
  };

  spawnRow(0);
  spawnRow(1);
  spawnRow(2);
  spawnRow(3);

  const holder2 = renderer.createNode({
    parent: testRoot,
    // src: 'https://images.unsplash.com/photo-1690360994204-3d10cc73a08d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80',
    alpha: 1,
  });

  const img = renderer.createNode({
    w: 300,
    h: 300,
    parent: holder2,
    src: 'https://images.unsplash.com/photo-1690360994204-3d10cc73a08d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80',
    alpha: 1,
  });

  window.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      if (holder1.alpha === 1) {
        holder1.alpha = 0;
        holder2.alpha = 1;
      } else {
        holder1.alpha = 1;
        holder2.alpha = 0;
      }
    } else if (e.key === 'r' || e.key === 'R') {
      // Reset all squares in holder1 to white
      const resetSquares = (node: INode) => {
        // If this node has children, process each child
        if (node.children && node.children.length > 0) {
          for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            if (child) {
              // Set the color to white
              if (!child.src) {
                // Only change color of non-image nodes
                child.color = 0xffffffff; // White with full alpha
              }
              // Recursively process this child's children
              resetSquares(child);
            }
          }
        }
      };

      // Process all rows in holder1
      resetSquares(holder1 as INode);
      console.log('Reset all squares in holder1 to white');
    }
  });
}
