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

// Retreive state from local storage (if localStorage is available)
// and set the state of the app accordingly.
export function loadStorage<T>(testName: string): Partial<T> | null {
  if (typeof window.localStorage === 'undefined') {
    return null;
  }
  try {
    const serializedState = localStorage.getItem(`${testName}-state`);
    if (serializedState === null) {
      return null;
    }
    return JSON.parse(serializedState);
  } catch (err) {
    return null;
  }
}

// Save the state of the app to local storage (if localStorage is available).
export function saveStorage<T>(testName: string, state: Partial<T>): void {
  if (typeof window.localStorage === 'undefined') {
    return;
  }
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(`${testName}-state`, serializedState);
  } catch (err) {
    // Ignore write errors.
  }
}

// Clear the state of the app from local storage (if localStorage is available).
export function clearStorage(testName: string): void {
  if (typeof window.localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.removeItem(`${testName}-state`);
  } catch (err) {
    // Ignore write errors.
  }
}
