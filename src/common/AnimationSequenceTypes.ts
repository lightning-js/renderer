/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2026 Comcast Cable Communications Management, LLC.
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

import type { TimingFunction } from '../core/utils.js';

/**
 * A keyframe value — either a plain number or a value+smoothing pair.
 *
 * @remarks
 * The `s` field is a smoothness scalar (0–1) applied as a cubic-bezier
 * tangent weight, matching Lightning 2's `{v, s}` shorthand.
 */
export type AnimationKeyframeValue = number | { v: number; s?: number };

/**
 * A per-property keyframe map.
 *
 * @remarks
 * Keys are normalised progress fractions (0–1), e.g.:
 * ```ts
 * { 0: 0, 0.5: 50, 1: 100 }
 * ```
 * At least a `0` and `1` entry should be provided.
 */
export type AnimationKeyframes = Record<number, AnimationKeyframeValue>;

/**
 * A single property animation action, modelled after Lightning 2's action
 * objects.
 *
 * @example
 * ```ts
 * { p: 'x', v: { 0: 0, 0.5: 300, 1: 600 } }
 * ```
 */
export interface AnimationAction {
  /** The name of the property to animate. */
  p: string;
  /** Keyframe map for this property. */
  v: AnimationKeyframes;
}

/**
 * Configuration for a single step in an {@link AnimationSequenceSettings}.
 *
 * @remarks
 * A step is conceptually equivalent to one Lightning 2 `animation()` call.
 * Multiple steps are played end-to-end, forming a sequence.
 *
 * Duration is expressed in **milliseconds** (the L3 convention).
 */
export interface AnimationSequenceStep {
  /** Duration of this step in milliseconds. */
  duration: number;
  /** Delay before this step starts in milliseconds. */
  delay?: number;
  /**
   * Number of additional repetitions of this step.
   * - `0` — plays once (default)
   * - `-1` — loops forever (next step will never play)
   * - `N` — plays N+1 times total
   */
  repeat?: number;
  /** Whether to loop this step indefinitely (alias for `repeat: -1`). */
  loop?: boolean;
  /**
   * How the step behaves when it stops.
   * - `false` — stay at the final value (default)
   * - `'reverse'` — animate back to the start value before completing
   * - `'reset'` — snap back to the start value when done
   */
  stopMethod?: 'reverse' | 'reset' | false;
  /** Easing function or name to apply to all actions in this step. */
  easing?: string | TimingFunction;
  /** The property animations to perform in this step. */
  actions: AnimationAction[];
}

/**
 * Sequence of one or more animation steps to play end-to-end.
 */
export type AnimationSequenceSettings =
  | AnimationSequenceStep
  | AnimationSequenceStep[];
