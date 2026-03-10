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

export async function installFonts(stage: Stage) {
  // Load Canvas fonts using the new unified API
  stage.loadFont('canvas', {
    fontFamily: 'Canvas-NotoSans',
    fontUrl: './fonts/NotoSans-Regular.ttf',
    metrics: {
      ascender: 1069,
      descender: -293,
      lineGap: 0,
      unitsPerEm: 1000,
    },
  });

  stage.loadFont('canvas', {
    fontFamily: 'Canvas-Ubuntu',
    fontUrl: './fonts/Ubuntu-Regular.ttf',
    metrics: {
      ascender: 776,
      descender: -185,
      lineGap: 56,
      unitsPerEm: 1000,
    },
  });

  stage.loadFont('canvas', {
    fontFamily: 'Canvas-Ubuntu-No-Metrics',
    fontUrl: './fonts/Ubuntu-Regular.ttf',
  });

  const ubuntuModifiedMetrics = {
    ascender: 850,
    descender: -250,
    lineGap: 60,
    unitsPerEm: 1000,
  };

  stage.loadFont('canvas', {
    fontFamily: 'Canvas-Ubuntu-Modified-Metrics',
    fontUrl: './fonts/Ubuntu-Regular.ttf',
    metrics: ubuntuModifiedMetrics,
  });

  // Load SDF fonts for WebGL renderer using the new unified API
  if (stage.renderer.mode === 'webgl') {
    stage.loadFont('sdf', {
      fontFamily: 'SDF-NotoSans',
      atlasUrl: './fonts/NotoSans-Regular.ssdf.png',
      atlasDataUrl: './fonts/NotoSans-Regular.ssdf.json',
      metrics: {
        ascender: 1000,
        descender: -200,
        lineGap: 0,
        unitsPerEm: 1000,
      },
    });

    stage.loadFont('sdf', {
      fontFamily: 'SDF-Ubuntu',
      atlasUrl: './fonts/Ubuntu-Regular.msdf.png',
      atlasDataUrl: './fonts/Ubuntu-Regular.msdf.json',
      // Instead of supplying `metrics` this font will rely on the ones
      // encoded in the json file under `lightningMetrics`.
    });

    stage.loadFont('sdf', {
      fontFamily: 'SDF-Ubuntu-Modified-Metrics',
      atlasUrl: './fonts/Ubuntu-Regular.msdf.png',
      atlasDataUrl: './fonts/Ubuntu-Regular.msdf.json',
      metrics: ubuntuModifiedMetrics,
    });

    stage.loadFont('sdf', {
      fontFamily: 'SDF-Ubuntu-ssdf',
      atlasUrl: './fonts/Ubuntu-Regular.ssdf.png',
      atlasDataUrl: './fonts/Ubuntu-Regular.ssdf.json',
      metrics: {
        ascender: 776,
        descender: -185,
        lineGap: 56,
        unitsPerEm: 1000,
      },
    });
  }
}
