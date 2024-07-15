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

import type { Stage } from './Stage.js';

/**
 * Platform render loop initiator
 */
export const startLoop = (stage: Stage) => {
  let isIdle = false;
  const runLoop = () => {
    stage.updateFrameTime();
    stage.updateAnimations();

    if (!stage.hasSceneUpdates()) {
      // We still need to calculate the fps else it looks like the app is frozen
      stage.calculateFps();
      setTimeout(runLoop, 16.666666666666668);

      if (!isIdle) {
        if (stage.txMemManager.checkCleanup()) {
          stage.txMemManager.cleanup();
        }
        stage.eventBus.emit('idle');
        isIdle = true;
      }
      stage.flushFrameEvents();
      return;
    }

    isIdle = false;
    stage.drawFrame();
    stage.flushFrameEvents();
    requestAnimationFrame(runLoop);
  };
  requestAnimationFrame(runLoop);
};

/**
 * Return unix timestamp
 * @return {number}
 */
export const getTimeStamp = () => {
  return performance ? performance.now() : Date.now();
};
