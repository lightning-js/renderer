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
import { getTimingFunction, type TimingFunction } from '../utils.js';
import { mergeColorProgress } from '../../utils.js';
import { EventEmitter } from '../../common/EventEmitter.js';

export interface AnimationSettings {
  duration: number;
  delay: number;
  easing: string | TimingFunction;
  loop: boolean;
  repeat: number;
  stopMethod: 'reverse' | 'reset' | false;
}

type PropGroup = {
  keys: string[];
  starts: number[];
  targets: number[];
  isColor: boolean[];
  length: number;
};

let animationIdCounter = 0;

export class CoreAnimation extends EventEmitter {
  public id: number = 0;
  public duration!: number;
  public easing!: string | TimingFunction;
  public loop!: boolean;
  public repeat!: number;
  public stopMethod!: 'reverse' | 'reset' | false;
  // Cached at init() time -- avoids re-computation in the per-frame hot path
  private hasEasing = false;
  // Reciprocal of duration -- stored so update() multiplies instead of divides
  private invDuration = 0;
  private progress = 0;
  private delayFor = 0;
  private delay = 0;
  private timingFunction!: TimingFunction;
  private target!: Record<string, number>;
  // Index into AnimationManager.activeAnimations -- kept in sync on every
  // register/swap-remove so unregisterAnimation() is O(1) with no indexOf scan.
  public activeIndex = -1;

  // Persistent PropGroup instances -- reused across pool recycles to avoid
  // allocating new arrays each time. length tracks how many entries are active.
  private propsGroup: PropGroup = {
    keys: [],
    starts: [],
    targets: [],
    isColor: [],
    length: 0,
  };

  // Fixed set of event names this animation emits -- used for zero-alloc clearListeners()
  static readonly EVENTS = [
    'finished',
    'animating',
    'tick',
    'destroyed',
  ] as const;

  animatable: boolean = false;

  constructor() {
    super();
  }

  /**
   * Initialize (or reinitialize) this animation with new parameters.
   * Called both on first use and when recycled from the pool.
   */
  init(
    target: Record<string, number>,
    props: Record<string, number>,
    settings: Partial<AnimationSettings>,
  ): void {
    this.id = ++animationIdCounter;
    this.target = target;
    this.progress = 0;
    this.activeIndex = -1;
    this.animatable = false;
    this.target = target;
    // Clear any stale listeners from the previous use. With the arr.length > 0
    // guard in clearListeners(), this is a near-zero cost read of 4 array lengths
    // when unregisterAnimation() has already emptied them (the common case).
    this.clearListeners(CoreAnimation.EVENTS);

    // Reset persistent group lengths (reuse existing arrays, no new allocations)
    this.propsGroup.length = 0;

    for (const key in props) {
      const group = this.propsGroup;
      const i = group.length++;

      let start = target[key] || 0;
      if (Array.isArray(start) === true) {
        start = start[0];
      }
      group.keys[i] = key;
      group.starts[i] = start;
      group.targets[i] = props[key] || 0;
      group.isColor[i] = key.indexOf('color') !== -1;
    }

    this.animatable = this.propsGroup.keys.length > 0;

    //early exit if there are no animatable properties
    if (this.animatable === false) {
      return;
    }

    const easing = settings.easing || 'linear';
    const delay = settings.delay ?? 0;
    const duration = settings.duration ?? 0;
    this.duration = duration;
    // Pre-compute reciprocal to replace per-frame division with multiplication
    this.invDuration = duration > 0 ? 1 / duration : 0;
    this.delay = delay;
    this.easing = easing;
    this.loop = settings.loop ?? false;
    this.repeat = settings.repeat ?? 0;
    this.stopMethod = settings.stopMethod ?? false;
    this.timingFunction =
      typeof easing === 'string' ? getTimingFunction(easing) : easing;
    // Explicit bool -- avoids string comparison on every updateValue() call
    this.hasEasing = easing !== 'linear';
    this.delayFor = delay;
  }

  reset() {
    this.progress = 0;
    this.delayFor = this.delay || 0;
    // Write start values directly rather than calling update(0), which would
    // run the full update pipeline (dirty marking, event emissions) for no gain.
    // Identical visible behaviour -- node properties snap to start values.
    if (this.animatable === true) {
      this.restoreValues(this.target, this.propsGroup);
    }
  }

  private restoreValues(target: Record<string, number>, group: PropGroup) {
    const keys = group.keys;
    const starts = group.starts;
    const length = group.length;
    for (let i = 0; i < length; i++) {
      target[keys[i]!] = starts[i]!;
    }
  }

  restore() {
    // reset() already writes start values back to node properties
    this.reset();
  }

  private reverseValues(group: PropGroup) {
    const starts = group.starts;
    const targets = group.targets;
    const length = group.length;
    for (let i = 0; i < length; i++) {
      const tmp = starts[i]!;
      starts[i] = targets[i]!;
      targets[i] = tmp;
    }
  }

  reverse() {
    this.progress = 0;

    if (this.animatable === true) {
      this.reverseValues(this.propsGroup);
    }

    // restore stop method if we are not looping
    if (this.loop === false) {
      this.stopMethod = false;
    }
  }

  /**
   * Interpolate a single property value given the current progress.
   * progress is passed as a parameter so callers can cache it in a local,
   * avoiding repeated this.progress reads (which box floats in V8).
   */
  updateValue(
    isColor: boolean,
    propValue: number,
    startValue: number,
    progress: number,
  ): number {
    if (progress === 1) {
      return propValue;
    }
    if (progress === 0) {
      return startValue;
    }

    if (isColor === true) {
      if (startValue === propValue) {
        return startValue;
      }
      if (this.hasEasing === true) {
        const p = this.timingFunction(progress) || progress;
        return mergeColorProgress(startValue, propValue, p);
      }
      return mergeColorProgress(startValue, propValue, progress);
    }

    if (this.hasEasing === true) {
      // Inlined applyEasing: this.timingFunction(p) * (e - s) + s
      return (
        this.timingFunction(progress) * (propValue - startValue) + startValue
      );
    }
    return startValue + (propValue - startValue) * progress;
  }

  private updateValues(
    target: Record<string, number>,
    group: PropGroup,
    progress: number,
  ) {
    const keys = group.keys;
    const starts = group.starts;
    const targets = group.targets;
    const isColor = group.isColor;
    const length = group.length;
    for (let i = 0; i < length; i++) {
      target[keys[i]!] = this.updateValue(
        isColor[i]!,
        targets[i]!,
        starts[i]!,
        progress,
      );
    }
  }

  update(dt: number) {
    const { duration, loop, stopMethod } = this;
    const { delayFor } = this;

    if (this.target.destroyed) {
      this.emit('destroyed');
      return;
    }

    if (duration === 0 && delayFor === 0) {
      this.emit('finished');
      return;
    }

    if (this.delayFor > 0) {
      this.delayFor -= dt;
      if (this.delayFor >= 0) {
        // Either no or more delay left. Exit.
        return;
      } else {
        // We went beyond the delay time, add it back to dt so we can continue
        // with the animation.
        dt = -this.delayFor;
        this.delayFor = 0;
      }
    }

    if (duration === 0) {
      this.emit('finished');
      return;
    }

    // Read progress once into a local -- avoids repeated this.progress reads
    // which cause V8 to box the float value on each access to the object property.
    let progress = this.progress;

    if (progress === 0) {
      this.emit('animating');
    }

    // Multiply by pre-computed reciprocal -- avoids per-frame float division
    progress += dt * this.invDuration;

    if (progress > 1) {
      progress = loop === true ? 0 : 1;
      this.delayFor = this.delay;
      if (stopMethod !== false) {
        this.progress = progress;
        this.emit('finished');
        return;
      }
    }

    // Write back once
    this.progress = progress;

    // Extract to locals to avoid repeated property lookups in the hot path
    this.updateValues(this.target, this.propsGroup, progress);

    if (progress < 1) {
      this.emit('tick');
    }

    if (progress === 1) {
      this.emit('finished');
    }
  }
}
