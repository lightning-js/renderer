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
 * Round up to the nearest multiple of the given number.
 *
 * @param value
 * @param multiple
 * @returns
 */
export function roundUpToMultiple(value: number, multiple: number) {
  return Math.ceil(value / multiple) * multiple;
}

/**
 * Round down to the nearest multiple of the given number.
 *
 * @param value
 * @param multiple
 * @returns
 */
export function roundDownToMultiple(value: number, multiple: number) {
  return Math.floor(value / multiple) * multiple;
}
