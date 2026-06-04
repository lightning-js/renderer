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

export interface FrameCount {
  /**
   * The boundaries for the frame count buckets.
   */
  boundaries: number[];
  /**
   * The count of frames in each bucket.
   */
  count: Record<number | string, number>;
  /**
   * The total number of frames counted.
   */
  total: number;
}

export type FrameCounter = FrameCount & {
  /**
   * The start time of the frame counting interval.
   */
  start: number;
  /**
   * The end time of the frame counting interval.
   */
  end: number;
  /**
   * Increments the frame count based on the provided frame delta time.
   * @param frameDelta - The time in milliseconds it took to render the last frame.
   */
  increment: (frameDelta: number) => void;
  /**
   * Calculates and returns the average frames per second (FPS) based on the total frames counted and the elapsed time.
   * @returns The average FPS.
   */
  get averageFps(): number;
};

let boundaries = [20, 40, 60, 80, 100];
let fpsInterval = 1000; // 1 second

const frameCounter: FrameCounter = {
  start: 0,
  end: 0,
  total: 0,
  boundaries: [],
  count: {},
  increment(frameDelta: number) {
    this.total++;
    for (let i = 0; i < boundaries.length; i++) {
      const bucket = boundaries[i] as number;
      if (frameDelta <= bucket) {
        this.count[bucket]!++;
        return;
      }
    }
    this.count['overflow']!++;
  },
  get averageFps() {
    //calculate fps based on frame count and elapsed time
    return (this.total / (this.end - this.start)) * 1000;
  },
};

export function setFrameBuckets(newBuckets: number[]) {
  boundaries = newBuckets;
}

export function setFpsInterval(newInterval: number) {
  fpsInterval = newInterval;
}

export function createFrameCounter(frameTime: number): FrameCounter {
  const counter = Object.create(frameCounter) as FrameCounter;
  counter.boundaries = boundaries;
  counter.start = frameTime;
  counter.end = frameTime + fpsInterval;
  //fill frames with 0 for each bucket
  for (let i = 0; i < boundaries.length; i++) {
    const bucket = boundaries[i] as number;
    counter.count[bucket] = 0;
  }
  counter.count['overflow'] = 0;
  return counter;
}
