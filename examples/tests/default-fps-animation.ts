/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast Cable Communications Management, LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { IAnimationController, INode } from '@lightningjs/renderer';
import type { ExampleSettings } from '../common/ExampleSettings.js';

/**
 * Global FPS Throttling Demo
 *
 * This example demonstrates the global targetFPS setting that throttles the entire
 * render loop. It shows multiple animations running simultaneously, all affected
 * by the global FPS limit.
 *
 * Controls:
 * - Number keys 1-9: Set FPS limits (10, 15, 20, 24, 25, 30, 45, 60, 120)
 * - 0: Remove FPS limit (unlimited)
 * - Space: Toggle all animations on/off
 */
export default async function ({ renderer, testRoot }: ExampleSettings) {
  const backgroundNode = renderer.createNode({
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    color: 0x1a1a1aff,
    parent: testRoot,
  });

  // Title
  renderer.createTextNode({
    parent: backgroundNode,
    x: 50,
    y: 50,
    fontFamily: 'Ubuntu',
    fontSize: 48,
    text: 'Global FPS Throttling Demo',
    color: 0xffffffff,
  });

  // FPS display
  const fpsDisplayNode = renderer.createTextNode({
    parent: backgroundNode,
    x: 50,
    y: 120,
    fontFamily: 'Ubuntu',
    fontSize: 32,
    text: `Current FPS Limit: ${
      renderer.targetFPS === 0 ? 'Unlimited' : renderer.targetFPS
    }`,
    color: 0x00ff00ff,
  });

  // Instructions
  renderer.createTextNode({
    parent: backgroundNode,
    x: 50,
    y: 180,
    fontFamily: 'Ubuntu',
    fontSize: 20,
    text: 'Press 1-9 for FPS limits (10-120), 0 for unlimited, Space to toggle animations',
    color: 0xccccccff,
  });

  // Performance stats
  const statsNode = renderer.createTextNode({
    parent: backgroundNode,
    x: 50,
    y: 220,
    fontFamily: 'Ubuntu',
    fontSize: 18,
    text: 'Actual FPS: Calculating...',
    color: 0xffff00ff,
  });

  // Create multiple animated objects to demonstrate the global effect
  const animatedObjects: Array<{
    node: INode;
    animation: IAnimationController | null;
    baseX: number;
    baseY: number;
  }> = [];

  // Create a grid of animated objects
  const colors = [
    0xff0000ff, 0x00ff00ff, 0x0000ffff, 0xffff00ff, 0xff00ffff, 0x00ffffff,
  ];
  const gridSize = 6;
  const spacing = 120;
  const startX = 300;
  const startY = 300;

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x = startX + col * spacing;
      const y = startY + row * spacing;
      const colorIndex = (row * gridSize + col) % colors.length;
      const color = colors[colorIndex];

      if (color !== undefined) {
        const animatedNode = renderer.createNode({
          x,
          y,
          width: 60,
          height: 60,
          color,
          parent: backgroundNode,
        });

        animatedObjects.push({
          node: animatedNode,
          animation: null,
          baseX: x,
          baseY: y,
        });
      }
    }
  }

  // Create a rotating object
  const rotatingNode = renderer.createNode({
    x: 1500,
    y: 400,
    width: 100,
    height: 100,
    color: 0xffa500ff,
    parent: backgroundNode,
    pivot: 0.5,
  });

  // Create a scaling object
  const scalingNode = renderer.createNode({
    x: 1650,
    y: 400,
    width: 80,
    height: 80,
    color: 0x9400d3ff,
    parent: backgroundNode,
    pivot: 0.5,
  });

  // Animation controllers
  let animationsRunning = true;
  let rotationAnimation: IAnimationController | null = null;
  let scalingAnimation: IAnimationController | null = null;

  // FPS tracking
  let frameCount = 0;
  let lastTime = performance.now();
  let actualFPS = 0;

  // Function to start all animations
  const startAnimations = () => {
    // Start grid animations with simple back-and-forth motion
    animatedObjects.forEach((obj, index) => {
      const delay = index * 50; // Stagger the animations
      const duration = 2000; // Standard duration

      // Create simple horizontal motion
      const targetX = obj.baseX + 80; // Move 80 pixels to the right

      obj.animation = obj.node.animate(
        { x: targetX },
        {
          duration,
          delay,
          loop: true,
          easing: 'ease-in-out',
        },
      );
      obj.animation.start();
    });

    // Start rotation animation
    rotationAnimation = rotatingNode.animate(
      { rotation: Math.PI * 2 },
      {
        duration: 2000,
        loop: true,
        easing: 'linear',
      },
    );
    rotationAnimation.start();

    // Start scaling animation
    scalingAnimation = scalingNode.animate(
      { scaleX: 1.5, scaleY: 1.5 },
      {
        duration: 2000,
        loop: true,
        easing: 'ease-in-out',
      },
    );
    scalingAnimation.start();
  };

  // Function to stop all animations
  const stopAnimations = () => {
    animatedObjects.forEach((obj) => {
      if (obj.animation) {
        obj.animation.stop();
        obj.animation = null;
      }
    });

    if (rotationAnimation) {
      rotationAnimation.stop();
      rotationAnimation = null;
    }

    if (scalingAnimation) {
      scalingAnimation.stop();
      scalingAnimation = null;
    }
  };

  // FPS options mapping
  const fpsOptions = [
    0, // 0 = unlimited
    5, // 1
    10, // 2
    15, // 3
    20, // 4
    24, // 5
    30, // 6
    40, // 7
    45, // 8
    60, // 9
  ];

  // Function to set FPS limit
  const setFPSLimit = (fps: number) => {
    renderer.targetFPS = fps;
    fpsDisplayNode.text = `Current FPS Limit: ${fps === 0 ? 'Unlimited' : fps}`;
    console.log(`Global FPS limit set to: ${fps === 0 ? 'Unlimited' : fps}`);
  };

  // Function to update performance stats
  const updateStats = () => {
    frameCount++;
    const currentTime = performance.now();
    const deltaTime = currentTime - lastTime;

    if (deltaTime >= 1000) {
      // Update every second
      actualFPS = Math.round((frameCount * 1000) / deltaTime);
      statsNode.text = `Actual FPS: ${actualFPS} | Target: ${
        renderer.targetFPS === 0 ? 'Unlimited' : renderer.targetFPS
      }`;
      frameCount = 0;
      lastTime = currentTime;
    }

    requestAnimationFrame(updateStats);
  };

  // Start performance monitoring
  updateStats();

  // Event handlers
  window.addEventListener('keydown', (event) => {
    const key = event.key;

    if (key >= '0' && key <= '9') {
      const index = parseInt(key);
      const targetFPS = fpsOptions[index];
      if (targetFPS !== undefined) {
        setFPSLimit(targetFPS);
      }
    } else if (key === ' ') {
      event.preventDefault();
      animationsRunning = !animationsRunning;

      if (animationsRunning) {
        startAnimations();
        console.log('Animations started');
      } else {
        stopAnimations();
        console.log('Animations stopped');
      }
    }
  });

  // Start with animations running
  startAnimations();

  // Add visual feedback labels
  renderer.createTextNode({
    parent: backgroundNode,
    x: startX,
    y: startY - 40,
    fontFamily: 'Ubuntu',
    fontSize: 24,
    text: 'Animated Grid',
    color: 0xffffffff,
  });

  renderer.createTextNode({
    parent: backgroundNode,
    x: 1450,
    y: 350,
    fontFamily: 'Ubuntu',
    fontSize: 20,
    text: 'Rotation',
    color: 0xffffffff,
  });

  renderer.createTextNode({
    parent: backgroundNode,
    x: 1600,
    y: 350,
    fontFamily: 'Ubuntu',
    fontSize: 20,
    text: 'Scaling',
    color: 0xffffffff,
  });

  // Add performance comparison info
  renderer.createTextNode({
    parent: backgroundNode,
    x: 50,
    y: 950,
    fontFamily: 'Ubuntu',
    fontSize: 16,
    text: 'Lower FPS = choppier animation, Higher FPS = smoother animation\nGlobal throttling affects ALL animations simultaneously',
    color: 0x888888ff,
  });

  console.log('Global FPS Throttling Demo loaded');
  console.log('Use number keys 0-9 to change FPS limits');
  console.log('Use space bar to toggle animations');
}
