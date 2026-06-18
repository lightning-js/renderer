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
 * Visual regression test for BB-code rich text rendering on the SDF
 * (WebGL MSDF) text renderer.
 *
 * Covers PR 5 features: per-span color, underline, strikethrough.
 * Bold and italic are deferred to PR 6 (feat/rich-text-sdf-style).
 *
 * Snapshot sequence:
 *   1. Plain text baseline (richText: false) — verifies non-richText path unchanged
 *   2. Single colored span  [color=0xff0000ff]…[/color]
 *   3. Mixed plain + colored  Hello [color=0x00ff00ff]Green[/color] World
 *   4. Three color spans side-by-side
 *   5. Alpha color  [color=0xff000080]…[/color]  (50 % alpha red)
 *   6. richText: true with no tags — no regression on plain-text-inside-richText
 *   7. Underline span  [u]…[/u]
 *   8. Strikethrough span  [s]…[/s]
 *   9. Combined: colored+underlined and plain strikethrough in one string
 *
 * node.color is kept at 0xffffffff so u_color is white and per-vertex span
 * colors render without tinting.  Uses textRendererOverride: 'sdf' and the
 * 'NotoSans' family (registered in installFonts.ts for WebGL).
 */
export default async function test({ renderer, testRoot }: ExampleSettings) {
  testRoot.w = 1920;
  testRoot.h = 1080;
  testRoot.color = 0x000000ff;

  const node = renderer.createTextNode({
    x: 60,
    y: 60,
    fontSize: 64,
    fontFamily: 'NotoSans',
    color: 0xffffffff,
    text: 'Plain SDF text — no rich text tags',
    richText: false,
    textRendererOverride: 'sdf',
    parent: testRoot,
  });

  const label = renderer.createTextNode({
    x: testRoot.w,
    y: testRoot.h,
    mount: 1,
    fontSize: 24,
    fontFamily: 'NotoSans',
    color: 0x888888ff,
    text: '1',
    textRendererOverride: 'sdf',
    parent: testRoot,
  });

  let i = 0;
  const mutations = [
    // Step 1 — plain text baseline, already applied at creation
    () => {
      node.text = 'Plain SDF text — no rich text tags';
      node.richText = false;
    },
    // Step 2 — single colored span
    () => {
      node.text = '[color=0xff0000ff]Red colored SDF text[/color]';
      node.richText = true;
    },
    // Step 3 — mixed plain + colored
    () => {
      node.text = 'Hello [color=0x00ff00ff]Green[/color] World';
      node.richText = true;
    },
    // Step 4 — three color spans side-by-side
    () => {
      node.text =
        '[color=0xff0000ff]Red[/color] [color=0x0000ffff]Blue[/color] [color=0x00ff00ff]Green[/color]';
      node.richText = true;
    },
    // Step 5 — 50 % alpha red (tests alpha channel propagation)
    () => {
      node.text =
        'Full: [color=0xff0000ff]red[/color]  Half: [color=0xff000080]dim red[/color]';
      node.richText = true;
    },
    // Step 6 — richText: true but no BB-code tags (regression guard)
    () => {
      node.text = 'richText enabled but no tags present';
      node.richText = true;
    },
    // Step 7 — underline span
    () => {
      node.text = 'Normal [u]underlined[/u] normal';
      node.richText = true;
    },
    // Step 8 — strikethrough span
    () => {
      node.text = 'Normal [s]strikethrough[/s] normal';
      node.richText = true;
    },
    // Step 9 — combined: colored+underline and plain strikethrough
    () => {
      node.text =
        '[color=0xff0000ff][u]red underline[/u][/color] and [s]plain strike[/s]';
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
