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
  CoreExtension,
  WebTrFontFace,
  type Stage,
  SdfTrFontFace,
  type FontMetrics,
} from '@lightningjs/renderer/core';

export default class AppCoreExtension extends CoreExtension {
  override async run(stage: Stage) {
    stage.fontManager.addFontFace(
      new WebTrFontFace({
        fontFamily: 'NotoSans',
        descriptors: {},
        fontUrl: '/fonts/NotoSans-Regular.ttf',
        metrics: {
          ascender: 1069,
          descender: -293,
          lineGap: 0,
          unitsPerEm: 1000,
        },
      }),
    );

    stage.fontManager.addFontFace(
      new WebTrFontFace({
        fontFamily: 'Ubuntu',
        descriptors: {},
        fontUrl: '/fonts/Ubuntu-Regular.ttf',
        metrics: {
          ascender: 776,
          descender: -185,
          lineGap: 56,
          unitsPerEm: 1000,
        },
      }),
    );

    stage.fontManager.addFontFace(
      new WebTrFontFace({
        fontFamily: 'Ubuntu-No-Metrics',
        descriptors: {},
        fontUrl: '/fonts/Ubuntu-Regular.ttf',
      }),
    );

    const ubuntuModifiedMetrics: FontMetrics = {
      ascender: 850,
      descender: -250,
      lineGap: 60,
      unitsPerEm: 1000,
    };

    stage.fontManager.addFontFace(
      new WebTrFontFace({
        fontFamily: 'Ubuntu-Modified-Metrics',
        descriptors: {},
        fontUrl: '/fonts/Ubuntu-Regular.ttf',
        metrics: ubuntuModifiedMetrics,
      }),
    );

    if (stage.renderer.mode === 'webgl') {
      stage.fontManager.addFontFace(
        new SdfTrFontFace('ssdf', {
          fontFamily: 'NotoSans',
          descriptors: {},
          atlasUrl: '/fonts/NotoSans-Regular.ssdf.png',
          atlasDataUrl: '/fonts/NotoSans-Regular.ssdf.json',
          stage,
          metrics: {
            ascender: 1000,
            descender: -200,
            lineGap: 0,
            unitsPerEm: 1000,
          },
        }),
      );

      stage.fontManager.addFontFace(
        new SdfTrFontFace('msdf', {
          fontFamily: 'Ubuntu',
          descriptors: {},
          atlasUrl: '/fonts/Ubuntu-Regular.msdf.png',
          atlasDataUrl: '/fonts/Ubuntu-Regular.msdf.json',
          stage,
          // Instead of suppling `metrics` this font will rely on the ones
          // encoded in the json file under `lightningMetrics`.
        }),
      );

      stage.fontManager.addFontFace(
        new SdfTrFontFace('msdf', {
          fontFamily: 'Ubuntu-Modified-Metrics',
          descriptors: {},
          atlasUrl: '/fonts/Ubuntu-Regular.msdf.png',
          atlasDataUrl: '/fonts/Ubuntu-Regular.msdf.json',
          stage,
          metrics: ubuntuModifiedMetrics,
        }),
      );

      stage.fontManager.addFontFace(
        new SdfTrFontFace('ssdf', {
          fontFamily: 'Ubuntu-ssdf',
          descriptors: {},
          atlasUrl: '/fonts/Ubuntu-Regular.ssdf.png',
          atlasDataUrl: '/fonts/Ubuntu-Regular.ssdf.json',
          stage,
          metrics: {
            ascender: 776,
            descender: -185,
            lineGap: 56,
            unitsPerEm: 1000,
          },
        }),
      );
    }
  }
}
