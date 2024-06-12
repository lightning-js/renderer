/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2024 Comcast Cable Communications Management, LLC.
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
import type { NormalizedFontMetrics } from './font-face-types/TrFontFace.js';

/**
 * Calculate the default line height given normalized font metrics
 *
 * @remarks
 * This method may be used for both the WebTrFontFace and SdfTrFontFace font types.
 *
 * @param metrics
 * @param fontSize
 * @returns
 */
export function calcDefaultLineHeight(
  metrics: NormalizedFontMetrics,
  fontSize: number,
): number {
  return fontSize * (metrics.ascender - metrics.descender + metrics.lineGap);
}
