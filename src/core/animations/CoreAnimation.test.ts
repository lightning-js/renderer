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

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import type { CoreNode } from '../CoreNode.js';
import { CoreAnimation } from './CoreAnimation.js';

describe('CoreAnimation', () => {
  let node: CoreNode;
  let animation: CoreAnimation;

  beforeEach(() => {
    node = mock<CoreNode>({
      x: 10,
      alpha: 1,
      color: 0xffffffff,
      destroyed: false,
    });
    animation = new CoreAnimation();
  });

  describe('completion', () => {
    it('should apply target values when an update lands exactly at the duration', () => {
      animation.init(
        node,
        { x: 100, alpha: 0, color: 0xff0000ff },
        { duration: 100 },
      );
      const finished = vi.fn();
      animation.on('finished', finished);

      animation.update(100);

      expect(node.x).toEqual(100);
      expect(node.alpha).toEqual(0);
      expect(node.color).toEqual(0xff0000ff);
      expect(finished).toHaveBeenCalledTimes(1);
    });

    it('should clamp to target values when a frame overshoots the duration', () => {
      animation.init(
        node,
        { x: 100, alpha: 0, color: 0xff0000ff },
        { duration: 100 },
      );
      const finished = vi.fn();
      animation.on('finished', finished);

      animation.update(116);

      expect(node.x).toEqual(100);
      expect(node.alpha).toEqual(0);
      expect(node.color).toEqual(0xff0000ff);
      expect(finished).toHaveBeenCalledTimes(1);
    });
  });

  describe('zero duration', () => {
    it('should apply node target even when no frame time has elapsed', () => {
      animation.init(
        node,
        {
          x: 100,
          alpha: 0,
          color: 0xff0000ff,
        },
        { duration: 0 },
      );
      const finished = vi.fn();
      animation.on('finished', finished);

      animation.update(0);

      expect(node.x).toEqual(100);
      expect(node.alpha).toEqual(0);
      expect(node.color).toEqual(0xff0000ff);
      expect(finished).toHaveBeenCalledTimes(1);
    });

    it('should apply node target when a frame advances by 16 ms', () => {
      animation.init(
        node,
        {
          x: 100,
          alpha: 0,
          color: 0xff0000ff,
        },
        { duration: 0 },
      );
      const finished = vi.fn();
      animation.on('finished', finished);

      animation.update(16);

      expect(node.x).toEqual(100);
      expect(node.alpha).toEqual(0);
      expect(node.color).toEqual(0xff0000ff);
      expect(finished).toHaveBeenCalledTimes(1);
    });

    it('should preserve the start value until the delay has elapsed', () => {
      animation.init(node, { x: 100 }, { duration: 0, delay: 100 });
      const finished = vi.fn();
      animation.on('finished', finished);

      animation.update(50);
      expect(node.x).toEqual(10);
      expect(finished).not.toHaveBeenCalled();

      animation.update(51);
      expect(node.x).toEqual(100);
      expect(finished).toHaveBeenCalledTimes(1);
    });

    it('should apply target when duration is omitted', () => {
      animation.init(node, { x: 100 }, {});
      const finished = vi.fn();
      animation.on('finished', finished);

      animation.update(0);

      expect(node.x).toEqual(100);
      expect(finished).toHaveBeenCalledTimes(1);
    });

    it('should return to the start value after reversing', () => {
      animation.init(node, { x: 100 }, { duration: 0 });

      animation.update(0);
      expect(node.x).toEqual(100);

      animation.reverse();
      animation.update(0);
      expect(node.x).toEqual(10);
    });
  });
});
