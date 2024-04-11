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

import type { CoreNode } from '../CoreNode.js';
import type { INodeAnimatableProps } from '../../main-api/INode.js';
import { getTimingFunction } from '../utils.js';
import { mergeColorProgress } from '../../utils.js';
import { EventEmitter } from '../../common/EventEmitter.js';

export interface AnimationSettings {
  duration: number;
  delay: number;
  easing: string;
  loop: boolean;
  repeat: number;
  repeatDelay: number;
  stopMethod: 'reverse' | 'reset' | false;
}

export class CoreAnimation extends EventEmitter {
  public propStartValues: Partial<INodeAnimatableProps> = {};
  public shaderPropStartValues: Record<string, number> = {};

  public restoreValues: Partial<INodeAnimatableProps> = {};
  private progress = 0;
  private delayFor = 0;
  private timingFunction: (t: number) => number | undefined;
  private propsList: string[]; //fixme - aint got not time for this
  private shaderPropList: string[] | null = null;

  constructor(
    private node: CoreNode,
    private props: Partial<INodeAnimatableProps>,
    public settings: Partial<AnimationSettings>,
  ) {
    super();
    this.propStartValues = {};

    this.propsList = [];
    for (const key in props) {
      if (key !== 'shader') {
        this.propsList.push(key);
        this.propStartValues[
          key as keyof Omit<INodeAnimatableProps, 'shader'>
        ] = node[key as keyof Omit<INodeAnimatableProps, 'shader'>];
      }
    }
    if (props.shader) {
      this.shaderPropList = [];
      for (const key in props.shader) {
        this.shaderPropList.push(key);
        this.shaderPropStartValues[key] = node.shaderProps![key] as number;
      }
    }

    this.timingFunction = (t: number) => t;

    if (settings.easing && typeof settings.easing === 'string') {
      this.timingFunction = getTimingFunction(settings.easing);
    }
    this.delayFor = settings.delay || 0;
  }

  reset() {
    this.progress = 0;
    this.delayFor = this.settings.delay || 0;
    this.update(0);
  }

  restore() {
    this.reset();
    (
      this.propsList as Array<keyof Omit<INodeAnimatableProps, 'shader'>>
    ).forEach((propName) => {
      this.node[propName] = this.propStartValues[propName] as number;
    });

    if (this.props.shader) {
      this.shaderPropList?.forEach((propName) => {
        this.node.shaderProps![propName] = this.shaderPropStartValues[propName];
      });
    }
  }

  reverseValues(
    propName: string,
    props: Record<string, number>,
    startValues: Record<string, number>,
  ) {
    // set the start value to the current value
    const startValue = props[propName]!;
    const endValue = startValues[propName]!;
    // swap the start and end values
    props[propName] = endValue;
    startValues[propName] = startValue;
  }

  reverse() {
    this.progress = 0;
    (
      this.propsList as Array<keyof Omit<INodeAnimatableProps, 'shader'>>
    ).forEach((propName) => {
      this.reverseValues(
        propName,
        this.props as Record<string, number>,
        this.propStartValues as Record<string, number>,
      );
    });

    if (this.props.shader) {
      this.shaderPropList?.forEach((propName) => {
        this.reverseValues(
          propName,
          this.node.shaderProps as Record<string, number>,
          this.shaderPropStartValues,
        );
      });
    }
    // restore stop method if we are not looping
    if (!this.settings.loop) {
      this.settings.stopMethod = false;
    }
  }

  applyEasing(p: number, s: number, e: number): number {
    return (this.timingFunction(p) || p) * (e - s) + s;
  }

  updateValue(
    propName: string,
    propValue: number,
    startValue: number,
    easing: string | undefined,
  ): number {
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

  updateValues(
    target: Record<string, number>,
    list: string[],
    props: Record<string, number>,
    startValues: Record<string, number>,
    easing: string | undefined,
  ) {
    for (let i = 0; i < list.length; i++) {
      const propName = list[i]!;
      const propValue = props[propName]!;
      const startValue = startValues[propName]!;
      target[propName] = this.updateValue(
        propName,
        propValue,
        startValue,
        easing,
      );
    }
  }

  update(dt: number) {
    const { duration, loop, easing, stopMethod } = this.settings;
    if (!duration) {
      this.emit('finished', {});
      return;
    }

    if (this.delayFor > 0) {
      this.delayFor -= dt;
      return;
    }

    if (this.delayFor <= 0 && this.progress === 0) {
      this.emit('start', {});
    }

    this.progress += dt / duration;

    if (this.progress > 1) {
      this.progress = loop ? 0 : 1;
      if (stopMethod) {
        // If there's a stop method emit finished so the stop method can be applied.
        // TODO: We should probably reevaluate how stopMethod is implemented as currently
        // stop method 'reset' does not work when looping.
        this.emit('finished', {});
        return;
      }
    }

    this.updateValues(
      this.node as unknown as Record<string, number>,
      this.propsList,
      this.props as Record<string, number>,
      this.propStartValues as Record<string, number>,
      easing,
    );

    if (this.props.shader) {
      this.updateValues(
        this.node.shaderProps as Record<string, number>,
        this.shaderPropList!,
        this.props.shader,
        this.shaderPropStartValues,
        easing,
      );
    }

    if (this.progress === 1) {
      this.emit('finished', {});
    }
  }
}
