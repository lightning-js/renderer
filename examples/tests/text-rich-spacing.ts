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
import { waitForLoadedDimensions } from '../common/utils.js';

export async function automation(settings: ExampleSettings) {
  const next = await test(settings);
  await settings.snapshot();
  while (await next()) {
    await settings.snapshot();
  }
}

/**
 * Advance-width correctness for styled rich text runs, on both backends.
 *
 * A styled span used to be drawn with a styled face but advanced by unstyled
 * metrics, so the run overlapped whatever followed it: 'The [b]brown[/b] fox'
 * rendered as 'brownfox'. Layout was also style-agnostic, so a styled line
 * both wrapped in the wrong place and reported a width narrower than its drawn
 * extent.
 *
 * Each step renders the same markup on the Canvas renderer (top) and the SDF
 * renderer (bottom) so the two can be compared directly.
 *
 * What to look for:
 *   - A clear word gap after every bold or italic run. No 'brownfox'.
 *   - Nothing clipped at the right edge of the text node.
 *   - The green box tracks the node's reported width and should enclose the
 *     glyphs. If styled text spills outside it, the width is understated.
 *   - Under maxWidth, the wrap point should respect the styled width, and the
 *     styled line must not overflow the red guide.
 *
 * Steps:
 *   1. The reported defect: inline bold between two plain words
 *   2. Inline italic, which overhangs to the right via shear
 *   3. Bold and italic adjacent, exercising the style boundary
 *   4. Bold at end of string, where the run has nothing to collide with
 *   5. Several styled runs on one line, so errors accumulate
 *   6. Wrapped: styled run forces an earlier break
 *   7. Wrapped: long styled word split across lines
 *   8. Centred alignment, which references the widest line
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
  // so an understated width is visible as glyphs spilling past the box.
  const mkGuide = (y: number) =>
    renderer.createNode({
      x: 80,
      y,
      w: 10,
      h: FONT_SIZE * 1.4,
      color: 0x00ff0022,
      parent: testRoot,
    });

  const canvasGuide = mkGuide(200);
  const canvasNode = mk('canvas', 200);
  const sdfGuide = mkGuide(500);
  const sdfNode = mk('sdf', 500);

  // Vertical rule marking maxWidth for the wrapping steps.
  const maxWidthRule = renderer.createNode({
    x: 80,
    y: 150,
    w: 3,
    h: 700,
    color: 0xff000088,
    alpha: 0,
    parent: testRoot,
  });

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

  const apply = (
    text: string,
    description: string,
    maxWidth = 0,
    textAlign: 'left' | 'center' | 'right' = 'left',
  ) => {
    heading.text = description;
    for (const node of [canvasNode, sdfNode]) {
      node.text = text;
      node.maxWidth = maxWidth;
      node.textAlign = textAlign;
    }
    maxWidthRule.alpha = maxWidth > 0 ? 1 : 0;
    maxWidthRule.x = 80 + maxWidth;
  };

  let i = 0;
  const mutations = [
    // Step 1 — the reported defect. Without the fix the bold run advances by
    // its regular-face width and eats the following space: 'brownfox'.
    () =>
      apply(
        'The [i]quick[/i] [b][color=0xff7112ff]brown[/color][/b] fox jumps',
        '1. inline bold and italic — expect a gap before "fox"',
      ),
    // Step 2 — italic leans right at the top, so the last glyph of the run
    // overhangs whatever follows it.
    () =>
      apply(
        'aaa [i]iiiiillll[/i] aaa',
        '2. italic run — expect no collision after the run',
      ),
    // Step 3 — adjacent runs with no space between them; also the case where
    // kerning must not be carried across the style boundary.
    () =>
      apply(
        '[b]Bold[/b][i]Italic[/i]Plain',
        '3. adjacent styled runs — expect no overlap at the boundaries',
      ),
    // Step 4 — a styled run at the very end still contributes to the node's
    // width, so the green guide must extend past the last glyph.
    () =>
      apply(
        'ends in [b]bold[/b]',
        '4. trailing bold — expect the width guide to enclose it',
      ),
    // Step 5 — repeated styled runs accumulate any per-run error.
    () =>
      apply(
        '[b]one[/b] two [b]three[/b] four [b]five[/b] six',
        '5. repeated bold runs — errors accumulate left to right',
      ),
    // Step 6 — the styled run is wide enough to change where the line breaks.
    () =>
      apply(
        'wrapping [b]with a bold run[/b] that changes the break point',
        '6. wrapped — expect the break to respect the bold width',
        900,
      ),
    // Step 7 — a single styled word too long for the line, split mid-word.
    () =>
      apply(
        '[b]supercalifragilisticexpialidocious[/b] tail',
        '7. split styled word — expect no overflow past the red rule',
        700,
      ),
    // Step 8 — non-left alignment is computed from the widest line, so an
    // understated width shows up as a misaligned line.
    () =>
      apply(
        'centred [b]bold[/b] text\nand a [i]longer italic[/i] second line',
        '8. centred — alignment references the widest line',
        900,
        'center',
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
    // understated width shows up as glyphs spilling outside the box.
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
