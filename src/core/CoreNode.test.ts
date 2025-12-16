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

import { describe, expect, it, vi } from 'vitest';
import { CoreNode, type CoreNodeProps, UpdateType } from './CoreNode.js';
import { Stage } from './Stage.js';
import { mock } from 'vitest-mock-extended';
import { type TextureOptions } from './CoreTextureManager.js';
import { type BaseShaderController } from '../main-api/ShaderController';
import { createBound } from './lib/utils.js';
import { ImageTexture } from './textures/ImageTexture.js';

describe('set color()', () => {
  const defaultProps: CoreNodeProps = {
    alpha: 0,
    autosize: false,
    boundsMargin: null,
    clipping: false,
    color: 0,
    colorBl: 0,
    colorBottom: 0,
    colorBr: 0,
    colorLeft: 0,
    colorRight: 0,
    colorTl: 0,
    colorTop: 0,
    colorTr: 0,
    height: 0,
    mount: 0,
    mountX: 0,
    mountY: 0,
    parent: null,
    pivot: 0,
    pivotX: 0,
    pivotY: 0,
    rotation: 0,
    rtt: false,
    scale: 0,
    scaleX: 0,
    scaleY: 0,
    shader: mock<BaseShaderController>(),
    src: '',
    texture: null,
    textureOptions: {} as TextureOptions,
    width: 0,
    x: 0,
    y: 0,
    zIndex: 0,
    zIndexLocked: 0,
    preventCleanup: false,
    strictBounds: false,
  };

  const clippingRect = {
    x: 0,
    y: 0,
    width: 200,
    height: 200,
    valid: false,
  };

  const stage = mock<Stage>({
    strictBound: createBound(0, 0, 200, 200),
    preloadBound: createBound(0, 0, 200, 200),
    defaultTexture: {
      state: 'loaded',
    },
  });

  describe('set color()', () => {
    it('should set all color subcomponents.', () => {
      const node = new CoreNode(stage, defaultProps);
      node.colorBl = 0x99aabbff;
      node.colorBr = 0xaabbccff;
      node.colorTl = 0xbbcceeff;
      node.colorTr = 0xcceeffff;

      node.color = 0xffffffff;

      expect(node.color).toBe(0xffffffff);
      expect(node.colorBl).toBe(0xffffffff);
      expect(node.colorBr).toBe(0xffffffff);
      expect(node.colorTl).toBe(0xffffffff);
      expect(node.colorTr).toBe(0xffffffff);
      expect(node.colorLeft).toBe(0xffffffff);
      expect(node.colorRight).toBe(0xffffffff);
      expect(node.colorTop).toBe(0xffffffff);
      expect(node.colorBottom).toBe(0xffffffff);
    });

    it('should set update type.', () => {
      const node = new CoreNode(stage, defaultProps);
      node.updateType = 0;

      node.color = 0xffffffff;

      expect(node.updateType).toBe(UpdateType.PremultipliedColors);
    });
  });

  describe('isRenderable checks', () => {
    it('should return false if node is not renderable', () => {
      const node = new CoreNode(stage, defaultProps);
      expect(node.isRenderable).toBe(false);
    });

    it('visible node that is a color texture', () => {
      const node = new CoreNode(stage, defaultProps);
      node.alpha = 1;
      node.x = 0;
      node.y = 0;
      node.width = 100;
      node.height = 100;
      node.color = 0xffffffff;

      node.update(0, clippingRect);
      expect(node.isRenderable).toBe(true);
    });

    it('visible node that is a texture', () => {
      const node = new CoreNode(stage, defaultProps);
      node.alpha = 1;
      node.x = 0;
      node.y = 0;
      node.width = 100;
      node.height = 100;
      node.texture = mock<ImageTexture>({
        state: 'initial',
      });

      node.update(0, clippingRect);
      expect(node.isRenderable).toBe(false);

      node.texture.state = 'loaded';
      node.setUpdateType(UpdateType.IsRenderable);
      node.update(1, clippingRect);

      expect(node.isRenderable).toBe(true);
    });

    it('a node with a texture with alpha 0 should not be renderable', () => {
      const node = new CoreNode(stage, defaultProps);
      node.alpha = 0;
      node.x = 0;
      node.y = 0;
      node.width = 100;
      node.height = 100;
      node.texture = mock<ImageTexture>({
        state: 'loaded',
      });

      node.update(0, clippingRect);
      expect(node.isRenderable).toBe(false);
    });

    it('a node with a texture that is OutOfBounds should not be renderable', () => {
      const node = new CoreNode(stage, defaultProps);
      node.alpha = 1;
      node.x = 300;
      node.y = 300;
      node.width = 100;
      node.height = 100;
      node.texture = mock<ImageTexture>({
        state: 'loaded',
      });

      node.update(0, clippingRect);
      expect(node.isRenderable).toBe(false);
    });

    it('a node with a freed texture should not be renderable', () => {
      const node = new CoreNode(stage, defaultProps);
      node.alpha = 1;
      node.x = 0;
      node.y = 0;
      node.width = 100;
      node.height = 100;
      node.texture = mock<ImageTexture>({
        state: 'freed',
      });

      node.update(0, clippingRect);
      expect(node.isRenderable).toBe(false);
    });

    it('should emit renderable event when isRenderable status changes', () => {
      const node = new CoreNode(stage, defaultProps);
      const eventCallback = vi.fn();

      // Listen for the renderableChanged event
      node.on('renderable', eventCallback);

      // Set up node as a color texture that should be renderable
      node.alpha = 1;
      node.x = 0;
      node.y = 0;
      node.width = 100;
      node.height = 100;
      node.color = 0xffffffff;

      // Initial state should be false
      expect(node.isRenderable).toBe(false);
      expect(eventCallback).not.toHaveBeenCalled();

      // Update should make it renderable (false -> true)
      node.update(0, clippingRect);
      expect(node.isRenderable).toBe(true);
      expect(eventCallback).toHaveBeenCalledWith(node, {
        type: 'renderable',
        isRenderable: true,
      });

      // Reset the mock
      eventCallback.mockClear();

      // Make node invisible (alpha = 0) to make it not renderable (true -> false)
      node.alpha = 0;
      node.update(1, clippingRect);
      expect(node.isRenderable).toBe(false);
      expect(eventCallback).toHaveBeenCalledWith(node, {
        type: 'renderable',
        isRenderable: false,
      });

      // Reset the mock again
      eventCallback.mockClear();

      // Setting same value shouldn't trigger event
      node.alpha = 0;
      node.update(2, clippingRect);
      expect(node.isRenderable).toBe(false);
      expect(eventCallback).not.toHaveBeenCalled();
    });
  });
});
