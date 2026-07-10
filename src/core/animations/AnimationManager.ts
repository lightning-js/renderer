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

import { CoreAnimation } from './CoreAnimation.js';

export class AnimationManager {
  private activeAnimations: CoreAnimation[] = [];

  registerAnimation(animation: CoreAnimation) {
    this.activeAnimations.push(animation);
  }

  unregisterAnimation(animation: CoreAnimation) {
    const animations = this.activeAnimations;
    const index = animations.indexOf(animation);
    if (index >= 0) {
      animations.splice(index, 1);
    }
  }

  update(dt: number) {
    const animations = this.activeAnimations;
    for (let i = 0, len = animations.length; i < len; i++) {
      animations[i]!.update(dt);
    }
  }
}
