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
 * Visual regression test for BB-code shadow `[shadow=...]...[/shadow]`.
 *
 * Syntax: `[shadow=0xRRGGBBAA[,ox[,oy[,blur]]]]` (defaults 2,2,2).
 * Canvas renders offset + blur via ctx.shadow; SDF renders a hard offset
 * shadow behind foreground glyphs (blur reserved).
 *
 * Each step renders the same markup on Canvas (top, Ubuntu) and SDF
 * (bottom, NotoSans) so the two can be compared. Green boxes track the
 * node's reported width and should enclose glyphs + shadow.
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
    () =>
      apply(
        'Hello [shadow=0x888888ff]shadow[/shadow] world',
        '1. default shadow 2,2,2 - expect gray offset behind "shadow"',
      ),
    () =>
      apply(
        '[shadow=0x888888ff,6,6,8]soft shadow[/shadow] plain',
        '2. large offset+blur - canvas soft, sdf hard offset',
      ),
    () =>
      apply(
        '[shadow=0xff0000ff,3,3,0]red hard shadow[/shadow] plain',
        '3. colored hard shadow with blur 0',
      ),
    () =>
      apply(
        '[b][shadow=0x888888ff,3,3,4]bold shadow[/shadow][/b] tail',
        '4. bold + shadow - shadow keeps bold shape',
      ),
    () =>
      apply(
        '[shadow=0x888888ff,2,2,4][color=0xff0000ff]red on shadow[/color][/shadow] end',
        '5. shadow wrapping color span',
      ),
    () =>
      apply(
        'plain [shadow=0x888888ff,-4,-4,2]negative offset[/shadow] end',
        '6. negative offset - shadow up-left, still inside node bounds',
      ),
    () =>
      apply(
        '[shadow=0x888888ff,2,2,3][u]underlined shadow[/u][/shadow]',
        '7. shadow + underline - both glyph and deco cast shadow',
      ),
    () =>
      apply(
        'no shadow here, [shadow=0xGGGGGGGG]invalid stays literal[/shadow]',
        '8. invalid color - tags render as literal text, no shadow',
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
    const canvasDims = waitForLoadedDimensions(canvasNode);
    const sdfDims = waitForLoadedDimensions(sdfNode);
    mutations[i]?.();
    label.text = (i + 1).toString();
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
