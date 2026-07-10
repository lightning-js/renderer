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

import { type CoreNode, type CoreNodeAnimateProps } from '../CoreNode.js';
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

type PropValuesMap = {
  props: PropGroup | null;
  shaderProps: PropGroup | null;
};

let animationIdCounter = 0;

export class CoreAnimation extends EventEmitter {
  public id: number = 0;
  public duration!: number;
  public easing!: string | TimingFunction;
  public loop!: boolean;
  public repeat!: number;
  public stopMethod!: 'reverse' | 'reset' | false;
  private progress = 0;
  private delayFor = 0;
  private delay = 0;
  private timingFunction!: TimingFunction;
  private node!: CoreNode;

  // Persistent PropGroup instances -- reused across pool recycles to avoid
  // allocating new arrays each time. length tracks how many entries are active.
  private propsGroup: PropGroup = {
    keys: [],
    starts: [],
    targets: [],
    isColor: [],
    length: 0,
  };
  private shaderPropsGroup: PropGroup = {
    keys: [],
    starts: [],
    targets: [],
    isColor: [],
    length: 0,
  };

  propValuesMap: PropValuesMap = { props: null, shaderProps: null };

  constructor() {
    super();
  }

  /**
   * Initialize (or reinitialize) this animation with new parameters.
   * Called both on first use and when recycled from the pool.
   */
  init(
    node: CoreNode,
    props: Partial<CoreNodeAnimateProps>,
    settings: Partial<AnimationSettings>,
  ): void {
    this.id = ++animationIdCounter;
    this.node = node;
    this.progress = 0;
    this.propValuesMap.props = null;
    this.propValuesMap.shaderProps = null;
    this.removeAllListeners();

    // Reset persistent group lengths (reuse existing arrays, no new allocations)
    this.propsGroup.length = 0;
    this.shaderPropsGroup.length = 0;

    for (const key in props) {
      if (key !== 'shaderProps') {
        if (this.propValuesMap['props'] === null) {
          this.propValuesMap['props'] = this.propsGroup;
        }
        const group = this.propsGroup;
        const i = group.length++;
        group.keys[i] = key;
        group.starts[i] =
          node[key as keyof Omit<CoreNodeAnimateProps, 'shaderProps'>] || 0;
        group.targets[i] = props[
          key as keyof Omit<CoreNodeAnimateProps, 'shaderProps'>
        ] as number;
        group.isColor[i] = key.indexOf('color') !== -1;
      } else if (key === 'shaderProps' && node.shader !== null) {
        this.propValuesMap['shaderProps'] = this.shaderPropsGroup;
        const group = this.shaderPropsGroup;
        for (const key in props.shaderProps) {
          let start = node.shader.props![key];
          if (Array.isArray(start) === true) {
            start = start[0];
          }
          const i = group.length++;
          group.keys[i] = key;
          group.starts[i] = start;
          group.targets[i] = props.shaderProps[key] as number;
          group.isColor[i] = key.indexOf('color') !== -1;
        }
      }
    }

    const easing = settings.easing || 'linear';
    const delay = settings.delay ?? 0;
    this.duration = settings.duration ?? 0;
    this.delay = delay;
    this.easing = easing;
    this.loop = settings.loop ?? false;
    this.repeat = settings.repeat ?? 0;
    this.stopMethod = settings.stopMethod ?? false;
    this.timingFunction =
      typeof easing === 'string' ? getTimingFunction(easing) : easing;
    this.delayFor = delay;
  }

  reset() {
    this.progress = 0;
    this.delayFor = this.delay || 0;
    this.update(0);
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
    this.reset();
    if (this.propValuesMap['props'] !== null) {
      this.restoreValues(
        this.node as unknown as Record<string, number>,
        this.propValuesMap['props'],
      );
    }
    if (this.propValuesMap['shaderProps'] !== null) {
      this.restoreValues(
        this.node.shader!.props as Record<string, number>,
        this.propValuesMap['shaderProps'],
      );
    }
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

    if (this.propValuesMap['props'] !== null) {
      this.reverseValues(this.propValuesMap['props']);
    }
    if (this.propValuesMap['shaderProps'] !== null) {
      this.reverseValues(this.propValuesMap['shaderProps']);
    }

    // restore stop method if we are not looping
    if (!this.loop) {
      this.stopMethod = false;
    }
  }

  private applyEasing(p: number, s: number, e: number): number {
    return this.timingFunction(p) * (e - s) + s;
  }

  updateValue(
    isColor: boolean,
    propValue: number,
    startValue: number,
    easing: string | TimingFunction | undefined,
  ): number {
    if (this.progress === 1) {
      return propValue;
    }
    if (this.progress === 0) {
      return startValue;
    }

    const endValue = propValue;
    if (isColor === true) {
      if (startValue === endValue) {
        return startValue;
      }

      if (easing && easing !== 'linear') {
        const easingProgressValue =
          this.timingFunction(this.progress) || this.progress;
        return mergeColorProgress(startValue, endValue, easingProgressValue);
      }
      return mergeColorProgress(startValue, endValue, this.progress);
    }

    if (easing && easing !== 'linear') {
      return this.applyEasing(this.progress, startValue, endValue);
    }
    return startValue + (endValue - startValue) * this.progress;
  }

  private updateValues(
    target: Record<string, number>,
    group: PropGroup,
    easing: string | TimingFunction | undefined,
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
        easing,
      );
    }
  }

  update(dt: number) {
    const { duration, loop, easing, stopMethod } = this;
    const { delayFor } = this;

    if (this.node.destroyed) {
      // cleanup
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
      // No duration, we are done.
      this.emit('finished');
      return;
    }

    if (this.progress === 0) {
      // Progress is 0, we are starting the post-delay part of the animation.
      this.emit('animating');
    }

    this.progress += dt / duration;

    if (this.progress > 1) {
      this.progress = loop ? 0 : 1;
      this.delayFor = this.delay;
      if (stopMethod) {
        // If there's a stop method emit finished so the stop method can be applied.
        // TODO: We should probably reevaluate how stopMethod is implemented as currently
        // stop method 'reset' does not work when looping.
        this.emit('finished');
        return;
      }
    }

    if (this.propValuesMap['props'] !== null) {
      this.updateValues(
        this.node as unknown as Record<string, number>,
        this.propValuesMap['props'],
        easing,
      );
    }
    if (this.propValuesMap['shaderProps'] !== null) {
      this.updateValues(
        this.node.shader!.props as Record<string, number>,
        this.propValuesMap['shaderProps'],
        easing,
      );
    }

    if (this.progress < 1) {
      this.emit('tick');
    }

    if (this.progress === 1) {
      this.emit('finished');
    }
  }
}
