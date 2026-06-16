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
  const next = await test(settings);
  await settings.snapshot();
  while (await next()) {
    await settings.snapshot();
  }
}

/**
 * Visual regression test for BB-code rich text rendering on the Canvas
 * text renderer.
 *
 * Snapshot sequence:
 *   1. Plain text baseline (richText: false)
 *   2. Bold span [b]…[/b]
 *   3. Italic span [i]…[/i]
 *   4. Bold + italic [b][i]…[/i][/b]
 *   5. Inline color [color=0xff0000ff]…[/color]
 *   6. Mixed: plain + bold + colored spans in one string
 *
 * All nodes use textRendererOverride: 'canvas' to exercise the Canvas path.
 * node.color is left at the default 0xffffffff so the CanvasTexture tint is
 * a no-op and inline span colors are preserved exactly.
 */
export default async function test({ renderer, testRoot }: ExampleSettings) {
  testRoot.w = 1920;
  testRoot.h = 1080;
  testRoot.color = 0x000000ff;

  const node = renderer.createTextNode({
    x: 60,
    y: 60,
    fontSize: 64,
    fontFamily: 'sans-serif',
    color: 0xffffffff,
    text: 'Plain text — no rich text tags',
    richText: false,
    textRendererOverride: 'canvas',
    parent: testRoot,
  });

  const label = renderer.createTextNode({
    x: testRoot.w,
    y: testRoot.h,
    mount: 1,
    fontSize: 24,
    fontFamily: 'sans-serif',
    color: 0x888888ff,
    text: '1',
    textRendererOverride: 'canvas',
    parent: testRoot,
  });

  let i = 0;
  const mutations = [
    // Step 1 — plain text baseline, already applied at creation
    () => {
      node.text = 'Plain text — no rich text tags';
      node.richText = false;
    },
    // Step 2 — bold span
    () => {
      node.text = 'Normal [b]bold[/b] normal';
      node.richText = true;
    },
    // Step 3 — italic span
    () => {
      node.text = 'Normal [i]italic[/i] normal';
      node.richText = true;
    },
    // Step 4 — bold + italic combined
    () => {
      node.text = 'Normal [b][i]bold italic[/i][/b] normal';
      node.richText = true;
    },
    // Step 5 — inline color
    () => {
      node.text = '[color=0xff0000ff]Red text[/color] and default color';
      node.richText = true;
    },
    // Step 6 — mixed spans
    () => {
      node.text =
        'Hello [b]World[/b] — [color=0x0000ffff]blue[/color] and [b][color=0xff8000ff]bold orange[/color][/b]';
      node.richText = true;
    },
  ];

  async function next(loop = false, idx = i + 1): Promise<boolean> {
    if (idx > mutations.length - 1) {
      if (loop === false) {
        return false;
      }
      idx = 0;
    }
    i = idx;
    mutations[i]?.();
    label.text = (i + 1).toString();
    return true;
  }

  await next(false, 0);

  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') {
      next(true).catch(console.error);
    }
  });

  return next;
}
