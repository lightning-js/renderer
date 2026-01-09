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
import { CoreRenderer } from './renderers/CoreRenderer.js';
import { mock } from 'vitest-mock-extended';
import { type TextureOptions } from './CoreTextureManager.js';
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
    h: 0,
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
    shader: null,
    src: '',
    texture: null,
    textureOptions: {} as TextureOptions,
    w: 0,
    x: 0,
    y: 0,
    zIndex: 0,
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
    renderer: mock<CoreRenderer>() as CoreRenderer,
  });

  describe('set color()', () => {
    it('should set all color subcomponents.', () => {
      const node = new CoreNode(stage, defaultProps);
      node.colorBl = 0x99aabbff;
      node.colorBr = 0xaabbccff;
      node.colorTl = 0xbbcceeff;
      node.colorTr = 0xcceeffff;

      node.color = 0xffffffff;
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
      node.w = 100;
      node.h = 100;
      node.color = 0xffffffff;

      node.update(0, clippingRect);
      expect(node.isRenderable).toBe(true);
    });

    it('visible node that is a texture', () => {
      const node = new CoreNode(stage, defaultProps);
      node.alpha = 1;
      node.x = 0;
      node.y = 0;
      node.w = 100;
      node.h = 100;
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
      node.w = 100;
      node.h = 100;
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
      node.w = 100;
      node.h = 100;
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
      node.w = 100;
      node.h = 100;
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
      node.w = 100;
      node.h = 100;
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

  describe('autosize system', () => {
    it('should initialize with autosize disabled', () => {
      const node = new CoreNode(stage, defaultProps);
      expect(node.autosize).toBe(false);
    });

    it('should enable texture autosize when texture is present', () => {
      const node = new CoreNode(stage, defaultProps);
      const mockTexture = mock<ImageTexture>();
      mockTexture.state = 'loading';

      node.texture = mockTexture;
      node.autosize = true;

      // Should not create autosize manager for texture mode
      expect((node as any).autosizeManager).toBeFalsy();
    });

    it('should enable children autosize when no texture but has children', () => {
      const parent = new CoreNode(stage, defaultProps);
      const child = new CoreNode(stage, defaultProps);

      parent.autosize = true;
      child.parent = parent;

      // Should create autosize manager for children mode
      expect((parent as any).autosizeManager).toBeTruthy();
    });

    it('should prioritize texture autosize over children autosize', () => {
      const parent = new CoreNode(stage, defaultProps);
      const child = new CoreNode(stage, defaultProps);
      const mockTexture = mock<ImageTexture>();
      mockTexture.state = 'loading';

      child.parent = parent;
      parent.texture = mockTexture;
      parent.autosize = true;

      expect(parent.autosize).toBe(true);
      // Should NOT create autosize manager when texture is present
      expect((parent as any).autosizeManager).toBeFalsy();
    });

    it('should switch from children to texture autosize when texture is added', () => {
      const parent = new CoreNode(stage, defaultProps);
      const child = new CoreNode(stage, defaultProps);

      child.parent = parent;
      parent.autosize = true;
      expect((parent as any).autosizeManager).toBeTruthy();

      // Add texture - should switch to texture autosize
      const mockTexture = mock<ImageTexture>();
      mockTexture.state = 'loading';
      parent.texture = mockTexture;

      expect((parent as any).autosizeManager).toBeFalsy();
    });

    it('should switch from texture to children autosize when texture is removed', () => {
      const parent = new CoreNode(stage, defaultProps);
      const child = new CoreNode(stage, defaultProps);
      const mockTexture = mock<ImageTexture>();
      mockTexture.state = 'loading';

      child.parent = parent;
      parent.texture = mockTexture;
      parent.autosize = true;
      expect((parent as any).autosizeManager).toBeFalsy();

      // Remove texture - should switch to children autosize
      parent.texture = null;
      expect((parent as any).autosizeManager).toBeTruthy();
    });

    it('should cleanup autosize manager when disabled', () => {
      const parent = new CoreNode(stage, defaultProps);
      const child = new CoreNode(stage, defaultProps);

      child.parent = parent;
      parent.autosize = true;
      expect((parent as any).autosizeManager).toBeTruthy();

      parent.autosize = false;
      expect((parent as any).autosizeManager).toBeFalsy();
    });

    it('should establish autosize chain when child is added to autosize parent', () => {
      const parent = new CoreNode(stage, defaultProps);
      const child = new CoreNode(stage, defaultProps);

      // Enable autosize BEFORE adding child
      parent.autosize = true;
      child.parent = parent;

      expect((child as any).autosizeParent).toBe(parent);
      expect((parent as any).autosizeManager.childCount).toBe(1);
    });

    it('should remove from autosize chain when child is removed', () => {
      const parent = new CoreNode(stage, defaultProps);
      const child = new CoreNode(stage, defaultProps);

      // Enable autosize BEFORE adding child
      parent.autosize = true;
      child.parent = parent;
      expect((parent as any).autosizeManager.childCount).toBe(1);

      child.parent = null;
      expect((child as any).autosizeParent).toBeNull();
      // When last child is removed, unified autosize switches away from children mode
      // so autosizeManager gets cleaned up (null)
      expect((parent as any).autosizeManager).toBeFalsy();
    });
  });
});
