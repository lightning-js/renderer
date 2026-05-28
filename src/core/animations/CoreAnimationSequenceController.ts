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

import { EventEmitter } from '../../common/EventEmitter.js';
import type {
  AnimationControllerState,
  IAnimationController,
} from '../../common/IAnimationController.js';
import type {
  AnimationKeyframes,
  AnimationKeyframeValue,
  AnimationSequenceSettings,
  AnimationSequenceStep,
} from '../../common/AnimationSequenceTypes.js';
import type { CoreNode } from '../CoreNode.js';
import { getTimingFunction, type TimingFunction } from '../utils.js';
import { mergeColorProgress } from '../../utils.js';
import type { AnimationManager, IAnimatable } from './AnimationManager.js';

// ---------------------------------------------------------------------------
// Keyframe interpolation helpers
// ---------------------------------------------------------------------------

/** Ken Perlin's cubic smoothstep: ease-in-out in [0,1]. */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function rawValue(v: AnimationKeyframeValue): number {
  return typeof v === 'object' ? v.v : v;
}

function smoothness(v: AnimationKeyframeValue): number | undefined {
  return typeof v === 'object' ? v.s : undefined;
}

/**
 * Interpolates a keyframe map at the given overall step progress [0,1].
 * Adjacent keyframe segments are interpolated using the step's easing
 * function; value-smoothing `{v, s}` values override easing for that segment.
 */
function interpolateKeyframes(
  keyframes: AnimationKeyframes,
  progress: number,
  easing: TimingFunction,
  propName: string,
): number {
  // Single pass: walk the keys in insertion order, tracking the last stop
  // that is <= progress (lo) and the first stop that is > progress (hi).
  // Keys are expected to be ordered 0 → 1; no extra allocation needed.
  let loP = -Infinity;
  let loRaw: AnimationKeyframeValue = 0;
  let hiP = Infinity;
  let hiRaw: AnimationKeyframeValue = 0;
  let hasAny = false;

  for (const k in keyframes) {
    const kp = k as unknown as number;
    const kv = keyframes[kp] as AnimationKeyframeValue;
    hasAny = true;

    if (kp <= progress && kp > loP) {
      loP = kp;
      loRaw = kv;
    }
    if (kp > progress && kp < hiP) {
      hiP = kp;
      hiRaw = kv;
    }
  }

  if (hasAny === false) return 0;

  // Clamp to bounds
  if (hiP === Infinity) return rawValue(loRaw); // progress >= last stop
  if (loP === -Infinity) return rawValue(hiRaw); // progress < first stop

  const lo = { p: loP, raw: loRaw };
  const hi = { p: hiP, raw: hiRaw };

  const span = hi.p - lo.p;
  const segP = span === 0 ? 1 : (progress - lo.p) / span;

  const loVal = rawValue(lo.raw);
  const hiVal = rawValue(hi.raw);
  const loS = smoothness(lo.raw);
  const hiS = smoothness(hi.raw);

  let t: number;
  if (loS !== undefined || hiS !== undefined) {
    // s=0 → full smoothstep (ease-in-out), s=1 → linear
    const sLo = loS ?? 1;
    const sHi = hiS ?? 1;
    const smooth = smoothstep(segP);
    const blendLo = smooth + (segP - smooth) * sLo;
    const blendHi = smooth + (segP - smooth) * sHi;
    t = (blendLo + blendHi) / 2;
  } else {
    t = easing(segP);
  }

  if (propName.includes('color')) {
    if (loVal === hiVal) return loVal;
    return mergeColorProgress(loVal, hiVal, t);
  }

  return loVal + (hiVal - loVal) * t;
}

function applyStep(
  node: CoreNode,
  step: AnimationSequenceStep,
  progress: number,
  easing: TimingFunction,
): void {
  const nodeRecord = node as unknown as Record<string, number>;
  for (const action of step.actions) {
    nodeRecord[action.p] = interpolateKeyframes(
      action.v,
      progress,
      easing,
      action.p,
    );
  }
}

// ---------------------------------------------------------------------------
// SequenceRunner — single IAnimatable registered with AnimationManager
// ---------------------------------------------------------------------------

/**
 * Internal runner registered once with AnimationManager. It drives all steps
 * of the sequence in order, correctly carrying dt overflow from one step to
 * the next within a single manager.update() call.
 */
class SequenceRunner extends EventEmitter implements IAnimatable {
  private stepIndex = 0;
  private progress = 0;
  private playsLeft: number;
  private delayFor: number;
  private readonly timingFunctions: TimingFunction[];

  constructor(
    private readonly node: CoreNode,
    private readonly steps: AnimationSequenceStep[],
  ) {
    super();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.timingFunctions = new Array(steps.length);
    for (let i = 0; i < steps.length; i++) {
      const easing = steps[i]!.easing ?? 'linear';
      this.timingFunctions[i] =
        typeof easing === 'string' ? getTimingFunction(easing) : easing;
    }
    this.delayFor = steps[0]?.delay ?? 0;
    this.playsLeft = this._playsForStep(0);
  }

  reset() {
    this.stepIndex = 0;
    this.progress = 0;
    this.delayFor = this.steps[0]?.delay ?? 0;
    this.playsLeft = this._playsForStep(0);
  }

  update(dt: number) {
    if (this.node.destroyed) {
      this.emit('destroyed', {});
      return;
    }

    while (dt >= 0 && this.stepIndex < this.steps.length) {
      const step = this.steps[this.stepIndex]!;
      const easing = this.timingFunctions[this.stepIndex]!;

      // Delay phase
      if (this.delayFor > 0) {
        this.delayFor -= dt;
        if (this.delayFor >= 0) return;
        dt = -this.delayFor;
        this.delayFor = 0;
      }

      // Zero-duration step
      if (step.duration === 0) {
        applyStep(this.node, step, 1, easing);
        dt = this._onStepComplete(dt, step);
        if (dt < 0) return;
        continue;
      }

      // First-frame signal (progress just became non-zero)
      if (this.progress === 0) {
        this.emit('animating', {});
      }

      this.progress += dt / step.duration;

      if (this.progress >= 1) {
        applyStep(this.node, step, 1, easing);
        // Compute leftover dt: whatever fraction was beyond 1.0
        const overflow = (this.progress - 1) * step.duration;
        dt = this._onStepComplete(overflow, step);
        if (dt < 0) return;
        continue;
      }

      applyStep(this.node, step, this.progress, easing);
      this.emit('tick', { progress: this.progress });
      return;
    }
  }

  /**
   * Called when the current step finishes one play.
   * Returns leftover dt if the sequence should continue, or -1 if done.
   */
  private _onStepComplete(
    overflow: number,
    step: AnimationSequenceStep,
  ): number {
    if (this.playsLeft === -1) {
      // Infinite loop on this step — reset and keep going
      this.progress = 0;
      this.delayFor = step.delay ?? 0;
      return overflow;
    }

    this.playsLeft -= 1;
    if (this.playsLeft > 0) {
      this.progress = 0;
      this.delayFor = step.delay ?? 0;
      return overflow;
    }

    // Advance to next step
    this.stepIndex++;
    this.progress = 0;

    if (this.stepIndex >= this.steps.length) {
      this.emit('sequenceFinished', {});
      return -1;
    }

    const nextStep = this.steps[this.stepIndex]!;
    this.delayFor = nextStep.delay ?? 0;
    this.playsLeft = this._playsForStep(this.stepIndex);
    return overflow;
  }

  private _playsForStep(index: number): number {
    const step = this.steps[index];
    if (!step) return 1;
    const repeat = step.repeat ?? (step.loop === true ? -1 : 0);
    return repeat === -1 ? -1 : repeat + 1;
  }
}

// ---------------------------------------------------------------------------
// CoreAnimationSequenceController
// ---------------------------------------------------------------------------

/**
 * Implements {@link IAnimationController} for an L2-inspired animation
 * sequence — one or more steps, each with property keyframe maps, played
 * end-to-end.
 *
 * @example
 * ```ts
 * node.animationSequence([
 *   { duration: 500, actions: [{ p: 'x', v: { '0': 0, '1': 200 } }] },
 *   { duration: 300, actions: [{ p: 'alpha', v: { '0': 1, '1': 0 } }] },
 * ]).start();
 * ```
 */
export class CoreAnimationSequenceController
  extends EventEmitter
  implements IAnimationController
{
  state: AnimationControllerState = 'stopped';

  private readonly steps: AnimationSequenceStep[];
  private readonly runner: SequenceRunner;

  private stoppedPromise: Promise<void> = Promise.resolve();
  private stoppedResolve: (() => void) | null = null;

  private savedProps: Record<string, number> = {};

  constructor(
    private readonly manager: AnimationManager,
    private readonly node: CoreNode,
    settings: AnimationSequenceSettings,
  ) {
    super();
    this.steps = Array.isArray(settings) ? settings : [settings];
    this.runner = new SequenceRunner(node, this.steps);
    this._captureStartValues();
    this._hookRunnerEvents();
  }

  start(): IAnimationController {
    if (this.state === 'running' || this.state === 'scheduled') {
      return this;
    }
    if (this.state === 'stopped') {
      this.runner.reset();
    }
    this._makeStoppedPromise();
    this.manager.registerAnimation(this.runner);
    this.state = 'scheduled';
    return this;
  }

  stop(): IAnimationController {
    this.manager.unregisterAnimation(this.runner);
    this._resolveStoppedPromise();
    this.emit('stopped', this);
    this.state = 'stopped';
    return this;
  }

  pause(): IAnimationController {
    this.manager.unregisterAnimation(this.runner);
    this.state = 'paused';
    return this;
  }

  restore(): IAnimationController {
    this.manager.unregisterAnimation(this.runner);
    this.stoppedResolve = null;
    const nodeRecord = this.node as unknown as Record<string, number>;
    for (const [key, val] of Object.entries(this.savedProps)) {
      nodeRecord[key] = val;
    }
    this.runner.reset();
    this.state = 'stopped';
    return this;
  }

  waitUntilStopped(): Promise<void> {
    return this.stoppedPromise;
  }

  private _captureStartValues() {
    const nodeRecord = this.node as unknown as Record<string, number>;
    for (const step of this.steps) {
      for (const action of step.actions) {
        if (!(action.p in this.savedProps)) {
          this.savedProps[action.p] = nodeRecord[action.p] ?? 0;
        }
      }
    }
  }

  private _hookRunnerEvents() {
    this.runner.on('animating', () => {
      this.state = 'running';
      this.emit('animating', this);
    });

    this.runner.on('tick', (_: unknown, data: { progress: number }) => {
      this.emit('tick', data);
    });

    this.runner.once('sequenceFinished', () => {
      this.manager.unregisterAnimation(this.runner);
      this._resolveStoppedPromise();
      this.emit('stopped', this);
      this.state = 'stopped';
    });

    this.runner.once('destroyed', () => {
      this.manager.unregisterAnimation(this.runner);
      this.state = 'stopped';
    });
  }

  private _makeStoppedPromise() {
    if (this.stoppedResolve === null) {
      this.stoppedPromise = new Promise<void>((resolve) => {
        this.stoppedResolve = resolve;
      });
    }
  }

  private _resolveStoppedPromise() {
    if (this.stoppedResolve !== null) {
      this.stoppedResolve();
      this.stoppedResolve = null;
    }
  }
}
