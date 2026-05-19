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
 * Class that keeps track of the invocations of Context methods when
 * the `enableContextSpy` renderer option is enabled.
 */

export interface FrameCounter {
  start: number;
  end: number;
  frameCount: number;
  frames: Record<number | string, number>;
  increment: (frameDelta: number) => void;
  get averageFps(): number;
}

let buckets = [20, 40, 60, 80, 100];
let overflowBucketLabel = '>' + buckets[buckets.length - 1];
let fpsInterval = 1000; // 1 second

const frameCounter: FrameCounter = {
  start: 0,
  end: 0,
  frameCount: 0,
  frames: {},
  increment(frameDelta: number) {
    this.frameCount++;
    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[i] as number;
      if (frameDelta <= bucket) {
        this.frames[bucket]!++;
        return;
      }
    }
    this.frames[overflowBucketLabel]!++;
  },
  get averageFps() {
    //calculate fps based on frame count and elapsed time
    return (this.frameCount / (this.end - this.start)) * 1000;
  },
};

export function setFrameBuckets(newBuckets: number[]) {
  buckets = newBuckets;
  overflowBucketLabel = '>' + buckets[buckets.length - 1];
}

export function setFpsInterval(newInterval: number) {
  fpsInterval = newInterval;
}

export function createFrameCounter(frameTime: number): FrameCounter {
  const counter = Object.create(frameCounter) as FrameCounter;
  counter.start = frameTime;
  counter.end = frameTime + fpsInterval;
  //fill frames with 0 for each bucket
  for (let i = 0; i < buckets.length; i++) {
    const bucket = buckets[i] as number;
    counter.frames[bucket] = 0;
  }
  counter.frames[overflowBucketLabel] = 0;
  return counter;
}
