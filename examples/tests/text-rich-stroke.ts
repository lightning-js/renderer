/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2026 Comcast Cable Communications Management, LLC.
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
import { waitForLoadedDimensions } from '../common/utils.js';

export async function automation(settings: ExampleSettings) {
  const next = await test(settings);
  await settings.snapshot();
  while (await next()) {
    await settings.snapshot();
  }
}

/**
 * Outline (stroke) correctness for rich text, on both backends.
 *
 * Each step renders the same markup on the Canvas renderer (top) and the SDF
 * renderer (bottom) so the two can be compared directly.
 *
 * What to look for:
 *   - Outline surrounds the glyphs on all sides, including the first glyph's
 *     left edge and the last line's top/bottom. No clipping at the node edge.
 *   - Nothing overlaps the text that follows a stroked run.
 *   - The green box tracks the node's reported width and should enclose the
 *     outline. If the outline spills outside it, the width is understated.
 *   - Canvas and SDF agree on placement (SDF uses a soft SDF band, Canvas a
 *     hard strokeText line, so edge pixels may differ slightly).
 *
 * Steps:
 *   1. Basic stroke with explicit width
 *   2. Default width (no `,W` — defaults to 1)
 *   3. Thin vs thick widths in one string
 *   4. White fill with black outline (fill + stroke colors differ)
 *   5. Stroke combined with bold and italic
 *   6. Invalid stroke markup renders literally without crashing
 *   7. Stroked run at the line edges (padding check)
 */
export default async function test({ renderer, testRoot }: ExampleSettings) {
  testRoot.w = 1920;
  testRoot.h = 1080;
  testRoot.color = 0x000000ff;

  const FONT_SIZE = 64;

  const mk = (
    renderMode: 'canvas' | 'sdf',
    y: number,
  ): ReturnType<typeof renderer.createTextNode> =>
    renderer.createTextNode({
      x: 80,
      y,
      fontSize: FONT_SIZE,
      fontFamily: renderMode === 'sdf' ? 'NotoSans' : 'Ubuntu',
      color: 0xffffffff,
      text: '',
      richText: true,
      textRendererOverride: renderMode,
      parent: testRoot,
    });

  // Width guides: drawn behind each node, resized to the node's reported width
  // so an understated width is visible as outline spilling past the box.
  const mkGuide = (y: number) =>
    renderer.createNode({
      x: 80,
      y,
      w: 10,
      h: FONT_SIZE * 1.6,
      color: 0x00ff0022,
      parent: testRoot,
    });

  const canvasGuide = mkGuide(200);
  const canvasNode = mk('canvas', 200);
  const sdfGuide = mkGuide(500);
  const sdfNode = mk('sdf', 500);

  const heading = renderer.createTextNode({
    x: 80,
    y: 60,
    fontSize: 32,
    fontFamily: 'Ubuntu',
    color: 0xffff00ff,
    text: '',
    parent: testRoot,
  });

  const backendLabel = (text: string, y: number) =>
    renderer.createTextNode({
      x: 80,
      y,
      fontSize: 22,
      fontFamily: 'Ubuntu',
      color: 0x888888ff,
      text,
      parent: testRoot,
    });

  backendLabel('canvas', 170);
  backendLabel('sdf', 470);

  const label = renderer.createTextNode({
    x: testRoot.w - 40,
    y: testRoot.h - 40,
    mount: 1,
    fontSize: 24,
    fontFamily: 'Ubuntu',
    color: 0x888888ff,
    text: '1',
    parent: testRoot,
  });

  const apply = (text: string, description: string) => {
    heading.text = description;
    for (const node of [canvasNode, sdfNode]) {
      node.text = text;
    }
  };

  let i = 0;
  const mutations = [
    // Step 1 — basic stroke. Outline on all sides, clear gap before "plain".
    () =>
      apply(
        '[stroke=0xff0000ff,2]Outlined[/stroke] plain',
        '1. basic stroke - expect red outline with a gap before "plain"',
      ),
    // Step 2 — width omitted defaults to 1.
    () =>
      apply(
        '[stroke=0x00ff00ff]Thin default[/stroke] plain',
        '2. default width - expect thin green outline',
      ),
    // Step 3 — widths in one string exercise per-span width state.
    () =>
      apply(
        '[stroke=0xff0000ff,1]thin[/stroke] [stroke=0x0000ffff,3]thick[/stroke]',
        '3. mixed widths - expect thin then visibly thicker outline',
      ),
    // Step 4 — fill and outline colors differ; fill must cover inner half.
    () =>
      apply(
        '[color=0xffffffff][stroke=0x000000ff,3]White on black[/stroke][/color]',
        '4. fill + stroke colors - expect white glyphs on black outline',
      ),
    // Step 5 — stroke stacks with synthetic bold/italic on both backends.
    () =>
      apply(
        '[b][stroke=0xffff00ff,2]bold outlined[/stroke][/b] [i][stroke=0x00ffffff,2]italic outlined[/stroke][/i]',
        '5. bold/italic + stroke - expect outline follows weight and lean',
      ),
    // Step 6 — invalid markup stays literal, no crash, no missing close tag.
    () =>
      apply(
        '[stroke=red]literal[/stroke] and [stroke=0xff0000ff,0]zero[/stroke]',
        '6. invalid stroke - expect literal tags, closing tag consumed',
      ),
    // Step 7 — stroked run touches both edges of the node box.
    () =>
      apply(
        '[stroke=0xff8000ff,2]Edge to edge[/stroke]',
        '7. edge padding - expect no clipping left, top, right, or bottom',
      ),
  ];

  async function next(loop = false, idx = i + 1): Promise<boolean> {
    if (idx > mutations.length - 1) {
      if (loop === false) {
        return false;
      }
      idx = 0;
    }
    i = idx;
    // Dimensions are only known once the text has been laid out, so subscribe
    // before mutating.
    const canvasDims = waitForLoadedDimensions(canvasNode);
    const sdfDims = waitForLoadedDimensions(sdfNode);
    mutations[i]?.();
    label.text = (i + 1).toString();
    // Keep the guides in step with whatever width the nodes report, so an
    // understated width shows up as outline spilling outside the box.
    canvasGuide.w = Math.max((await canvasDims).w, 10);
    sdfGuide.w = Math.max((await sdfDims).w, 10);
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
