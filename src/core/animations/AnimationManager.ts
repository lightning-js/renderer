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

import type { CoreNode, CoreNodeAnimateProps } from '../CoreNode.js';
import { CoreAnimation, type AnimationSettings } from './CoreAnimation.js';
import { CoreAnimationController } from './CoreAnimationController.js';
import type { IAnimationController } from '../../common/IAnimationController.js';

export class AnimationManager {
  private activeAnimations: CoreAnimation[] = [];

  /**
   * Pool of reusable CoreAnimation instances.
   * Animations are returned to the pool when they finish or are stopped.
   */
  private animationPool: CoreAnimation[] = [];

  /**
   * Pool of reusable CoreAnimationController instances.
   * Controllers are returned to the pool alongside their animation.
   */
  private controllerPool: CoreAnimationController[] = [];

  registerAnimation(animation: CoreAnimation) {
    animation.activeIndex = this.activeAnimations.length;
    this.activeAnimations.push(animation);
  }

  unregisterAnimation(animation: CoreAnimation) {
    const index = animation.activeIndex;
    if (index === -1) {
      return;
    }
    const animations = this.activeAnimations;
    const last = animations.length - 1;
    if (index !== last) {
      // Swap with the last element and update its index
      const swap = animations[last]!;
      animations[index] = swap;
      swap.activeIndex = index;
    }
    animations.pop();
    animation.activeIndex = -1;
  }

  update(dt: number) {
    const animations = this.activeAnimations;
    // Iterate backwards. With activeIndex tracking, if a sibling stop() during
    // a completion event swap-removes an already-visited element into index i,
    // we check activeIndex >= 0 before updating to avoid double-processing.
    for (let i = animations.length - 1; i >= 0; i--) {
      const anim = animations[i]!;
      if (anim.activeIndex >= 0) {
        anim.update(dt);
      }
    }
  }

  /**
   * Create an animation controller, reusing pooled objects when available.
   * Objects are returned to the pool when the controller reaches a terminal
   * state (stopped via finish, manual stop, or node destruction).
   */
  createAnimation(
    node: CoreNode,
    props: Partial<CoreNodeAnimateProps>,
    settings: Partial<AnimationSettings>,
  ): IAnimationController {
    // Get or create animation
    let animation: CoreAnimation;
    if (this.animationPool.length > 0) {
      animation = this.animationPool.pop()!;
    } else {
      animation = new CoreAnimation();
    }
    animation.init(node, props, settings);

    // Get or create controller
    let controller: CoreAnimationController;
    if (this.controllerPool.length > 0) {
      controller = this.controllerPool.pop()!;
    } else {
      controller = new CoreAnimationController();
    }
    controller.init(this, animation);

    return controller;
  }

  /**
   * Return an animation and its controller to the pool for reuse.
   * Called by CoreAnimationController when it reaches a terminal state
   * (after all user event listeners have been notified).
   */
  releaseToPool(
    animation: CoreAnimation,
    controller: CoreAnimationController,
  ): void {
    // Clear in-place using known event names -- preserves pre-allocated listener
    // arrays so the next registerAnimation() doesn't need to allocate new [].
    animation.clearListeners(CoreAnimation.EVENTS);
    this.animationPool.push(animation);
    controller.clearListeners(CoreAnimationController.EVENTS);
    this.controllerPool.push(controller);
  }
}
