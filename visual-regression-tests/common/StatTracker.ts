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
 * Simple utility class for capturing a set of sample groups and
 * calculating statistics on them.
 */
export class StatTracker {
  private data: Record<string, number[]> = {};

  /**
   * Clear all sample groups
   */
  reset() {
    this.data = {};
  }

  /**
   * Add a value to a sample group
   *
   * @param sampleGroup
   * @param value
   */
  add(sampleGroup: string, value: number) {
    if (!this.data[sampleGroup]) {
      this.data[sampleGroup] = [];
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.data[sampleGroup]!.push(value);
  }

  /**
   * Get the percentile value for a sample group
   *
   * @param sampleGroup
   * @param percentile
   * @returns
   */
  getPercentile(sampleGroup: string, percentile: number) {
    const values = this.data[sampleGroup];
    if (!values) {
      return 0;
    }
    values.sort((a, b) => a - b);
    const index = Math.floor((percentile / 100) * values.length);
    return values[index]!;
  }

  /**
   * Get the standard deviation for a sample group
   *
   * @param sampleGroup
   * @returns
   */
  getStdDev(sampleGroup: string) {
    const values = this.data[sampleGroup];
    if (!values) {
      return 0;
    }
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.map((value) => Math.pow(value - mean, 2)).reduce((a, b) => a + b) /
      values.length;
    return Math.sqrt(variance);
  }

  /**
   * Get the average value for a sample group
   *
   * @param sampleGroup
   * @returns
   */
  getAverage(sampleGroup: string) {
    const values = this.data[sampleGroup];
    if (!values) {
      return 0;
    }
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Get the sample count for a sample group
   *
   * @param sampleGroup
   * @returns
   */
  getCount(sampleGroup: string) {
    const values = this.data[sampleGroup];
    if (!values) {
      return 0;
    }
    return values.length;
  }

  /**
   * Get the names of all the sample groups
   *
   * @returns
   */
  getSampleGroups() {
    return Object.keys(this.data);
  }
}
