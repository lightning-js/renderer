/*
 * Example: Unified Autosize System Demo
 *
 * This example demonstrates the unified autosize system that automatically
 * chooses between texture-based autosize and children-based autosize.
 */

import type { ExampleSettings } from '../common/ExampleSettings.js';
import rockoImg from '../assets/rocko.png';

export default async function autosizeExample({
  renderer,
  testRoot,
}: ExampleSettings) {
  console.log('Starting Unified Autosize Example...');

  const rootNode = testRoot;

  // Create an autosize parent container (children mode)
  const childrenContainer = renderer.createNode({
    x: 50,
    y: 50,
    color: 0x00ff00ff, // Green background
    autosize: true, // Enable unified autosize (will use children mode since no texture)
  });

  console.log('Created children autosize container', childrenContainer.id);

  // Create several child nodes at different positions
  const child1 = renderer.createNode({
    x: 0,
    y: 0,
    w: 100,
    h: 50,
    color: 0xff0000ff, // Red
  });

  const child2 = renderer.createNode({
    x: 120,
    y: 30,
    w: 80,
    h: 70,
    color: 0x0000ffff, // Blue
  });

  const child3 = renderer.createNode({
    x: 50,
    y: 80,
    w: 150,
    h: 40,
    color: 0xffff00ff, // Yellow
  });

  // Add children to the autosize container
  child1.parent = childrenContainer;
  child2.parent = childrenContainer;
  child3.parent = childrenContainer;

  // Add the container to the root
  childrenContainer.parent = rootNode;

  console.log('Initial children container size:', {
    w: childrenContainer.w,
    h: childrenContainer.h,
  });

  // Create texture autosize example
  const textureContainer = renderer.createNode({
    x: 600,
    y: 50,
    color: 0xff00ffff, // Magenta background
    autosize: true, // Will use texture mode when texture is loaded
    src: rockoImg, // This will trigger texture autosize
    parent: rootNode,
  });

  console.log('Texture container initial size:', {
    w: textureContainer.w,
    h: textureContainer.h,
  });

  // Wait for texture to load before checking dimensions
  textureContainer.on('loaded', () => {
    console.log('Texture loaded! Container size:', {
      w: textureContainer.w,
      h: textureContainer.h,
    });
  });

  // Trigger a render update to calculate autosize
  await new Promise((resolve) => setTimeout(resolve, 200));

  console.log('After initial setup:');
  console.log('Children container:', {
    w: childrenContainer.w,
    h: childrenContainer.h,
  });
  console.log('Texture container:', {
    w: textureContainer.w,
    h: textureContainer.h,
  });
  console.log('Children container should encompass all children bounds');
  console.log('Texture container size depends on texture load state');

  const children = [child1, child2, child3];

  window.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
      // On spacebar, add a new child to the children container
      // child1.x = Math.random() * 300;
      // child1.y = Math.random() * 300;

      // pick a random child to move
      const childToMove = children[Math.floor(Math.random() * children.length)];
      if (!childToMove) return;

      childToMove.x = Math.random() * 300;
      childToMove.y = Math.random() * 200;
    }

    if (e.key === 'a') {
      // add a child outside the boundary of the current childrenContainer to force
      // it to resize larger
      const newChild = renderer.createNode({
        x: childrenContainer.x + childrenContainer.w + Math.random() * 50,
        y: childrenContainer.y + childrenContainer.h + Math.random() * 30,
        w: 50 + Math.random() * 100,
        h: 30 + Math.random() * 70,
        color: Math.floor(Math.random() * 0xffffff) | 0xff000000,
        parent: childrenContainer,
      });
      children.push(newChild);
      console.log('Added new child, updated container size:', {
        w: childrenContainer.w,
        h: childrenContainer.h,
      });
    }

    if (e.key === 'r') {
      // On 'r' key, remove the last child added
      const childToRemove = children.pop();
      if (childToRemove) {
        childToRemove.parent = null;
        console.log('Removed a child, updated container size:', {
          w: childrenContainer.w,
          h: childrenContainer.h,
        });
      }
    }
  });
}
