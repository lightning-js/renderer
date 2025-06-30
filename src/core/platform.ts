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
  let lastFrameTime = 0;

  const runLoop = (currentTime: number = 0) => {
    const targetFrameTime = stage.targetFrameTime;

    // Check if we should throttle this frame
    if (targetFrameTime > 0 && currentTime - lastFrameTime < targetFrameTime) {
      // Too early for next frame, schedule with setTimeout for precise timing
      const delay = targetFrameTime - (currentTime - lastFrameTime);
      setTimeout(() => requestAnimationFrame(runLoop), delay);
      return;
    }

    lastFrameTime = currentTime;

    stage.updateFrameTime();
    stage.updateAnimations();

    if (!stage.hasSceneUpdates()) {
      // We still need to calculate the fps else it looks like the app is frozen
      stage.calculateFps();

      if (targetFrameTime > 0) {
        // Use setTimeout for throttled idle frames
        setTimeout(
          () => requestAnimationFrame(runLoop),
          Math.max(targetFrameTime, 16.666666666666668),
        );
      } else {
        // Use standard idle timeout when not throttling
        setTimeout(() => requestAnimationFrame(runLoop), 16.666666666666668);
      }

      if (!isIdle) {
        stage.eventBus.emit('idle');
        isIdle = true;
      }

      if (stage.txMemManager.checkCleanup() === true) {
        stage.txMemManager.cleanup(false);
      }

      stage.flushFrameEvents();
      return;
    }

    isIdle = false;
    stage.drawFrame();
    stage.flushFrameEvents();

    // Schedule next frame
    if (targetFrameTime > 0) {
      // Use setTimeout + rAF combination for precise FPS control
      const nextFrameDelay = Math.max(
        0,
        targetFrameTime - (performance.now() - currentTime),
      );
      setTimeout(() => requestAnimationFrame(runLoop), nextFrameDelay);
    } else {
      // Use standard rAF when not throttling
      requestAnimationFrame(runLoop);
    }
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
