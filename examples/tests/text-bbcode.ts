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

export default async function test({ renderer, testRoot }: ExampleSettings) {
  const fontSize = 28;
  const fontFamily = 'Ubuntu';

  // Main container
  const view = renderer.createNode({
    x: 0,
    y: 0,
    w: 1250,
    h: 600,
    color: 0xf8f8f8ff,
    parent: testRoot,
  });

  // Title
  renderer.createTextNode({
    text: 'BBCode Formatting Test - SDF Renderer',
    x: 20,
    y: 30,
    fontSize: 24,
    fontFamily,
    color: 0x000000ff,
    parent: view,
  });

  // Subtitle
  renderer.createTextNode({
    text: 'Demonstrating color and style BBCode tags',
    x: 20,
    y: 60,
    fontSize: 16,
    fontFamily,
    color: 0x666666ff,
    parent: view,
  });

  const examples = [
    {
      title: 'Color Tags',
      text: '[color=red]Red text[/color] [u]and[/u] [color=#00FF00][u]green[/u] text[/color]',
      description: 'Named and hex colors',
    },
    {
      title: 'Style Tags',
      text: '[b]Bold[/b] [i]Italic[/i] [u]Underline[/u] text',
      description: 'Bold, italic, underline',
    },
    {
      title: 'Strikethrough',
      text: '[s]Strikethrough text[/s] and normal text',
      description: 'Strikethrough style',
    },
    {
      title: 'Nested Tags',
      text: '[color=purple][u]Purple Bold[/u][/color] [color=orange][s]Orange Italic[/s][/color]',
      description: 'Combined formatting',
    },
    {
      title: 'Mixed Decorations',
      text: '[u][s]Under[color=red]lin[/color]e[/s][/u] and [s]strikethrough[/s] text',
      description: 'Different text decorations',
    },
    {
      title: 'Complex Mix',
      text: 'Hello [color=red]World[/color] [color=blue][s]Strike[/s][/color] [u]Underline[/u]!',
      description: 'Multiple mixed tags',
    },
  ];

  examples.forEach((example, index) => {
    const rowY = 80 + index * 50;

    // Create container for BBCode text
    const textContainer = renderer.createNode({
      x: 30,
      y: rowY,
      w: 600,
      h: 45,
      color: 0x0066cc10,
      parent: view,
    });

    // Add a subtle border
    renderer.createNode({
      x: 0,
      y: 0,
      color: 0x0066cc40,
      w: textContainer.w,
      h: 2,
      parent: textContainer,
    });
    renderer.createNode({
      x: 0,
      y: textContainer.h - 2,
      w: textContainer.w,
      h: 2,
      color: 0x0066cc40,
      parent: textContainer,
    });

    // Title label
    renderer.createTextNode({
      text: example.title,
      x: 650,
      y: rowY,
      fontSize: 14,
      fontFamily,
      fontStyle: 'normal',
      color: 0x0066ccff,
      parent: view,
    });

    // Description label
    renderer.createTextNode({
      text: example.description,
      x: 650,
      y: rowY + 25,
      fontSize: 12,
      fontFamily,
      color: 0x888888ff,
      parent: view,
    });

    // BBCode formatted text
    renderer.createTextNode({
      text: example.text,
      x: 10,
      y: 10,
      fontSize,
      fontFamily,
      textRendererOverride: 'sdf',
      color: 0x000000ff, // Default text color
      parent: textContainer,
    });

    // // Raw BBCode display (what the user typed)
    renderer.createTextNode({
      text: `Raw: ${example.text}`,
      x: 850,
      y: rowY + 45,
      fontSize: 10,
      fontFamily: 'monospace',
      color: 0x666666ff,
      maxWidth: 350,
      parent: view,
    });
  });

  // Legend section
  const legendY = 80 + examples.length * 50 + 20;

  renderer.createTextNode({
    text: 'Supported BBCode Tags:',
    x: 30,
    y: legendY,
    fontSize: 18,
    fontFamily,
    color: 0x000000ff,
    parent: view,
  });

  const tags = [
    '[color=name] or [color=#hex] - Text color',
    '[b] - Bold text (TODO)',
    '[i] - Italic text (TODO)',
    '[u] - Underlined text',
    '[s] - Strikethrough text',
  ];

  tags.forEach((tag, index) => {
    renderer.createTextNode({
      text: `* ${tag}`,
      x: 50,
      y: legendY + 20 + index * 22,
      fontSize: 15,
      color: 0x000000ff,
      parent: view,
    });
  });
}
