/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2025 Comcast Cable Communications Management, LLC.
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

import type { ExampleSettings } from '../common/ExampleSettings.js';

export async function automation(settings: ExampleSettings) {
  await test(settings);
  await settings.snapshot();
}

/**
 * Side-by-side comparison of textBaseline vs Canvas textBaseline
 *
 * This test compares SDF textBaseline implementation with Canvas implementation
 * to ensure consistency between the two renderers.
 */
export default async function test({ renderer, testRoot }: ExampleSettings) {
  const fontSize = 36;
  const fontFamily = 'Ubuntu';
  const testText = 'Aygjp';

  // Common Y position for alignment comparison
  const alignmentY = 50; // Position within each text node
  const textNodeHeight = 80; // Height of each text node container

  const view = renderer.createNode({
    x: 0,
    y: 0,
    width: 1250,
    height: 600,
    color: 0xf8f8f8ff,
    parent: testRoot,
  });

  // Create a main reference line across the screen
  renderer.createNode({
    x: 0,
    y: 170 + alignmentY / 2 + 1, // Global position where text Y coordinate should be
    width: view.width,
    height: 2,
    color: 0xff0000ff,
    parent: view,
  });

  // Title
  renderer.createTextNode({
    text: 'textBaseline: SDF vs Canvas Comparison',
    x: 20,
    y: 50,
    fontSize: 24,
    fontFamily,
    color: 0x000000ff,
    parent: view,
  });

  renderer.createTextNode({
    text: 'SDF Renderer',
    x: 20,
    y: 100,
    fontSize: 20,
    fontFamily,
    color: 0x0066ccff,
    parent: view,
  });

  renderer.createTextNode({
    text: 'Canvas Renderer',
    x: 630,
    y: 100,
    fontSize: 20,
    fontFamily,
    color: 0xcc6600ff,
    parent: view,
  });

  // Test different baselines
  const baselines: Array<
    'alphabetic' | 'top' | 'middle' | 'bottom' | 'hanging' | 'ideographic'
  > = ['alphabetic', 'top', 'middle', 'bottom', 'hanging', 'ideographic'];

  baselines.forEach(async (baseline, index) => {
    const xOffset = index * 100;
    const rowY = 170; // Y position of the text node containers

    // Create container nodes for each text to show the bounds
    const sdfContainer = renderer.createNode({
      x: 30 + xOffset,
      y: rowY,
      width: 95,
      height: textNodeHeight,
      color: 0x0066cc20, // Semi-transparent blue
      parent: view,
    });

    const canvasContainer = renderer.createNode({
      x: 630 + xOffset,
      y: rowY,
      width: 95,
      height: textNodeHeight,
      color: 0xcc660020, // Semi-transparent orange
      parent: view,
    });

    // SDF version (positioned within its container)
    renderer.createTextNode({
      text: testText,
      height: textNodeHeight,
      fontSize,
      fontFamily,
      textBaseline: baseline,
      color: 0x0066ccff,
      parent: sdfContainer,
    });

    // Canvas version (positioned within its container)
    renderer.createTextNode({
      text: testText,
      height: textNodeHeight,
      fontSize,
      fontFamily,
      textBaseline: baseline,
      textRendererOverride: 'canvas',
      color: 0xcc6600ff,
      parent: canvasContainer,
    });

    // Baseline label for SDF column
    renderer.createTextNode({
      text: baseline,
      x: 30 + xOffset,
      y: 150,
      fontSize: 12,
      fontFamily,
      textBaseline: 'alphabetic',
      color: 0x666666ff,
      parent: view,
    });

    // Baseline label for Canvas column
    renderer.createTextNode({
      text: baseline,
      x: 630 + xOffset,
      y: 150,
      fontSize: 12,
      fontFamily,
      textBaseline: 'alphabetic',
      color: 0x666666ff,
      parent: view,
    });
  });

  // Description of the test
  renderer.createTextNode({
    text: 'Blue: SDF Renderer, Orange: Canvas Renderer',
    x: 50,
    y: 350,
    fontSize: 16,
    fontFamily,
    color: 0x333333ff,
    parent: view,
  });

  renderer.createTextNode({
    text: 'Text should align relative red line based on textBaseline.',
    x: 50,
    y: 380,
    fontSize: 16,
    fontFamily,
    color: 0x333333ff,
    parent: view,
  });
}
