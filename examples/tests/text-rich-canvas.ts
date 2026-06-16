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
 *   1.  Plain text baseline (richText: false)
 *   2.  Bold span [b]…[/b]
 *   3.  Italic span [i]…[/i]
 *   4.  Bold + italic [b][i]…[/i][/b]
 *   5.  Inline color [color=0xff0000ff]…[/color]
 *   6.  Mixed: plain + bold + colored spans in one string
 *   7.  Wrap — bold span before and after a line break (maxWidth: 800)
 *   8.  Wrap — bold span that crosses the wrap boundary (maxWidth: 800)
 *   9.  Wrap — mixed styles (bold, italic, color) across multiple lines (maxWidth: 800)
 *
 * The blue boundary indicator (top + right edges) marks the 800 px wrap
 * constraint region for tests 7–9.  The indicator is always rendered so
 * that non-wrapping tests (1–6) can also be read against the same reference.
 *
 * All nodes use textRendererOverride: 'canvas'.
 * node.color is left at 0xffffffff so CanvasTexture tint is a no-op and
 * inline span colors are preserved exactly.
 */
export default async function test({ renderer, testRoot }: ExampleSettings) {
  testRoot.w = 1920;
  testRoot.h = 1080;
  testRoot.color = 0x000000ff;

  // ── Boundary indicator ────────────────────────────────────────────────────
  // Two thin lines forming the top-right corner of the 800 px wrap region
  // (text origin: x=60, y=60).  Colour: steel-blue, fully opaque.
  // Top edge
  renderer.createNode({
    x: 60,
    y: 56,
    w: 800,
    h: 2,
    color: 0x336699ff,
    parent: testRoot,
  });
  // Right edge (tall enough to cover ~5 lines at 64 px)
  renderer.createNode({
    x: 860,
    y: 56,
    w: 2,
    h: 440,
    color: 0x336699ff,
    parent: testRoot,
  });

  // ── Text node ─────────────────────────────────────────────────────────────
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

  // ── Step label (bottom-right corner) ─────────────────────────────────────
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
    // ── Steps 1–6: inline style tests (no maxWidth) ───────────────────────
    // Step 1 — plain text baseline
    () => {
      node.text = 'Plain text — no rich text tags';
      node.richText = false;
      node.maxWidth = 0;
    },
    // Step 2 — bold span
    () => {
      node.text = 'Normal [b]bold[/b] normal';
      node.richText = true;
      node.maxWidth = 0;
    },
    // Step 3 — italic span
    () => {
      node.text = 'Normal [i]italic[/i] normal';
      node.richText = true;
      node.maxWidth = 0;
    },
    // Step 4 — bold + italic combined
    () => {
      node.text = 'Normal [b][i]bold italic[/i][/b] normal';
      node.richText = true;
      node.maxWidth = 0;
    },
    // Step 5 — inline color
    () => {
      node.text = '[color=0xff0000ff]Red text[/color] and default color';
      node.richText = true;
      node.maxWidth = 0;
    },
    // Step 6 — mixed spans
    () => {
      node.text =
        'Hello [b]World[/b] — [color=0x0000ffff]blue[/color] and [b][color=0xff8000ff]bold orange[/color][/b]';
      node.richText = true;
      node.maxWidth = 0;
    },

    // ── Steps 7–9: wrapping tests (maxWidth: 800) ────────────────────────
    // Step 7 — bold span before and after a natural line break.
    // The blue boundary lines mark the 800 px constraint.
    // Verify: no character overlap at line ends; bold segments advance X
    // correctly on each wrapped line.
    () => {
      node.text =
        'The quick [b]brown fox[/b] jumps over the lazy dog and some more words here';
      node.richText = true;
      node.maxWidth = 800;
    },
    // Step 8 — bold span that starts before the wrap point and continues on
    // the next line.  Both the trailing plain segment and the leading bold
    // segment of the following line must be spaced correctly.
    () => {
      node.text =
        'Plain text then [b]bold text starts here and wraps across the boundary[/b] plain end';
      node.richText = true;
      node.maxWidth = 800;
    },
    // Step 9 — multiple styles (bold, italic, color) each wrapping across
    // two or more lines.
    () => {
      node.text =
        '[b]Bold[/b] then [i]italic[/i] then [color=0xff0000ff]red[/color] plus normal text filling multiple wrapped lines here';
      node.richText = true;
      node.maxWidth = 800;
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
