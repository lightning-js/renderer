/*
 * Visual Regression Test: Autosize System
 *
 * This test demonstrates various autosize scenarios for visual regression testing.
 * All tests are 200x200px and arranged in a grid across a 1080p screen.
 */

import type { ExampleSettings } from '../common/ExampleSettings.js';
import rockoImg from '../assets/rocko.png';

export async function automation(settings: ExampleSettings) {
  // Snapshot single page
  await autosizeExample(settings);
  await settings.snapshot();
}

export default async function autosizeExample({
  renderer,
  testRoot,
}: ExampleSettings) {
  const rootNode = testRoot;

  // Helper function to create text label
  const createLabel = (text: string, x: number, y: number) => {
    return renderer.createTextNode({
      x,
      y,
      text: text,
      fontSize: 20,
      fontFamily: 'sans-serif',
      color: 0xffffffff,
      parent: rootNode,
    });
  };

  // Test 1: Autosize parent with 2 children
  createLabel('1. Parent w/ 2 children', 50, 50);
  const test1Parent = renderer.createNode({
    x: 50,
    y: 80,
    color: 0x00ff0088,
    autosize: true,
    parent: rootNode,
  });
  renderer.createNode({
    x: 10,
    y: 10,
    w: 80,
    h: 60,
    color: 0xff0000ff,
    parent: test1Parent,
  });
  renderer.createNode({
    x: 100,
    y: 80,
    w: 70,
    h: 50,
    color: 0x0000ffff,
    parent: test1Parent,
  });

  // Test 2: Autosize parent with 1 child, later added child
  createLabel('2:  add 2nd', 300, 50);
  const test2Parent = renderer.createNode({
    x: 300,
    y: 80,
    color: 0x00ff0088,
    autosize: true,
    parent: rootNode,
  });
  renderer.createNode({
    x: 20,
    y: 20,
    w: 60,
    h: 50,
    color: 0xff0000ff,
    parent: test2Parent,
  });
  // Add second child after 500ms
  setTimeout(() => {
    renderer.createNode({
      x: 90,
      y: 70,
      w: 80,
      h: 60,
      color: 0x0000ffff,
      parent: test2Parent,
    });
  }, 200);

  // Test 3: Autosize parent with 2 children, child 1 position updated
  createLabel('3: Update position', 550, 50);
  const test3Parent = renderer.createNode({
    x: 550,
    y: 80,
    color: 0x00ff0088,
    autosize: true,
    parent: rootNode,
  });
  const test3Child1 = renderer.createNode({
    x: 20,
    y: 20,
    w: 60,
    h: 50,
    color: 0xff0000ff,
    parent: test3Parent,
  });
  renderer.createNode({
    x: 50,
    y: 80,
    w: 70,
    h: 40,
    color: 0x0000ffff,
    parent: test3Parent,
  });

  // Move child after 500ms
  setTimeout(() => {
    test3Child1.x = 100;
    test3Child1.y = 100;
  }, 200);

  // Test 4: Autosize parent with 2 children, 1 child alpha 0
  createLabel('4: child alpha=0', 800, 50);
  const test4Parent = renderer.createNode({
    x: 800,
    y: 80,
    color: 0x00ff0088,
    autosize: true,
    parent: rootNode,
  });
  renderer.createNode({
    x: 20,
    y: 20,
    w: 60,
    h: 50,
    color: 0xff0000ff,
    alpha: 1,
    parent: test4Parent,
  });
  renderer.createNode({
    x: 90,
    y: 70,
    w: 80,
    h: 60,
    alpha: 0,
    color: 0x0000ffff,
    parent: test4Parent,
  });

  // Test 5: Autosize parent with 2 children, off screen then moved into screen
  createLabel('5: Off-screen then on', 1050, 50);
  const test5Parent = renderer.createNode({
    x: -500,
    y: -500,
    color: 0x00ff0088,
    autosize: true,
    parent: rootNode,
  });
  renderer.createNode({
    x: 20,
    y: 20,
    w: 60,
    h: 50,
    color: 0xff0000ff,
    parent: test5Parent,
  });
  renderer.createNode({
    x: 90,
    y: 70,
    w: 80,
    h: 60,
    color: 0x0000ffff,
    parent: test5Parent,
  });

  // Move into screen after 500ms
  setTimeout(() => {
    test5Parent.x = 1050;
    test5Parent.y = 80;
  }, 200);

  // Test 6: Autosize parent with 2 children, later removed child
  createLabel('6: Remove child later', 1300, 50);
  const test6Parent = renderer.createNode({
    x: 1300,
    y: 80,
    color: 0x00ff0088,
    autosize: true,
    parent: rootNode,
  });
  renderer.createNode({
    x: 20,
    y: 20,
    w: 60,
    h: 50,
    color: 0xff0000ff,
    parent: test6Parent,
  });
  const test6Child2 = renderer.createNode({
    x: 90,
    y: 70,
    w: 80,
    h: 60,
    color: 0x0000ffff,
    parent: test6Parent,
  });
  // Remove child after 500ms
  setTimeout(() => {
    test6Child2.parent = null;
  }, 200);

  // Test 7: Autosize OFF, parent with 2 children
  createLabel('7: Autosize=false', 50, 350);
  const test7Parent = renderer.createNode({
    x: 50,
    y: 380,
    w: 100,
    h: 100,
    color: 0x00ff0088,
    autosize: false,
    parent: rootNode,
  });
  renderer.createNode({
    x: 20,
    y: 20,
    w: 60,
    h: 50,
    color: 0xff0000ff,
    parent: test7Parent,
  });
  renderer.createNode({
    x: 90,
    y: 70,
    w: 80,
    h: 60,
    color: 0x0000ffff,
    parent: test7Parent,
  });

  // Test 8a: Texture with autosize true
  createLabel('8a: Texture autosize=true', 300, 350);
  renderer.createNode({
    x: 300,
    y: 380,
    color: 0xff00ff88,
    autosize: true,
    src: rockoImg,
    parent: rootNode,
  });

  // Test 8b: Texture with autosize false
  createLabel('8b: Texture autosize=false', 550, 350);
  renderer.createNode({
    x: 550,
    y: 380,
    w: 100,
    h: 100,
    color: 0xff00ff88,
    autosize: false,
    src: rockoImg,
    parent: rootNode,
  });

  console.log('All autosize tests created.');
}
