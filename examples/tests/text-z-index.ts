/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast Cable Communications Management, LLC.
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

import { type CoreNode, type INode } from '@lightningjs/renderer';
import type { ExampleSettings } from '../common/ExampleSettings.js';

export async function automation(settings: ExampleSettings) {
  const next = await test(settings);
  await settings.snapshot();
  while (await next()) {
    await settings.snapshot();
  }
}

/**
 * Z-order regression for SDF text vs. overlapping textures.
 *
 * Reproduces the app report where SDF text on rails bleeds through a higher
 * z-index menu fade: the renderer is a painter's-algorithm renderer, so the
 * fade quad (a texture at a higher z) must draw after — and therefore cover —
 * the rail's SDF text. If SDF text is deferred to the end of the frame it
 * draws over the fade no matter the z-index.
 *
 * Scene: a rail of SDF text at z=0 on the left edge, and a menu panel with a
 * fade overlay on the left. The panel overlaps the rail's left edge and carries
 * its own menu-item SDF text (which correctly draws on top of the fade
 * regardless of z handling).
 *
 *   - **Page 1 (fade above text)**: the fade quad has a higher z-index than
 *     the rail, so the rail text must be occluded by it. With the batching
 *     regression the rail text bleeds through the fade.
 *   - **Page 2 (fade below text)**: the fade quad has a lower z-index than the
 *     rail, so the rail text must draw on top of the fade. This page is the
 *     control: it must keep working, or we would have over-corrected.
 *
 * Use `ArrowRight` to toggle pages.
 */
export default async function test({ renderer, testRoot }: ExampleSettings) {
  testRoot.w = 1920;
  testRoot.h = 1080;
  testRoot.color = 0xff0f172a;

  const created: INode[] = [];

  function buildRail() {
    const rail = renderer.createNode({
      x: 0,
      y: 120,
      w: 1280,
      h: 840,
      zIndex: 0,
      parent: testRoot,
    });
    created.push(rail);

    const railTitles = [
      'The Signal',
      'Night Shift',
      'Horizon Zero',
      'Paper Planes',
      'Neon District',
      'The Long Goodbye',
    ];
    railTitles.forEach((title, i) => {
      const y = 20 + i * 135;
      created.push(
        renderer.createTextNode({
          x: 20,
          y,
          w: 1200,
          fontSize: 40,
          fontFamily: 'Ubuntu',
          color: 0xffe2e8f0ff,
          text: title,
          textRendererOverride: 'sdf',
          parent: rail,
        }) as unknown as INode,
      );
      created.push(
        renderer.createTextNode({
          x: 20,
          y: y + 52,
          w: 1200,
          fontSize: 26,
          fontFamily: 'NotoSans',
          color: 0xff64748bff,
          text: 'A short descriptive synopsis that also renders as SDF text.',
          textRendererOverride: 'sdf',
          parent: rail,
        }) as unknown as INode,
      );
    });
  }

  function buildMenu(fadeAboveText: boolean) {
    const menu = renderer.createNode({
      x: 0,
      y: 0,
      w: 500,
      h: 1080,
      zIndex: fadeAboveText ? 10 : -10,
      parent: testRoot,
    });
    created.push(menu);

    // The fade overlay covering the left edge of the rails.
    created.push(
      renderer.createNode({
        x: 0,
        y: 0,
        w: 500,
        h: 1080,
        color: 0xff101829,
        parent: menu,
      }),
    );

    const menuItems = ['Home', 'Browse', 'Search', 'My List', 'Settings'];
    menuItems.forEach((item, i) => {
      created.push(
        renderer.createTextNode({
          x: 40,
          y: 120 + i * 90,
          w: 420,
          fontSize: 32,
          fontFamily: 'Ubuntu',
          color: 0xffffffff,
          text: item,
          textRendererOverride: 'sdf',
          parent: menu,
        }) as unknown as INode,
      );
    });
  }

  function applyPage(fadeAboveText: boolean) {
    for (const node of created) {
      testRoot.removeChild(node as unknown as CoreNode);
    }
    created.length = 0;
    buildRail();
    buildMenu(fadeAboveText);
  }

  let page = 1;
  applyPage(true);

  async function next(loop = false): Promise<boolean> {
    if (page === 2 && loop === false) {
      return false;
    }
    page = page === 1 ? 2 : 1;
    console.log(`Switching to page ${page}`);
    applyPage(page === 1);
    return true;
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' && event.repeat === false) {
      next(true).catch(console.error);
    }
  });

  return next;
}
