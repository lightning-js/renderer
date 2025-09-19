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
  repeatDelay: number;
  stopMethod: 'reverse' | 'reset' | false;
}

type PropValues = {
  start: number;
  target: number;
};
type PropValuesMap = Record<string, Record<string, PropValues>>;

export class CoreAnimation extends EventEmitter {
  public settings: AnimationSettings;
  private progress = 0;
  private delayFor = 0;
  private delay = 0;
  private timingFunction: TimingFunction;

  propValuesMap: PropValuesMap = {};

  constructor(
    private node: CoreNode,
    private props: Partial<CoreNodeAnimateProps>,
    settings: Partial<AnimationSettings>,
  ) {
    super();

    for (const key in props) {
      if (key !== 'shaderProps') {
        if (this.propValuesMap['props'] === undefined) {
          this.propValuesMap['props'] = {};
        }
        this.propValuesMap['props'][key] = {
          start:
            node[key as keyof Omit<CoreNodeAnimateProps, 'shaderProps'>] || 0,
          target: props[
            key as keyof Omit<CoreNodeAnimateProps, 'shaderProps'>
          ] as number,
        };
      } else if (key === 'shaderProps' && node.shader !== null) {
        this.propValuesMap['shaderProps'] = {};
        for (const key in props.shaderProps) {
          let start = node.shader.props![key];
          if (Array.isArray(start) === true) {
            start = start[0];
          }
          this.propValuesMap['shaderProps'][key] = {
            start,
            target: props.shaderProps[key] as number,
          };
        }
      }
    }

    const easing = settings.easing || 'linear';
    const delay = settings.delay ?? 0;
    this.settings = {
      duration: settings.duration ?? 0,
      delay,
      easing,
      loop: settings.loop ?? false,
      repeat: settings.repeat ?? 0,
      repeatDelay: settings.repeatDelay ?? 0,
      stopMethod: settings.stopMethod ?? false,
    };
    this.timingFunction =
      typeof easing === 'string' ? getTimingFunction(easing) : easing;
    this.delayFor = delay;
    this.delay = delay;
  }

  reset() {
    this.progress = 0;
    this.delayFor = this.settings.delay || 0;
    this.update(0);
  }

  private restoreValues(
    target: Record<string, number>,
    valueMap: Record<string, PropValues>,
  ) {
    const entries = Object.entries(valueMap);
    const eLength = entries.length;

    for (let i = 0; i < eLength; i++) {
      const [key, value] = entries[i]!;
      target[key] = value.start;
    }
  }

  restore() {
    this.reset();
    if (this.propValuesMap['props'] !== undefined) {
      this.restoreValues(
        this.node as unknown as Record<string, number>,
        this.propValuesMap['props'],
      );
    }
    if (this.propValuesMap['shaderProps'] !== undefined) {
      this.restoreValues(
        this.node.shader!.props as Record<string, number>,
        this.propValuesMap['shaderProps'],
      );
    }
  }

  private reverseValues(valueMap: Record<string, PropValues>) {
    const entries = Object.entries(valueMap);
    const eLength = entries.length;

    for (let i = 0; i < eLength; i++) {
      const [key, value] = entries[i]!;
      valueMap[key] = {
        start: value.target,
        target: value.start,
      };
    }
  }

  reverse() {
    this.progress = 0;

    if (this.propValuesMap['props'] !== undefined) {
      this.reverseValues(this.propValuesMap['props']);
    }
    if (this.propValuesMap['shaderProps'] !== undefined) {
      this.reverseValues(this.propValuesMap['shaderProps']);
    }

    // restore stop method if we are not looping
    if (!this.settings.loop) {
      this.settings.stopMethod = false;
    }
  }

  private applyEasing(p: number, s: number, e: number): number {
    const timingResult = this.timingFunction(p);
    return (timingResult === undefined ? p : timingResult) * (e - s) + s;
  }

  updateValue(
    propName: string,
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
    if (propName.indexOf('color') !== -1) {
      if (startValue === endValue) {
        return startValue;
      }

      if (easing) {
        const easingProgressValue =
          this.timingFunction(this.progress) || this.progress;
        return mergeColorProgress(startValue, endValue, easingProgressValue);
      }
      return mergeColorProgress(startValue, endValue, this.progress);
    }

    if (easing) {
      return this.applyEasing(this.progress, startValue, endValue);
    }
    return startValue + (endValue - startValue) * this.progress;
  }

  private updateValues(
    target: Record<string, number>,
    valueMap: Record<string, PropValues>,
    easing: string | TimingFunction | undefined,
  ) {
    const entries = Object.entries(valueMap);
    const eLength = entries.length;

    for (let i = 0; i < eLength; i++) {
      const [key, value] = entries[i]!;
      target[key] = this.updateValue(key, value.target, value.start, easing);
    }
  }

  update(dt: number) {
    const { duration, loop, easing, stopMethod } = this.settings;
    const { delayFor } = this;

    if (this.node.destroyed) {
      // cleanup
      this.emit('destroyed', {});
      return;
    }

    if (duration === 0 && delayFor === 0) {
      this.emit('finished', {});
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
      this.emit('finished', {});
      return;
    }

    if (this.progress === 0) {
      // Progress is 0, we are starting the post-delay part of the animation.
      this.emit('animating', {});
    }

    this.progress += dt / duration;

    if (this.progress > 1) {
      this.progress = loop ? 0 : 1;
      this.delayFor = this.delay;
      if (stopMethod) {
        // If there's a stop method emit finished so the stop method can be applied.
        // TODO: We should probably reevaluate how stopMethod is implemented as currently
        // stop method 'reset' does not work when looping.
        this.emit('finished', {});
        return;
      }
    }

    if (this.propValuesMap['props'] !== undefined) {
      this.updateValues(
        this.node as unknown as Record<string, number>,
        this.propValuesMap['props'],
        easing,
      );
    }
    if (this.propValuesMap['shaderProps'] !== undefined) {
      this.updateValues(
        this.node.shader!.props as Record<string, number>,
        this.propValuesMap['shaderProps'],
        easing,
      );
    }

    if (this.progress < 1) {
      this.emit('tick', { progress: this.progress });
    }

    if (this.progress === 1) {
      this.emit('finished', {});
    }
  }
}
