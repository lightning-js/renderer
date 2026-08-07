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

import { type CoreNode, type ITextNode } from '@lightningjs/renderer';
import type { ExampleSettings } from '../common/ExampleSettings.js';

export async function automation(settings: ExampleSettings) {
  const next = await test(settings);
  await settings.snapshot();
  while (await next()) {
    await settings.snapshot();
  }
}

/**
 * Stress the batched SDF text pipeline with many nodes in a single frame.
 *
 * Two pages with identical content — only the render-list order of the text
 * nodes differs, so the two pages produce very different WebGL draw call
 * counts (pixels may differ slightly where semi-transparent glyphs overlap,
 * since draw order changes alpha blending):
 *
 *   - **Page 1 (interleaved)**: plain and rich layouts alternate node by
 *     node. Consecutive text nodes never share a GPU layout (plain 6f vs rich
 *     7f per vertex) or atlas, so `finalizeSdfBatch` can never merge and each
 *     node issues its own draw call (~1 draw / node). This is the worst case.
 *
 *   - **Page 2 (batched)**: the same nodes are re-ordered into contiguous
 *     runs per (layout, atlas) — plain/Ubuntu, plain/NotoSans, rich/Ubuntu,
 *     rich/NotoSans — so consecutive calls share buffer + atlas + clip and
 *     merge into ~4 draw calls. This is the best case the shared-buffer
 *     batching was built for.
 *
 * Use `ArrowRight` to toggle pages and `Space` to force a redraw of the
 * otherwise-static scene (useful to sample frames from Spectre).
 */
export default async function test({ renderer, testRoot }: ExampleSettings) {
  testRoot.w = 1920;
  testRoot.h = 1080;
  testRoot.color = 0xff1e293b;

  const bg = renderer.createNode({
    w: 1920,
    h: 1080,
    color: 0xff1e293b,
    parent: testRoot,
  });

  // Creation order = render-list order. `rich = (row + col) % 2 === 1` makes
  // consecutive nodes alternate layouts, giving page 1 its one-draw-per-node
  // behavior. Row 2/5/8/11 use the NotoSans atlas (vs Ubuntu elsewhere).
  const entries: { node: ITextNode; rich: boolean; family: string }[] = [];
  const rows = 12;
  const cols = 8;
  const cellW = 1920 / cols;
  const cellH = 1080 / rows;

  const plainStrings = [
    'Batched SDF',
    'shared buffers',
    'single draw call',
    'plain layout',
    'Lightning 3.0',
    'multi-line',
    'second line',
    'alpha 0.75',
  ];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const rich = (row + col) % 2 === 1;
      const family = row % 3 === 2 ? 'NotoSans' : 'Ubuntu';
      const fontSize = 20 + ((row * 7 + col * 3) % 6) * 4;
      const color =
        ((0x20 + row * 16) << 24) |
        ((0x40 + col * 24) << 16) |
        ((0x80 + ((row * 31) % 0x60)) << 8) |
        0xff;

      const node = renderer.createTextNode({
        x: col * cellW + 10,
        y: row * cellH + 6,
        w: cellW - 20,
        fontSize,
        fontFamily: family,
        color: color >>> 0,
        alpha: row % 5 === 0 ? 0.75 : 1,
        textRendererOverride: 'sdf',
        parent: bg,
      });

      if (rich === true) {
        node.richText = true;
        switch ((row * cols + col) % 4) {
          case 0:
            node.text =
              '[color=0xffef4444ff]red[/color] [b]bold[/b] [u]underline[/u]';
            break;
          case 1:
            node.text =
              '[i]italic[/i] [s]strike[/s] [color=0xff22c55eff]green[/color]';
            break;
          case 2:
            node.text =
              '[color=0xfff59e0bff]amber[/color] [b][i]bold italic[/i][/b] plain';
            break;
          default:
            node.text =
              '[u][i]mixed[/i][/u] [b][color=0xff8b5cf6ff]purple[/color][/b]';
            break;
        }
      } else {
        node.text = `${plainStrings[
          (row * cols + col) % plainStrings.length
        ]!}`;
      }

      entries.push({ node, rich, family });
    }
  }

  // A few label nodes with large font sizes to exercise wide quads and the
  // RTT-independent scissor/clipping-free path at various scales.
  renderer.createTextNode({
    x: 60,
    y: 1000,
    fontSize: 48,
    fontFamily: 'NotoSans',
    color: 0xffffffff,
    text: '96 nodes, one frame, shared buffers',
    textRendererOverride: 'sdf',
    parent: bg,
  });

  let page = 1;

  // Re-append the text nodes to `bg` in page order. Child order determines
  // render-list order, which is what SdfRenderOp merging keys off.
  function applyPageOrder() {
    for (const entry of entries) {
      bg.removeChild(entry.node as unknown as CoreNode);
    }
    const ordered =
      page === 1
        ? entries
        : [...entries].sort((a, b) => {
            // Group by (layout, atlas) so consecutive nodes share buffer +
            // atlas: plain/Ubuntu, plain/NotoSans, rich/Ubuntu, rich/NotoSans.
            const group = (e: (typeof entries)[number]) =>
              (e.rich ? 2 : 0) + (e.family === 'NotoSans' ? 1 : 0);
            const ga = group(a);
            const gb = group(b);
            if (ga !== gb) {
              return ga - gb;
            }
            return entries.indexOf(a) - entries.indexOf(b);
          });
    for (const entry of ordered) {
      bg.addChild(entry.node as unknown as CoreNode);
    }
  }

  async function next(loop = false): Promise<boolean> {
    if (page === 2 && loop === false) {
      return false;
    }
    page = page === 1 ? 2 : 1;
    console.log(`Switching to page ${page}`);
    applyPageOrder();
    return true;
  }

  // Space forces a full redraw of the otherwise-static scene: the alpha toggle
  // marks the render list dirty so the next frame rebuilds it and re-submits
  // all SDF quads (cache-hit memcpy + batching). Lets Spectre hook into a
  // fresh frame on demand to sample the SDF pipeline.
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && event.repeat === false) {
      testRoot.alpha = 0;
      testRoot.alpha = 1;
    } else if (event.key === 'ArrowRight') {
      next(true).catch(console.error);
    }
  });

  return next;
}
