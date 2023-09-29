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
 *  Represents a 2D transformation context, providing a 2x2 matrix for transformations.
 */
export class Matrix2DContext {
  // world alpha
  alpha = 1;

  // world position
  px = 0;
  py = 0;

  ta = 1;
  tb = 0;
  tc = 0;
  td = 1;

  isIdentity(): boolean {
    return (
      this.alpha === 1 &&
      this.px === 0 &&
      this.py === 0 &&
      this.isIdentityMatrix()
    );
  }

  isIdentityMatrix(): boolean {
    return this.ta === 1 && this.tb === 0 && this.tc === 0 && this.td === 1;
  }

  isSquare(): boolean {
    return this.tb === 0 && this.tc === 0;
  }
}
