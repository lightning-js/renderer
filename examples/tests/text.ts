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

import {
  type ITextNodeWritableProps,
  type TextRendererMap,
  type TrFontFaceMap,
  type LoadedPayload,
} from '@lightningjs/renderer';
import { getLoremIpsum } from '../common/LoremIpsum.js';
import type { ExampleSettings } from '../common/ExampleSettings.js';
import {
  clearStorage,
  loadStorage,
  saveStorage,
} from '../common/LocalStorage.js';

const FONT_FAMILY = 'Ubuntu';
const HEADER_SIZE = 45;
const FONT_SIZE = 40;

const initialMutableProps: Partial<ITextNodeWritableProps> = {
  x: 0,
  y: 0,
  fontFamily: FONT_FAMILY,
  fontSize: FONT_SIZE,
  color: 0x000000ff,
  debug: {
    sdfShaderDebug: false,
  },
};

export const Colors = {
  Black: 0x000000ff,
  Red: 0xff0000ff,
  Green: 0x00ff00ff,
  Blue: 0x0000ffff,
  Magenta: 0xff00ffff,
  Gray: 0x7f7f7fff,
  White: 0xffffffff,
};

interface LocalStorageData {
  mutableProps: Partial<ITextNodeWritableProps>;
  curMode: number;
  moveStep: number;
  curColorIdx: number;
}

const colors = Object.values(Colors);

export default async function ({ testName, renderer }: ExampleSettings) {
  const savedState = loadStorage<LocalStorageData>(testName);

  let curMode = savedState?.curMode || 0;
  let moveStep = savedState?.moveStep || 1;
  let curColorIdx = savedState?.curColorIdx || 0;

  const modes = [
    'canvas',
    'ssdf',
    'msdf',
    'canvas+ssdf',
    'canvas+msdf',
    'ssdf+msdf',
  ] as const;

  const text = getLoremIpsum();

  const initialProps: Partial<ITextNodeWritableProps> = {
    ...(savedState?.mutableProps || initialMutableProps),
    fontFamily: FONT_FAMILY,
    contain: 'both',
    width: renderer.settings.appWidth,
    height: renderer.settings.appHeight,
    text,
  };

  const msdfTextNode = renderer.createTextNode({
    ...initialProps,
    ...getFontProps('msdf'),
    zIndex: 1,
    parent: renderer.root,
  });

  const ssdfTextNode = renderer.createTextNode({
    ...initialProps,
    ...getFontProps('ssdf'),
    zIndex: 2,
    parent: renderer.root,
  });

  const canvasTextNode = renderer.createTextNode({
    ...initialProps,
    ...getFontProps('web'),
    zIndex: 3,
    parent: renderer.root,
  });

  const statusNode = renderer.createTextNode({
    text: '',
    fontSize: 30,
    offsetY: -5,
    zIndex: 100,
    parent: renderer.root,
  });

  statusNode.on('loaded', (target: any, { dimensions }: LoadedPayload) => {
    statusNode.x = renderer.settings.appWidth - dimensions.width;
  });

  function updateStatus() {
    const modeName = modes[curMode];
    if (!modeName) return;
    statusNode.text = [
      `mode: ${modeName}`,
      `moveStep: ${moveStep}`,
      `x: ${msdfTextNode.x}`,
      `y: ${msdfTextNode.y}`,
      `scrollY: ${msdfTextNode.scrollY}`,
      `offsetY: ${msdfTextNode.offsetY}`,
      `fontSize: ${Number(msdfTextNode.fontSize).toFixed(1)}`,
      `letterSpacing: ${msdfTextNode.letterSpacing}`,
      `color: ${curColorIdx}`,
      `fontFamily: ${msdfTextNode.fontFamily}`,
      `pixelRatio: TBD`,
      `fps: TBD`,
    ].join('\n');
  }

  function setMode(mode: number) {
    if (mode < 0) {
      mode = modes.length - 1;
    } else if (mode >= modes.length) {
      mode = 0;
    }
    curMode = mode;
    const modeName = modes[curMode];
    if (!modeName) return;
    canvasTextNode.alpha = 0;
    msdfTextNode.alpha = 0;
    ssdfTextNode.alpha = 0;

    // Get cur color
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const curColor = colors[curColorIdx]!;

    if (modeName === 'canvas') {
      canvasTextNode.color = curColor;
      canvasTextNode.alpha = 1;
    } else if (modeName === 'ssdf') {
      ssdfTextNode.color = curColor;
      ssdfTextNode.alpha = 1;
    } else if (modeName === 'msdf') {
      msdfTextNode.color = curColor;
      msdfTextNode.alpha = 1;
    } else if (modeName === 'canvas+ssdf') {
      canvasTextNode.color = Colors.Green;
      ssdfTextNode.color = curColor;
      canvasTextNode.alpha = 1;
      ssdfTextNode.alpha = 1;
    } else if (modeName === 'canvas+msdf') {
      canvasTextNode.color = Colors.Green;
      msdfTextNode.color = curColor;
      canvasTextNode.alpha = 1;
      msdfTextNode.alpha = 1;
    } else if (modeName === 'ssdf+msdf') {
      ssdfTextNode.color = Colors.Green;
      msdfTextNode.color = curColor;
      ssdfTextNode.alpha = 1;
      msdfTextNode.alpha = 1;
    }
  }

  window.addEventListener('keydown', (e) => {
    let changedState = false;
    // If Command key is pressed do nothing
    // Prevents Command+R causing a change of state
    if (e.metaKey) return;

    if (e.code === 'Escape') {
      // Clear storage and reload
      // This is the only key we return early and cause a full page reload.
      clearStorage(testName);
      // For some reason we need to wait a tick for the reload to actually happen (on chrome at least)
      setTimeout(() => {
        window.location.reload();
      }, 0);
      return;
    } else if (e.code === 'ArrowLeft') {
      setMode(curMode - 1);
      changedState = true;
    } else if (e.code === 'ArrowRight') {
      setMode(curMode + 1);
      changedState = true;
    } else if (e.code === 'ArrowUp') {
      canvasTextNode.scrollY -= moveStep;
      ssdfTextNode.scrollY -= moveStep;
      msdfTextNode.scrollY -= moveStep;
      changedState = true;
    } else if (e.code === 'ArrowDown') {
      canvasTextNode.scrollY += moveStep;
      ssdfTextNode.scrollY += moveStep;
      msdfTextNode.scrollY += moveStep;
      changedState = true;
    } else if (e.code === 'KeyQ') {
      moveStep--;
      changedState = true;
    } else if (e.code === 'KeyE') {
      moveStep++;
      changedState = true;
    } else if (e.code === 'KeyA') {
      canvasTextNode.x -= moveStep;
      ssdfTextNode.x -= moveStep;
      msdfTextNode.x -= moveStep;
      changedState = true;
    } else if (e.code === 'KeyW') {
      canvasTextNode.y -= moveStep;
      ssdfTextNode.y -= moveStep;
      msdfTextNode.y -= moveStep;
      changedState = true;
    } else if (e.code === 'KeyS') {
      canvasTextNode.y += moveStep;
      ssdfTextNode.y += moveStep;
      msdfTextNode.y += moveStep;
      changedState = true;
    } else if (e.code === 'KeyD') {
      canvasTextNode.x += moveStep;
      ssdfTextNode.x += moveStep;
      msdfTextNode.x += moveStep;
      changedState = true;
    } else if (e.code === 'KeyR') {
      canvasTextNode.fontSize++;
      ssdfTextNode.fontSize++;
      msdfTextNode.fontSize++;
      changedState = true;
    } else if (e.code === 'KeyF') {
      canvasTextNode.fontSize--;
      ssdfTextNode.fontSize--;
      msdfTextNode.fontSize--;
      changedState = true;
    } else if (e.code === 'KeyT') {
      canvasTextNode.letterSpacing += 1;
      ssdfTextNode.letterSpacing += 1;
      msdfTextNode.letterSpacing += 1;
      changedState = true;
    } else if (e.code === 'KeyG') {
      canvasTextNode.letterSpacing -= 1;
      ssdfTextNode.letterSpacing -= 1;
      msdfTextNode.letterSpacing -= 1;
      changedState = true;
    } else if (e.code === 'KeyZ') {
      // Decrement color
      curColorIdx--;

      if (curColorIdx < 0) {
        curColorIdx = colors.length - 1;
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const color = colors[curColorIdx]!;
      canvasTextNode.color = color;
      ssdfTextNode.color = color;
      msdfTextNode.color = color;
      changedState = true;
    } else if (e.code === 'KeyX') {
      // Increment color
      curColorIdx++;

      if (curColorIdx >= colors.length) {
        curColorIdx = 0;
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const color = colors[curColorIdx]!;
      canvasTextNode.color = color;
      ssdfTextNode.color = color;
      msdfTextNode.color = color;
      changedState = true;
    } else if (e.code === 'KeyC') {
      // canvasTextNode.offsetY += 1;
      ssdfTextNode.offsetY -= 1;
      msdfTextNode.offsetY -= 1;
      changedState = true;
    } else if (e.code === 'KeyV') {
      // canvasTextNode.offsetY += 1;
      ssdfTextNode.offsetY += 1;
      msdfTextNode.offsetY += 1;
      changedState = true;
    } else if (e.code === 'Slash') {
      // Toggle SDF shader debug
      canvasTextNode.debug = {
        ...canvasTextNode.debug,
        sdfShaderDebug: !canvasTextNode.debug.sdfShaderDebug,
      };
      ssdfTextNode.debug = {
        ...ssdfTextNode.debug,
        sdfShaderDebug: !ssdfTextNode.debug.sdfShaderDebug,
      };
      msdfTextNode.debug = {
        ...msdfTextNode.debug,
        sdfShaderDebug: !msdfTextNode.debug.sdfShaderDebug,
      };
      changedState = true;
    }

    if (changedState) {
      updateStatus();

      // Save state in local storage
      saveStorage(testName, {
        curMode: curMode,
        moveStep: moveStep,
        curColorIdx: curColorIdx,
        mutableProps: {
          x: canvasTextNode.x,
          y: canvasTextNode.y,
          fontSize: canvasTextNode.fontSize,
          letterSpacing: canvasTextNode.letterSpacing,
          scrollY: canvasTextNode.scrollY,
          // debug: canvasTextNode.debug,
        },
      });
    }
  });
  setMode(curMode);
  updateStatus();
}

/**
 * Added offset to the Y position of the text to account for the
 * difference in canvas and SDF text rendering
 */
const sdfOffsetY = 6;

function getFontProps(fontType: keyof TrFontFaceMap): {
  fontFamily: string;
  offsetY: number;
  textRendererOverride: keyof TextRendererMap;
} {
  if (fontType === 'msdf') {
    return {
      fontFamily: `${FONT_FAMILY}`,
      offsetY: sdfOffsetY,
      textRendererOverride: 'sdf',
    };
  } else if (fontType === 'ssdf') {
    return {
      fontFamily: `${FONT_FAMILY}-ssdf`,
      offsetY: sdfOffsetY,
      textRendererOverride: 'sdf',
    };
  }
  return {
    fontFamily: `${FONT_FAMILY}`,
    offsetY: 0,
    textRendererOverride: 'canvas',
  };
}
