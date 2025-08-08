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
 * Side-by-side comparison of verticalAlign + textBaseline combinations
 *
 * This test demonstrates how verticalAlign and textBaseline work together
 * across SDF and Canvas renderers to ensure consistency.
 */
export default async function test({ renderer, testRoot }: ExampleSettings) {
  const fontSize = 32;
  const fontFamily = 'Ubuntu';
  const testText = 'Aygjp';
  const containerHeight = 80;
  const containerWidth = 120;

  const view = renderer.createNode({
    x: 0,
    y: 0,
    width: 1400,
    height: 700,
    color: 0xf8f8f8ff,
    parent: testRoot,
  });

  // Title
  renderer.createTextNode({
    text: 'VerticalAlign + TextBaseline Combinations: SDF vs Canvas',
    x: 20,
    y: 30,
    fontSize: 24,
    fontFamily,
    color: 0x000000ff,
    parent: view,
  });

  // Column headers
  renderer.createTextNode({
    text: 'SDF Renderer',
    x: 20,
    y: 60,
    fontSize: 18,
    fontFamily,
    color: 0x0066ccff,
    parent: view,
  });

  renderer.createTextNode({
    text: 'Canvas Renderer',
    x: 700,
    y: 60,
    fontSize: 18,
    fontFamily,
    color: 0xcc6600ff,
    parent: view,
  });

  // Row headers for verticalAlign values
  const verticalAligns: Array<'top' | 'middle' | 'bottom'> = [
    'top',
    'middle',
    'bottom',
  ];
  const textBaselines: Array<'alphabetic' | 'top' | 'middle' | 'bottom'> = [
    'alphabetic',
    'top',
    'middle',
    'bottom',
  ];

  // Create reference lines for each row
  verticalAligns.forEach((vAlign, vIndex) => {
    const rowY = 120 + vIndex * 120;

    // Row label
    renderer.createTextNode({
      text: `verticalAlign: ${vAlign}`,
      x: 20,
      y: rowY - 20,
      fontSize: 14,
      fontFamily,
      color: 0x333333ff,
      parent: view,
    });

    // Create horizontal reference line for this verticalAlign value
    const referenceY =
      rowY +
      (vAlign === 'top'
        ? 0
        : vAlign === 'middle'
        ? containerHeight / 2
        : containerHeight);
    renderer.createNode({
      x: 0,
      y: referenceY,
      width: view.width,
      height: 1,
      color: vAlign === 'middle' ? 0xff0000ff : 0xff000080,
      parent: view,
    });
  });

  // Create test containers for each combination
  verticalAligns.forEach((vAlign, vIndex) => {
    textBaselines.forEach((tBaseline, tIndex) => {
      const rowY = 120 + vIndex * 120;
      const colX = tIndex * 140;

      // Column label (only for first row)
      if (vIndex === 0) {
        // Label for textBaseline SDF
        renderer.createTextNode({
          text: `textBaseline:\n${tBaseline}`,
          x: 150 + colX,
          y: 95,
          fontSize: 11,
          fontFamily,
          textAlign: 'center',
          color: 0x666666ff,
          parent: view,
        });
        // Label for textBaseline Canvas
        renderer.createTextNode({
          text: `textBaseline:\n${tBaseline}`,
          x: 830 + colX,
          y: 95,
          fontSize: 11,
          fontFamily,
          textAlign: 'center',
          color: 0x666666ff,
          parent: view,
        });
      }

      // SDF version
      const sdfContainer = renderer.createNode({
        x: 150 + colX,
        y: rowY,
        width: containerWidth,
        height: containerHeight,
        color: 0x0066cc20,
        parent: view,
      });

      // Add container border lines
      renderer.createNode({
        x: 0,
        y: 0,
        width: containerWidth,
        height: 1,
        color: 0x0066cc80,
        parent: sdfContainer,
      });
      renderer.createNode({
        x: 0,
        y: containerHeight - 1,
        width: containerWidth,
        height: 1,
        color: 0x0066cc80,
        parent: sdfContainer,
      });

      // SDF Text
      renderer.createTextNode({
        text: testText,
        width: containerWidth,
        height: containerHeight,
        fontSize,
        fontFamily,
        textBaseline: tBaseline,
        verticalAlign: vAlign,
        textAlign: 'center',
        contain: 'both',
        color: 0x0066ccff,
        parent: sdfContainer,
      });

      // Canvas version
      const canvasContainer = renderer.createNode({
        x: 830 + colX,
        y: rowY,
        width: containerWidth,
        height: containerHeight,
        color: 0xcc660020,
        parent: view,
      });

      // Add container border lines
      renderer.createNode({
        x: 0,
        y: 0,
        width: containerWidth,
        height: 1,
        color: 0xcc660080,
        parent: canvasContainer,
      });
      renderer.createNode({
        x: 0,
        y: containerHeight - 1,
        width: containerWidth,
        height: 1,
        color: 0xcc660080,
        parent: canvasContainer,
      });

      // Canvas Text
      renderer.createTextNode({
        text: testText,
        width: containerWidth,
        height: containerHeight,
        fontSize,
        fontFamily,
        textBaseline: tBaseline,
        verticalAlign: vAlign,
        textAlign: 'center',
        contain: 'both',
        textRendererOverride: 'canvas',
        color: 0xcc6600ff,
        parent: canvasContainer,
      });
    });
  });

  // Multi-line text section
  const multiLineY = 520;
  renderer.createTextNode({
    text: 'Multi-line Text Examples',
    x: 20,
    y: multiLineY - 30,
    fontSize: 18,
    fontFamily,
    color: 0x000000ff,
    parent: view,
  });

  // Multi-line examples
  verticalAligns.forEach((vAlign, index) => {
    const colX = index * 190;

    // Label SDF Multi-line
    renderer.createTextNode({
      text: `verticalAlign: ${vAlign}`,
      x: 150 + colX,
      y: multiLineY - 10,
      fontSize: 12,
      fontFamily,
      textAlign: 'center',
      color: 0x666666ff,
      parent: view,
    });
    // Label Canvas Multi-line
    renderer.createTextNode({
      text: `verticalAlign: ${vAlign}`,
      x: 830 + colX,
      y: multiLineY - 10,
      fontSize: 12,
      fontFamily,
      textAlign: 'center',
      color: 0x666666ff,
      parent: view,
    });

    // SDF Multi-line
    const sdfMultiContainer = renderer.createNode({
      x: 150 + colX,
      y: multiLineY + 5,
      width: (containerWidth * 4) / 3,
      height: 90,
      color: 0x0066cc20,
      parent: view,
    });

    renderer.createTextNode({
      text: 'Line One\nLine Two\nLine Three',
      width: (containerWidth * 4) / 3,
      height: 90,
      fontSize: 16,
      fontFamily,
      textBaseline: 'alphabetic',
      verticalAlign: vAlign,
      textAlign: 'center',
      contain: 'both',
      color: 0x0066ccff,
      parent: sdfMultiContainer,
    });

    // Canvas Multi-line
    const canvasMultiContainer = renderer.createNode({
      x: 830 + colX,
      y: multiLineY + 10,
      width: (containerWidth * 4) / 3,
      height: 90,
      color: 0xcc660020,
      parent: view,
    });

    renderer.createTextNode({
      text: 'Line One\nLine Two\nLine Three',
      width: (containerWidth * 4) / 3,
      height: 90,
      fontSize: 16,
      fontFamily,
      textBaseline: 'alphabetic',
      verticalAlign: vAlign,
      textAlign: 'center',
      contain: 'both',
      textRendererOverride: 'canvas',
      color: 0xcc6600ff,
      parent: canvasMultiContainer,
    });
  });

  // Description
  renderer.createTextNode({
    text: 'Blue: SDF Renderer, Orange: Canvas Renderer. Red lines show expected alignment positions.',
    x: 20,
    y: view.height - 30,
    fontSize: 14,
    fontFamily,
    color: 0x333333ff,
    parent: view,
  });
}
