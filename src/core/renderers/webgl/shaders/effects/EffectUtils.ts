/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast
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
export const colorToFloat32Array = (argb: number) => {
  const col = getRgbaComponentsNormalized(argb);
  col[0] *= col[3]!;
  col[1] *= col[3]!;
  col[2] *= col[3]!;
  return col;
};

const getRgbaComponentsNormalized = (argb: number): number[] => {
  const r = ((argb / 65536) | 0) % 256;
  const g = ((argb / 256) | 0) % 256;
  const b = argb % 256;
  const a = (argb / 16777216) | 0;
  return [r / 255, g / 255, b / 255, a / 255];
};
