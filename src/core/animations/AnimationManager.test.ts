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

import { describe, it, expect, vi } from 'vitest';
import { AnimationManager } from './AnimationManager.js';
import { CoreAnimation } from './CoreAnimation.js';
import type { CoreNode } from '../CoreNode.js';

function makeNode(): CoreNode {
  return { destroyed: false, x: 0, shader: null } as unknown as CoreNode;
}

function makeAnim(duration = 1000) {
  return new CoreAnimation(makeNode(), { x: 100 }, { duration });
}

describe('AnimationManager', () => {
  describe('registerAnimation()', () => {
    it('adds the animation to activeAnimations', () => {
      const manager = new AnimationManager();
      const anim = makeAnim();
      manager.registerAnimation(anim);
      expect(manager.activeAnimations.has(anim)).toBe(true);
    });
  });

  describe('unregisterAnimation()', () => {
    it('removes the animation from activeAnimations', () => {
      const manager = new AnimationManager();
      const anim = makeAnim();
      manager.registerAnimation(anim);
      manager.unregisterAnimation(anim);
      expect(manager.activeAnimations.has(anim)).toBe(false);
    });

    it('does not throw when unregistering an unknown animation', () => {
      const manager = new AnimationManager();
      const anim = makeAnim();
      expect(() => manager.unregisterAnimation(anim)).not.toThrow();
    });
  });

  describe('update()', () => {
    it('calls update(dt) on every active animation', () => {
      const manager = new AnimationManager();
      const a1 = makeAnim();
      const a2 = makeAnim();
      const spy1 = vi.spyOn(a1, 'update');
      const spy2 = vi.spyOn(a2, 'update');
      manager.registerAnimation(a1);
      manager.registerAnimation(a2);
      manager.update(16);
      expect(spy1).toHaveBeenCalledWith(16);
      expect(spy2).toHaveBeenCalledWith(16);
    });

    it('does not call update on unregistered animations', () => {
      const manager = new AnimationManager();
      const anim = makeAnim();
      const spy = vi.spyOn(anim, 'update');
      manager.registerAnimation(anim);
      manager.unregisterAnimation(anim);
      manager.update(16);
      expect(spy).not.toHaveBeenCalled();
    });

    it('handles an empty activeAnimations set without error', () => {
      const manager = new AnimationManager();
      expect(() => manager.update(16)).not.toThrow();
    });
  });
});
