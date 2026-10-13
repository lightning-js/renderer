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

import { type Stage } from '@lightningjs/renderer';

export async function installFonts(stage: Stage, preload = false) {
  const canvasFonts = [
    {
      fontFamily: 'NotoSans',
      fontUrl: './fonts/NotoSans-Regular.ttf',
      metrics: {
        ascender: 1069,
        descender: -293,
        lineGap: 0,
        unitsPerEm: 1000,
      },
    },

    {
      fontFamily: 'Ubuntu',
      fontUrl: './fonts/Ubuntu-Regular.ttf',
      metrics: {
        ascender: 776,
        descender: -185,
        lineGap: 56,
        unitsPerEm: 1000,
      },
    },

    {
      fontFamily: 'Ubuntu-No-Metrics',
      fontUrl: './fonts/Ubuntu-Regular.ttf',
    },

    {
      fontFamily: 'Ubuntu-Modified-Metrics',
      fontUrl: './fonts/Ubuntu-Regular.ttf',
      metrics: {
        ascender: 850,
        descender: -250,
        lineGap: 60,
        unitsPerEm: 1000,
      },
    },
  ];

  const sdfFonts =
    stage.renderer.mode === 'webgl'
      ? [
          {
            fontFamily: 'NotoSans',
            atlasUrl: './fonts/NotoSans-Regular.ssdf.png',
            atlasDataUrl: './fonts/NotoSans-Regular.ssdf.json',
            metrics: {
              ascender: 1000,
              descender: -200,
              lineGap: 0,
              unitsPerEm: 1000,
            },
          },
          {
            fontFamily: 'Ubuntu',
            atlasUrl: './fonts/Ubuntu-Regular.msdf.png',
            atlasDataUrl: './fonts/Ubuntu-Regular.msdf.json',
          },
          {
            fontFamily: 'Ubuntu-Modified-Metrics',
            atlasUrl: './fonts/Ubuntu-Regular.msdf.png',
            atlasDataUrl: './fonts/Ubuntu-Regular.msdf.json',
            metrics: {
              ascender: 850,
              descender: -250,
              lineGap: 60,
              unitsPerEm: 1000,
            },
          },
          {
            fontFamily: 'Ubuntu-ssdf',
            atlasUrl: './fonts/Ubuntu-Regular.ssdf.png',
            atlasDataUrl: './fonts/Ubuntu-Regular.ssdf.json',
            metrics: {
              ascender: 776,
              descender: -185,
              lineGap: 56,
              unitsPerEm: 1000,
            },
          },
        ]
      : [];

  // Register the fonts before tests can create text nodes that request them.
  await Promise.all([
    ...canvasFonts.map((font) => stage.loadFont('canvas', font)),
    ...sdfFonts.map((font) => stage.loadFont('sdf', font)),
  ]);

  if (preload) {
    // The VRT suite snapshots its first test immediately. Eagerly load the
    // fonts used by the suite so that the first frame cannot capture a blank
    // text node while its font atlas/face is still loading.
    await Promise.all([
      ...canvasFonts.map((font) => stage.preloadFont('canvas', font)),
      ...sdfFonts.map((font) => stage.preloadFont('sdf', font)),
    ]);
  }
}
