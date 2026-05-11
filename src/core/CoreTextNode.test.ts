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

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CoreTextNode, type CoreTextNodeProps } from './CoreTextNode.js';
import { CoreNodeRenderState } from './CoreNode.js';
import { Stage } from './Stage.js';
import { CoreRenderer } from './renderers/CoreRenderer.js';
import { mock } from 'vitest-mock-extended';
import type { TextRenderer } from './text-rendering/TextRenderer.js';
import { createBound } from './lib/utils.js';

describe('CoreTextNode', () => {
  let stage: Stage;
  let mockTextRenderer: TextRenderer;

  const defaultTextProps: CoreTextNodeProps = {
    // CoreNodeProps
    alpha: 1,
    autosize: false,
    boundsMargin: null,
    clipping: false,
    color: 0xffffffff,
    colorBl: 0xffffffff,
    colorBottom: 0xffffffff,
    colorBr: 0xffffffff,
    colorLeft: 0xffffffff,
    colorRight: 0xffffffff,
    colorTl: 0xffffffff,
    colorTop: 0xffffffff,
    colorTr: 0xffffffff,
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
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    shader: null,
    src: '',
    texture: null,
    textureOptions: {},
    w: 0,
    x: 0,
    y: 0,
    zIndex: 0,
    // TrProps
    text: 'Test',
    textAlign: 'left',
    contain: 'none',
    fontFamily: 'Arial',
    fontStyle: 'normal',
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 1,
    maxHeight: 0,
    maxLines: 0,
    maxWidth: 0,
    offsetY: 0,
    overflowSuffix: '...',
    verticalAlign: 'top',
    wordBreak: 'break-word',
    // CoreTextNodeProps specific
    textRendererOverride: null,
    forceLoad: false,
  };

  const clippingRect = {
    x: 0,
    y: 0,
    w: 200,
    h: 200,
    valid: true,
  };

  beforeEach(() => {
    stage = mock<Stage>({
      strictBound: createBound(0, 0, 1920, 1080),
      preloadBound: createBound(0, 0, 1920, 1080),
      defaultTexture: {
        state: 'loaded',
      },
      renderer: mock<CoreRenderer>() as CoreRenderer,
    });

    // Mock text renderer with basic functionality
    mockTextRenderer = {
      type: 'sdf',
      font: {
        isFontLoaded: vi.fn().mockReturnValue(true),
        waitingForFont: vi.fn(),
        stopWaitingForFont: vi.fn(),
      },
      renderText: vi.fn().mockReturnValue({
        width: 100,
        height: 20,
        layout: { glyphs: [], width: 100, height: 20 },
      }),
      addQuads: vi.fn().mockReturnValue(new Float32Array(0)),
      renderQuads: vi.fn(),
    } as any;
  });

  describe('text property handling', () => {
    it('should normalize empty string and set node as non-renderable', () => {
      const node = new CoreTextNode(stage, defaultTextProps, mockTextRenderer);

      node.text = '';

      expect(node.text).toBe('');
      expect(node.isRenderable).toBe(false);
    });

    it('should normalize null to empty string and set node as non-renderable', () => {
      const node = new CoreTextNode(stage, defaultTextProps, mockTextRenderer);

      node.text = null as any;

      expect(node.text).toBe('');
      expect(node.isRenderable).toBe(false);
    });

    it('should normalize undefined to empty string and set node as non-renderable', () => {
      const node = new CoreTextNode(stage, defaultTextProps, mockTextRenderer);

      node.text = undefined as any;

      expect(node.text).toBe('');
      expect(node.isRenderable).toBe(false);
    });

    it('should convert non-string values to strings', () => {
      const node = new CoreTextNode(stage, defaultTextProps, mockTextRenderer);

      node.text = 123 as any;

      expect(node.text).toBe('123');
    });

    it('should handle valid text and allow node to be renderable', () => {
      const node = new CoreTextNode(stage, defaultTextProps, mockTextRenderer);

      node.text = 'Valid text content';

      expect(node.text).toBe('Valid text content');
      // Note: renderable state is determined during update cycle
    });

    it('should clear cached layout data when text is set to empty', () => {
      const props = { ...defaultTextProps, text: 'Initial text' };
      const node = new CoreTextNode(stage, props, mockTextRenderer);

      // Simulate some cached state
      node.text = '';

      expect(node.text).toBe('');
      expect(node.isRenderable).toBe(false);
    });

    it('should clear cached layout data when text is set to null', () => {
      const props = { ...defaultTextProps, text: 'Initial text' };
      const node = new CoreTextNode(stage, props, mockTextRenderer);

      node.text = null as any;

      expect(node.text).toBe('');
      expect(node.isRenderable).toBe(false);
    });

    it('should clear cached layout data when text is set to undefined', () => {
      const props = { ...defaultTextProps, text: 'Initial text' };
      const node = new CoreTextNode(stage, props, mockTextRenderer);

      node.text = undefined as any;

      expect(node.text).toBe('');
      expect(node.isRenderable).toBe(false);
    });

    it('should not call renderText during update when text is empty', () => {
      const props = { ...defaultTextProps, text: '', forceLoad: true };
      const node = new CoreTextNode(stage, props, mockTextRenderer);

      node.update(16, clippingRect);

      expect(mockTextRenderer.renderText).not.toHaveBeenCalled();
    });

    it('should not call renderText during update when text is null', () => {
      const props = { ...defaultTextProps, text: null as any, forceLoad: true };
      const node = new CoreTextNode(stage, props, mockTextRenderer);

      node.update(16, clippingRect);

      expect(mockTextRenderer.renderText).not.toHaveBeenCalled();
    });

    it('should transition from valid text to empty text correctly', () => {
      const props = { ...defaultTextProps, text: 'Valid text' };
      const node = new CoreTextNode(stage, props, mockTextRenderer);

      // Set to valid text first
      node.text = 'Some content';
      expect(node.text).toBe('Some content');

      // Then set to empty
      node.text = '';
      expect(node.text).toBe('');
      expect(node.isRenderable).toBe(false);
    });

    it('should transition from empty text to valid text correctly', () => {
      const props = { ...defaultTextProps, text: '' };
      const node = new CoreTextNode(stage, props, mockTextRenderer);

      expect(node.text).toBe('');
      expect(node.isRenderable).toBe(false);

      // Set to valid text
      node.text = 'New content';
      expect(node.text).toBe('New content');
    });

    it('should handle rapid text changes including null/undefined', () => {
      const props = { ...defaultTextProps, text: 'Initial' };
      const node = new CoreTextNode(stage, props, mockTextRenderer);

      node.text = 'First';
      expect(node.text).toBe('First');

      node.text = null as any;
      expect(node.text).toBe('');
      expect(node.isRenderable).toBe(false);

      node.text = 'Second';
      expect(node.text).toBe('Second');

      node.text = undefined as any;
      expect(node.text).toBe('');
      expect(node.isRenderable).toBe(false);

      node.text = 'Third';
      expect(node.text).toBe('Third');
    });
  });

  describe('updateIsRenderable with invalid text', () => {
    it('should mark node as non-renderable when text is empty', () => {
      const props = { ...defaultTextProps, text: '' };
      const node = new CoreTextNode(stage, props, mockTextRenderer);

      node.updateIsRenderable();

      expect(node.isRenderable).toBe(false);
    });

    it('should mark node as non-renderable even if layout exists when text is empty', () => {
      const props = { ...defaultTextProps, text: 'Valid' };
      const node = new CoreTextNode(stage, props, mockTextRenderer);

      // Change text to empty after potential layout generation
      node.text = '';
      node.updateIsRenderable();

      expect(node.isRenderable).toBe(false);
    });
  });

  describe('update cycle with invalid text', () => {
    it('should skip layout generation when text is empty', () => {
      const props = { ...defaultTextProps, text: '', forceLoad: true };
      const node = new CoreTextNode(stage, props, mockTextRenderer);

      node.update(16, clippingRect);

      expect(mockTextRenderer.renderText).not.toHaveBeenCalled();
      expect(node.isRenderable).toBe(false);
    });

    it('should skip layout generation when text becomes empty during update', () => {
      const props = { ...defaultTextProps, text: 'Valid', forceLoad: true };
      const node = new CoreTextNode(stage, props, mockTextRenderer);

      node.text = '';
      node.update(16, clippingRect);

      expect(node.isRenderable).toBe(false);
    });
  });

  function makeStageWithDeleteBuffer(deleteBuffer: ReturnType<typeof vi.fn>) {
    return mock<Stage>({
      strictBound: createBound(0, 0, 1920, 1080),
      preloadBound: createBound(0, 0, 1920, 1080),
      defaultTexture: { state: 'loaded' },
      renderer: { deleteBuffer } as unknown as CoreRenderer,
    });
  }

  describe('updateRenderState – SDF buffer release on OutOfBounds', () => {
    it('should call renderer.deleteBuffer and clear _sdfBuffer when transitioning to OutOfBounds', () => {
      const deleteBuffer = vi.fn();
      const node = new CoreTextNode(
        makeStageWithDeleteBuffer(deleteBuffer),
        defaultTextProps,
        mockTextRenderer,
      );

      // Simulate a live WebGLBuffer sitting in the ref
      const fakeBuffer = {};
      (node as any)._sdfBuffer = fakeBuffer;

      node.updateRenderState(CoreNodeRenderState.OutOfBounds);

      expect(deleteBuffer).toHaveBeenCalledWith(fakeBuffer);
      expect((node as any)._sdfBuffer).toBeNull();
    });

    it('should not call renderer.deleteBuffer when _sdfBuffer is already null', () => {
      const deleteBuffer = vi.fn();
      const node = new CoreTextNode(
        makeStageWithDeleteBuffer(deleteBuffer),
        defaultTextProps,
        mockTextRenderer,
      );

      // _sdfBufferRef.current is null by default
      node.updateRenderState(CoreNodeRenderState.OutOfBounds);

      expect(deleteBuffer).not.toHaveBeenCalled();
    });

    it('should not release the buffer when transitioning to InBounds', () => {
      const deleteBuffer = vi.fn();
      const node = new CoreTextNode(
        makeStageWithDeleteBuffer(deleteBuffer),
        defaultTextProps,
        mockTextRenderer,
      );

      const fakeBuffer = {};
      (node as any)._sdfBuffer = fakeBuffer;

      node.updateRenderState(CoreNodeRenderState.InBounds);

      expect(deleteBuffer).not.toHaveBeenCalled();
      expect((node as any)._sdfBuffer).toBe(fakeBuffer);
    });

    it('should not release the buffer for a canvas-type text node', () => {
      const deleteBuffer = vi.fn();
      const canvasTextRenderer = {
        ...mockTextRenderer,
        type: 'canvas' as const,
      } as any;

      const node = new CoreTextNode(
        makeStageWithDeleteBuffer(deleteBuffer),
        defaultTextProps,
        canvasTextRenderer,
      );

      (node as any)._sdfBuffer = {};

      node.updateRenderState(CoreNodeRenderState.OutOfBounds);

      expect(deleteBuffer).not.toHaveBeenCalled();
    });
  });

  describe('SDF buffer release on layout regeneration', () => {
    it('should call renderer.deleteBuffer before regenerating layout when font is already loaded', () => {
      const deleteBuffer = vi.fn();
      const props = { ...defaultTextProps, forceLoad: true };
      const node = new CoreTextNode(
        makeStageWithDeleteBuffer(deleteBuffer),
        props,
        mockTextRenderer,
      );

      const fakeBuffer = {} as WebGLBuffer;
      (node as any)._sdfBuffer = fakeBuffer;

      node.update(16, clippingRect);

      expect(deleteBuffer).toHaveBeenCalledWith(fakeBuffer);
      expect((node as any)._sdfBuffer).toBeNull();
    });

    it('should call renderer.deleteBuffer again on each subsequent layout regeneration', () => {
      const deleteBuffer = vi.fn();
      const props = { ...defaultTextProps, forceLoad: true };
      const node = new CoreTextNode(
        makeStageWithDeleteBuffer(deleteBuffer),
        props,
        mockTextRenderer,
      );

      node.update(16, clippingRect); // first layout – no buffer yet, no delete call
      expect(deleteBuffer).not.toHaveBeenCalled();

      // Trigger a second layout pass by invalidating the layout
      node.fontSize = 24;
      const secondBuffer = {} as WebGLBuffer;
      (node as any)._sdfBuffer = secondBuffer;

      node.update(16, clippingRect);

      expect(deleteBuffer).toHaveBeenCalledWith(secondBuffer);
      expect((node as any)._sdfBuffer).toBeNull();
    });

    it('should not call renderer.deleteBuffer when buffer is already null at regeneration time', () => {
      const deleteBuffer = vi.fn();
      const props = { ...defaultTextProps, forceLoad: true };
      const node = new CoreTextNode(
        makeStageWithDeleteBuffer(deleteBuffer),
        props,
        mockTextRenderer,
      );

      // _sdfBuffer is null by default
      node.update(16, clippingRect);

      expect(deleteBuffer).not.toHaveBeenCalled();
    });
  });

  describe('SDF buffer release when text becomes invalid', () => {
    it('should call renderer.deleteBuffer when text is cleared during update', () => {
      const deleteBuffer = vi.fn();
      const props = { ...defaultTextProps, text: 'Hello', forceLoad: true };
      const node = new CoreTextNode(
        makeStageWithDeleteBuffer(deleteBuffer),
        props,
        mockTextRenderer,
      );

      // Prime the node with a cached buffer
      const fakeBuffer = {} as WebGLBuffer;
      (node as any)._sdfBuffer = fakeBuffer;
      (node as any)._layoutGenerated = true;

      node.text = '';
      node.update(16, clippingRect);

      expect(deleteBuffer).toHaveBeenCalledWith(fakeBuffer);
      expect((node as any)._sdfBuffer).toBeNull();
    });

    it('should not call renderer.deleteBuffer when text is invalid and buffer is already null', () => {
      const deleteBuffer = vi.fn();
      const props = { ...defaultTextProps, text: '', forceLoad: true };
      const node = new CoreTextNode(
        makeStageWithDeleteBuffer(deleteBuffer),
        props,
        mockTextRenderer,
      );

      node.update(16, clippingRect);

      expect(deleteBuffer).not.toHaveBeenCalled();
    });

    it('should also clear _renderInfo when text becomes invalid', () => {
      const deleteBuffer = vi.fn();
      const props = { ...defaultTextProps, text: 'Hello', forceLoad: true };
      const node = new CoreTextNode(
        makeStageWithDeleteBuffer(deleteBuffer),
        props,
        mockTextRenderer,
      );

      (node as any)._renderInfo = {};
      (node as any)._layoutGenerated = true;

      node.text = '';
      node.update(16, clippingRect);

      expect((node as any)._renderInfo).toBeNull();
    });
  });

  describe('SDF buffer release on destroy', () => {
    it('should call renderer.deleteBuffer on destroy when a buffer is held', () => {
      const deleteBuffer = vi.fn();
      const node = new CoreTextNode(
        makeStageWithDeleteBuffer(deleteBuffer),
        defaultTextProps,
        mockTextRenderer,
      );

      const fakeBuffer = {} as WebGLBuffer;
      (node as any)._sdfBuffer = fakeBuffer;

      node.destroy();

      expect(deleteBuffer).toHaveBeenCalledWith(fakeBuffer);
      expect((node as any)._sdfBuffer).toBeNull();
    });

    it('should not call renderer.deleteBuffer on destroy when buffer is already null', () => {
      const deleteBuffer = vi.fn();
      const node = new CoreTextNode(
        makeStageWithDeleteBuffer(deleteBuffer),
        defaultTextProps,
        mockTextRenderer,
      );

      // _sdfBuffer is null by default
      node.destroy();

      expect(deleteBuffer).not.toHaveBeenCalled();
    });

    it('should clear _renderInfo on destroy', () => {
      const node = new CoreTextNode(stage, defaultTextProps, mockTextRenderer);

      (node as any)._renderInfo = {};

      node.destroy();

      expect((node as any)._renderInfo).toBeNull();
    });
  });
});
