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

import { expect, describe, it } from 'vitest';
import { measureText } from './measureText.js';
import sdfData from 'test/mockdata/Ubuntu-Bold.msdf.json';
import {
  SdfFontShaper,
  type SdfFontData,
} from '../../../font-face-types/SdfTrFontFace/internal/SdfFontShaper.js';

describe('measureText', () => {
  it('should measure text width', () => {
    const PERIOD_WIDTH = 10.332;
    const shaper = new SdfFontShaper(sdfData as unknown as SdfFontData);
    expect(measureText('', { letterSpacing: 0 }, shaper)).toBe(0);
    expect(measureText('.', { letterSpacing: 0 }, shaper)).toBe(PERIOD_WIDTH);
    expect(measureText('..', { letterSpacing: 0 }, shaper)).toBeCloseTo(
      PERIOD_WIDTH * 2,
    );
    expect(measureText('..', { letterSpacing: 5 }, shaper)).toBeCloseTo(
      PERIOD_WIDTH * 2 + 5,
    );
  });
});
