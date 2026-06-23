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
 * Visual regression test for BB-code bold and italic on the SDF
 * (WebGL MSDF) text renderer — PR 6 of the rich-text series.
 *
 * Bold is implemented via a per-vertex SDF threshold shift (a_style = 1.0
 * lowers the threshold from 0.5 to 0.45, expanding glyph edges).
 * Italic is a layout-time horizontal vertex shear of tan(14°) ≈ 0.249 per
 * design unit relative to the alphabetic baseline; no shader change required.
 *
 * Snapshot sequence:
 *   1. Plain baseline (richText: false) — verifies non-richText path unchanged
 *   2. Bold span  [b]…[/b]
 *   3. Italic span  [i]…[/i]
 *   4. Bold + italic combined  [b][i]…[/i][/b]
 *   5. Inline bold: plain + bold + plain
 *   6. Inline italic: plain + italic + plain
 *   7. Bold with color  [color=0xff0000ff][b]…[/b][/color]
 *   8. Italic with underline  [i][u]…[/u][/i]
 *   9. Bold + italic + color + underline all combined
 *
 * node.color is 0xffffffff so u_color is white and per-vertex span
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
    // Step 1 — plain text baseline
    () => {
      node.text = 'Plain SDF text — no rich text tags';
      node.richText = false;
    },
    // Step 2 — bold span
    () => {
      node.text = '[b]Bold SDF text[/b]';
      node.richText = true;
    },
    // Step 3 — italic span
    () => {
      node.text = '[i]Italic SDF text[/i]';
      node.richText = true;
    },
    // Step 4 — bold + italic combined
    () => {
      node.text = '[b][i]Bold and italic SDF text[/i][/b]';
      node.richText = true;
    },
    // Step 5 — inline bold: plain + bold + plain
    () => {
      node.text = 'Normal [b]bold[/b] normal';
      node.richText = true;
    },
    // Step 6 — inline italic: plain + italic + plain
    () => {
      node.text = 'Normal [i]italic[/i] normal';
      node.richText = true;
    },
    // Step 7 — bold with color
    () => {
      node.text = '[color=0xff0000ff][b]Red bold SDF[/b][/color]';
      node.richText = true;
    },
    // Step 8 — italic with underline
    () => {
      node.text = '[i][u]Italic underlined SDF[/u][/i]';
      node.richText = true;
    },
    // Step 9 — bold + italic + color + underline combined
    () => {
      node.text =
        'Plain [color=0x00aaffff][b][i][u]all styles[/u][/i][/b][/color] plain';
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
