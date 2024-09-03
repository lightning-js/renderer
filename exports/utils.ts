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
 * Auxiliary Utilities
 *
 * @remarks
 * This module exports the a set of utilities that may be optionally used by
 * developers using the Lightning 3 Renderer.
 *
 * You can import the exports from this module like so:
 * ```ts
 * import { assertTruthy } from '@lightning/renderer';
 * ```
 *
 * @internalRemarks
 * Exports in here should be chosen wisely, as they will be exposed to
 * directly developers.
 *
 * They should be general utilities that are NOT directly coupled to the
 * Lightning Renderer, and not specific to any particular platform.
 *
 * @packageDocumentation
 *
 * @module Utils
 */
export { assertTruthy, mergeColorAlpha, deg2Rad } from '../src/utils.js';
export { getNormalizedRgbaComponents } from '../src/core/lib/utils.js';
export { EventEmitter } from '../src/common/EventEmitter.js';
