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

import type { INode, NodeLoadedEventHandler } from '@lightningjs/renderer';
import { mergeColorAlpha } from '@lightningjs/renderer/utils';
import type { ExampleSettings } from '../common/ExampleSettings.js';
import red25 from '../assets/red-25.png';
import red50 from '../assets/red-50.png';
import red100 from '../assets/red-100.png';
import green25 from '../assets/green-25.png';
import green50 from '../assets/green-50.png';
import green100 from '../assets/green-100.png';
import robot from '../assets/robot/robot.png';
import rocko from '../assets/rocko.png';
import { loadStorage, saveStorage } from '../common/LocalStorage.js';

interface LocalStorageData {
  curPage: number;
}

export async function automation(settings: ExampleSettings) {
  const { appElement } = settings;
  // Preserve and restore old background because this test manipulates it
  const oldBackground = appElement.style.background;
  try {
    // Snapshot all the pages
    await (await test(settings)).snapshotPages();
  } finally {
    appElement.style.background = oldBackground;
  }
}

export default async function test(settings: ExampleSettings) {
  const { testName, renderer, appElement, automation, testRoot } = settings;
  const savedState = automation
    ? null
    : loadStorage<LocalStorageData>(testName);

  const leftSideBg = 'red' satisfies 'red' | 'green' as 'red' | 'green';
  const rightSideBg: 'red' | 'green' = leftSideBg === 'red' ? 'green' : 'red';

  let curPage = savedState?.curPage || 0;

  // Set the canvas background to 'red'
  // We will test WebGL -> Browser alpha over this background
  appElement.style.background = leftSideBg === 'red' ? '#ff0000' : '#00ff00';

  // Also create a node with a green background but only covering up
  // the right half of the canvas
  // We will test WebGL -> WebGL alpha over this background
  const rightBackground = renderer.createNode({
    x: renderer.settings.appWidth / 2,
    y: 0,
    w: renderer.settings.appWidth / 2,
    h: renderer.settings.appHeight,
    color: rightSideBg === 'red' ? 0xff0000ff : 0x00ff00ff,
    parent: testRoot,
    zIndex: 0,
    alpha: 1,
  });

  const PADDING = 20;
  const HEADER_FONT_SIZE = 45;
  const RECT_SIZE = 150;

  // Header text for both sides
  const leftHeader = renderer.createTextNode({
    text: 'WebGL -> Browser Alpha',
    fontFamily: 'Ubuntu',
    fontSize: HEADER_FONT_SIZE,
    color: 0xffffffff,
    maxWidth: renderer.settings.appWidth / 2,
    y: PADDING,
    textAlign: 'center',
    parent: testRoot,
  });

  const rightHeader = renderer.createTextNode({
    text: 'WebGL -> WebGL Alpha',
    fontFamily: 'Ubuntu',
    fontSize: HEADER_FONT_SIZE,
    color: 0xffffffff,
    maxWidth: renderer.settings.appWidth / 2,
    x: renderer.settings.appWidth / 2,
    y: PADDING,
    textAlign: 'center',
    parent: testRoot,
  });

  const pageNumberNode = renderer.createTextNode({
    fontFamily: 'Ubuntu',
    fontSize: 30,
    color: 0xffffffff,
    x: PADDING,
    y: renderer.settings.appHeight - 30 - PADDING,
    parent: testRoot,
  });

  function buildSidePg0(bgColorName: 'red' | 'green', parent: INode) {
    const bgColor = bgColorName === 'red' ? 0xff0000ff : 0x00ff00ff;

    let curY = PADDING * 2 + HEADER_FONT_SIZE;
    let curX = PADDING;

    const sideContainer = renderer.createNode({
      parent,
    });

    //// Alpha Prop vs RGBA Alpha Component Blending Test
    const alphaPropVsRGBAHeader = renderer.createTextNode({
      text: 'The rectangles below should appear the same',
      fontFamily: 'Ubuntu',
      fontSize: 30,
      color: 0xffffffff,
      y: curY,
      parent: sideContainer,
    });

    curY += 30 + PADDING;
    curX = PADDING;

    // Alpha Prop 0.5
    const alphaPropRgbaRectHalf1 = renderer.createNode({
      x: curX,
      y: curY,
      w: RECT_SIZE,
      h: RECT_SIZE,
      color: 0xffffffff,
      alpha: 0.5,
      parent: sideContainer,
    });

    curX += RECT_SIZE + PADDING;

    // Alpha RGBA Component 0.5
    const alphaPropRgbaRectHalf2 = renderer.createNode({
      x: curX,
      y: curY,
      w: RECT_SIZE,
      h: RECT_SIZE,
      color: mergeColorAlpha(0xffffffff, 0.5),
      alpha: 1.0,
      parent: sideContainer,
    });

    curX = PADDING;
    curY += RECT_SIZE + PADDING;

    //// Rect Blending Test

    const sameColorRectHeader = renderer.createTextNode({
      text: 'The rectangles below should appear invisible',
      fontFamily: 'Ubuntu',
      fontSize: 30,
      color: 0xffffffff,
      y: curY,
      parent: sideContainer,
    });

    curY += 30 + PADDING;
    curX = PADDING;

    const sameColorRectAlphaFull = renderer.createNode({
      x: curX,
      y: curY,
      w: RECT_SIZE,
      h: RECT_SIZE,
      color: bgColor,
      parent: sideContainer,
      alpha: 1.0,
    });

    curX += RECT_SIZE + PADDING;

    // Alpha Prop 0.5
    const sameColorRectAlphaHalf1 = renderer.createNode({
      x: curX,
      y: curY,
      w: RECT_SIZE,
      h: RECT_SIZE,
      color: bgColor,
      parent: sideContainer,
      alpha: 0.5,
    });

    curX += RECT_SIZE + PADDING;

    // Alpha RGBA Component 0.5
    const sameColorRectAlphaHalf2 = renderer.createNode({
      x: curX,
      y: curY,
      w: RECT_SIZE,
      h: RECT_SIZE,
      color: mergeColorAlpha(bgColor, 0.5),
      parent: sideContainer,
      alpha: 1.0,
    });

    curX += RECT_SIZE + PADDING;

    // Alpha Prop 0.50 / RGBA Component 0.50
    const sameColorRectAlphaQuarter = renderer.createNode({
      x: curX,
      y: curY,
      w: RECT_SIZE,
      h: RECT_SIZE,
      color: mergeColorAlpha(bgColor, 0.5),
      parent: sideContainer,
      alpha: 0.5,
    });

    curY += RECT_SIZE + PADDING;
    curX = PADDING;

    //// Texture Rect Blending Test

    renderer.createTextNode({
      text: 'The texture rects below should appear invisible',
      fontFamily: 'Ubuntu',
      fontSize: 30,
      color: 0xffffffff,
      y: curY,
      parent: sideContainer,
    });

    curY += 30 + PADDING;

    renderer.createNode({
      x: curX,
      y: curY,
      w: RECT_SIZE,
      h: RECT_SIZE,
      src: bgColorName === 'red' ? red100 : green100,
      alpha: 1,
      parent: sideContainer,
    });

    curX += RECT_SIZE + PADDING;

    renderer.createNode({
      x: curX,
      y: curY,
      w: RECT_SIZE,
      h: RECT_SIZE,
      src: bgColorName === 'red' ? red50 : green50,
      alpha: 1,
      parent: sideContainer,
    });

    curX += RECT_SIZE + PADDING;

    renderer.createNode({
      x: curX,
      y: curY,
      w: RECT_SIZE,
      h: RECT_SIZE,
      src: bgColorName === 'red' ? red100 : green100,
      alpha: 0.5,
      parent: sideContainer,
    });

    curX += RECT_SIZE + PADDING;

    renderer.createNode({
      x: curX,
      y: curY,
      w: RECT_SIZE,
      h: RECT_SIZE,
      src: bgColorName === 'red' ? red50 : green50,
      alpha: 0.5,
      parent: sideContainer,
    });

    curX += RECT_SIZE + PADDING;

    renderer.createNode({
      x: curX,
      y: curY,
      w: RECT_SIZE,
      h: RECT_SIZE,
      src: bgColorName === 'red' ? red25 : green25,
      alpha: 1,
      parent: sideContainer,
    });

    return sideContainer;
  }

  function buildSidePg1(bgColorName: 'red' | 'green', parent: INode) {
    const bgColor = bgColorName === 'red' ? 0xff0000ff : 0x00ff00ff;

    let curY = PADDING * 2 + HEADER_FONT_SIZE;
    let curX = PADDING;

    const sideContainer = renderer.createNode({
      parent,
    });

    /// Text Blending Test

    const sameColorTextHeader = renderer.createTextNode({
      text: 'The text below should appear invisible',
      fontFamily: 'Ubuntu',
      fontSize: 30,
      color: 0xffffffff,
      y: curY,
      parent: sideContainer,
    });

    curY += 30 + PADDING;

    const CANVAS_TEXT = 'This "canvas" text should appear invisible';

    // Canvas Text - Same Color - 100% alpha prop / 100% alpha component
    renderer.createTextNode({
      text: CANVAS_TEXT,
      fontFamily: 'NotoSans',
      fontSize: 30,
      alpha: 1,
      color: bgColor,
      y: curY,
      textRendererOverride: 'canvas',
      parent: sideContainer,
    });

    curY += 30 + PADDING;

    // Canvas Text - Same Color - 50% alpha prop / 100% alpha component
    renderer.createTextNode({
      text: CANVAS_TEXT,
      fontFamily: 'NotoSans',
      fontSize: 30,
      alpha: 0.5,
      color: bgColor,
      y: curY,
      textRendererOverride: 'canvas',
      parent: sideContainer,
    });

    curY += 30 + PADDING;

    // Canvas Text - Same Color - 100% alpha prop / 50% alpha component
    renderer.createTextNode({
      text: CANVAS_TEXT,
      fontFamily: 'NotoSans',
      fontSize: 30,
      alpha: 1,
      color: mergeColorAlpha(bgColor, 0.5),
      y: curY,
      textRendererOverride: 'canvas',
      parent: sideContainer,
    });

    curY += 30 + PADDING;

    // Canvas Text - Same Color - 50% alpha prop / 50% alpha component
    renderer.createTextNode({
      text: CANVAS_TEXT,
      fontFamily: 'NotoSans',
      fontSize: 30,
      alpha: 0.5,
      color: mergeColorAlpha(bgColor, 0.5),
      y: curY,
      textRendererOverride: 'canvas',
      parent: sideContainer,
    });

    curY += 30 + PADDING;

    const SDF_TEXT = 'This "SDF" text should appear invisible';

    // SDF Text - Same Color - 100% alpha prop / 100% alpha component
    renderer.createTextNode({
      text: SDF_TEXT,
      fontFamily: 'Ubuntu',
      fontSize: 30,
      alpha: 1,
      color: bgColor,
      y: curY,
      textRendererOverride: 'sdf',
      parent: sideContainer,
    });

    curY += 30 + PADDING;

    // SDF Text - Same Color - 50% alpha prop / 100% alpha component
    renderer.createTextNode({
      text: SDF_TEXT,
      fontFamily: 'Ubuntu',
      fontSize: 30,
      alpha: 0.5,
      color: bgColor,
      y: curY,
      textRendererOverride: 'sdf',
      parent: sideContainer,
    });

    curY += 30 + PADDING;

    // SDF Text - Same Color - 100% alpha prop / 50% alpha component
    renderer.createTextNode({
      text: SDF_TEXT,
      fontFamily: 'Ubuntu',
      fontSize: 30,
      alpha: 1,
      color: mergeColorAlpha(bgColor, 0.5),
      y: curY,
      textRendererOverride: 'sdf',
      parent: sideContainer,
    });

    curY += 30 + PADDING;

    // SDF Text - Same Color - 50% alpha prop / 50% alpha component
    renderer.createTextNode({
      text: SDF_TEXT,
      fontFamily: 'Ubuntu',
      fontSize: 30,
      alpha: 0.5,
      color: mergeColorAlpha(bgColor, 0.5),
      y: curY,
      textRendererOverride: 'sdf',
      parent: sideContainer,
    });

    curY += 30 + PADDING;

    //// Texture Blending Test

    const textureBlendingHeader = renderer.createTextNode({
      text: 'The textures below should have smooth edges',
      fontFamily: 'Ubuntu',
      fontSize: 30,
      color: 0xffffffff,
      y: curY,
      parent: sideContainer,
    });

    curY += 30 + PADDING;

    const sizeToTexture: NodeLoadedEventHandler = (target, payload) => {
      const { width, height } = payload.dimensions;
      target.w = width;
      target.h = height;
    };

    renderer
      .createNode({
        x: curX,
        y: curY,
        w: RECT_SIZE,
        h: RECT_SIZE,
        src: robot,
        alpha: 1,
        parent: sideContainer,
      })
      .once('loaded', sizeToTexture);

    curX += RECT_SIZE + PADDING;

    renderer
      .createNode({
        x: curX,
        y: curY,
        src: rocko,
        alpha: 1.0,
        parent: sideContainer,
      })
      .once('loaded', sizeToTexture);

    curX += RECT_SIZE + PADDING;

    return sideContainer;
  }

  let curLeftSide: INode | null = null;
  let curRightSide: INode | null = null;

  function buildPage(pageNumber: number) {
    if (curLeftSide) {
      curLeftSide.parent = null;
      curLeftSide.destroy();
      curLeftSide = null;
    }
    if (curRightSide) {
      curRightSide.parent = null;
      curRightSide.destroy();
      curRightSide = null;
    }

    if (pageNumber === 0) {
      curLeftSide = buildSidePg0(leftSideBg, testRoot);
      curRightSide = buildSidePg0(rightSideBg, rightBackground);
    } else if (pageNumber === 1) {
      curLeftSide = buildSidePg1(leftSideBg, testRoot);
      curRightSide = buildSidePg1(rightSideBg, rightBackground);
    }

    pageNumberNode.text = `Page ${pageNumber + 1}/${NUM_PAGES}`;
    if (!automation) {
      saveStorage<LocalStorageData>(testName, { curPage: pageNumber });
    }
  }

  const NUM_PAGES = 2;

  buildPage(curPage);

  if (!automation) {
    // When user presses left and right arrow keys switch through pages
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        curPage = (curPage + NUM_PAGES - 1) % NUM_PAGES;
        buildPage(curPage);
      } else if (e.key === 'ArrowRight') {
        curPage = (curPage + 1) % NUM_PAGES;
        buildPage(curPage);
      }
    });
  }

  return {
    snapshotPages: async () => {
      if (!automation) {
        throw new Error('Cannot snapshot pages when not in automation mode');
      }
      for (let i = 0; i < NUM_PAGES; i++) {
        buildPage(i);
        await settings.snapshot();
      }
    },
  };
}
