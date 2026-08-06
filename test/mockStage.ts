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

/**
 * Shared test scaffolding for renderer unit tests.
 *
 * Provides builders for the mocked {@link Stage} and default node/text props
 * so tests compose from a single source of truth instead of copy-pasting the
 * same setup. Lives under `test/` (not `src/`) so it is never shipped in the
 * package nor compiled into `dist`.
 */
import { mock } from 'vitest-mock-extended';
import type { Stage } from '../src/core/Stage.js';
import type { CoreNodeProps } from '../src/core/CoreNode.js';
import type { CoreTextNodeProps } from '../src/core/CoreTextNode.js';
import { CoreRenderer } from '../src/core/renderers/CoreRenderer.js';
import { createBound } from '../src/core/lib/utils.js';
import type { TextureOptions } from '../src/core/CoreTextureManager.js';

export interface MockStageDimensions {
  width?: number;
  height?: number;
}

/**
 * Build a `mock<Stage>` pre-populated with the scaffolding required to
 * construct core nodes.
 *
 * Defaults cover the common case (1920x1080 bounds, a loaded default texture,
 * a no-op `interactiveNodes` set, and a `CoreRenderer` mock). Pass `overrides`
 * to replace whole stage properties (e.g. a custom `renderer`, `txManager`,
 * `shManager`, `platform`, or `pixelRatio`); `overrides` are shallow-merged
 * last so they win over the defaults.
 */
export function makeMockStage(
  overrides: Partial<Stage> = {},
  { width = 1920, height = 1080 }: MockStageDimensions = {},
): Stage {
  return mock<Stage>({
    strictBound: createBound(0, 0, width, height),
    preloadBound: createBound(0, 0, width, height),
    defaultTexture: {
      state: 'loaded',
    },
    interactiveNodes: {
      add() {},
      delete() {},
      has: () => false,
    } as unknown as Stage['interactiveNodes'],
    renderer: mock<CoreRenderer>() as CoreRenderer,
    ...overrides,
  });
}

/**
 * Build a complete {@link CoreNodeProps} with sensible, visible defaults
 * (alpha 1, white color, scale 1). Pass `overrides` for the fields a test
 * actually cares about.
 */
export function makeNodeProps(
  overrides: Partial<CoreNodeProps> = {},
): CoreNodeProps {
  return {
    alpha: 1,
    autosize: false,
    boundsMargin: null,
    clipping: false,
    clipRadius: 0,
    color: 0xffffffff,
    colorBl: 0xffffffff,
    colorBottom: 0xffffffff,
    colorBr: 0xffffffff,
    colorLeft: 0xffffffff,
    colorRight: 0xffffffff,
    colorTl: 0xffffffff,
    colorTop: 0xffffffff,
    colorTr: 0xffffffff,
    h: 0,
    mount: 0,
    mountX: 0,
    mountY: 0,
    parent: null,
    pivot: 0,
    pivotX: 0,
    pivotY: 0,
    rotation: 0,
    rtt: false,
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    shader: null,
    src: '',
    texture: null,
    textureOptions: {} as TextureOptions,
    w: 0,
    x: 0,
    y: 0,
    zIndex: 0,
    ...overrides,
  };
}

/**
 * Build a complete {@link CoreTextNodeProps}: {@link makeNodeProps} defaults
 * plus the text-rendering (`TrProps`) defaults. Pass `overrides` for the
 * fields a test actually cares about.
 */
export function makeTextProps(
  overrides: Partial<CoreTextNodeProps> = {},
): CoreTextNodeProps {
  return {
    ...makeNodeProps(),
    // TrProps
    text: 'Test',
    textAlign: 'left',
    contain: 'none',
    fontFamily: 'Arial',
    fontStyle: 'normal',
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 1,
    maxHeight: 0,
    maxLines: 0,
    maxWidth: 0,
    offsetY: 0,
    overflowSuffix: '...',
    verticalAlign: 'top',
    wordBreak: 'break-word',
    // CoreTextNodeProps specific
    textRendererOverride: null,
    forceLoad: false,
    richText: false,
    ...overrides,
  };
}
