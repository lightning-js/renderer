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
import type { TextRenderer } from './text-rendering/TextRenderer.js';
import { makeMockStage, makeTextProps } from '../../test/mockStage.js';

describe('CoreTextNode', () => {
  let stage: Stage;
  let mockTextRenderer: TextRenderer;

  const defaultTextProps: CoreTextNodeProps = makeTextProps();

  const clippingRect = {
    x: 0,
    y: 0,
    w: 200,
    h: 200,
    valid: true,
    clipRadius: 0,
  };

  beforeEach(() => {
    stage = makeMockStage();

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
    return makeMockStage({
      renderer: { deleteBuffer } as unknown as CoreRenderer,
    });
  }

  function createSdfRenderInfo() {
    return {
      type: 'sdf' as const,
      width: 100,
      height: 20,
      atlasTexture: {} as any,
      layout: {
        glyphs: new Float32Array([0, 0, 0, 0, 10, 0, 1, 0]),
        glyphCount: 1,
        totalQuadCount: 1,
        richText: false,
        width: 100,
        height: 20,
        fontScale: 1,
        lineHeight: 20,
        fontFamily: 'Arial',
        distanceRange: 4,
      },
      hasRemainingText: false,
      remainingLines: 0,
    };
  }

  describe('updateRenderState – SDF cache release on OutOfBounds', () => {
    function seedCache(node: CoreTextNode) {
      (node as any)._sdfCache = {
        vertices: new Float32Array([0, 0]),
        glyphCount: 1,
        color: 0xffffffff,
        alpha: 1,
        transform: new Float32Array(6),
        layoutRef: null,
      };
    }

    it('should clear the SDF cache when transitioning to OutOfBounds', () => {
      const node = new CoreTextNode(stage, defaultTextProps, mockTextRenderer);

      seedCache(node);
      (node as any)._renderInfo = createSdfRenderInfo();

      node.updateRenderState(CoreNodeRenderState.OutOfBounds);

      expect((node as any)._sdfCache).toBeNull();
    });

    it('should not call renderer.deleteBuffer (buffers are renderer-owned)', () => {
      const deleteBuffer = vi.fn();
      const node = new CoreTextNode(
        makeStageWithDeleteBuffer(deleteBuffer),
        defaultTextProps,
        mockTextRenderer,
      );

      (node as any)._renderInfo = createSdfRenderInfo();
      node.updateRenderState(CoreNodeRenderState.OutOfBounds);

      expect(deleteBuffer).not.toHaveBeenCalled();
    });

    it('should not release the cache when transitioning to InBounds', () => {
      const node = new CoreTextNode(stage, defaultTextProps, mockTextRenderer);

      seedCache(node);
      (node as any)._renderInfo = createSdfRenderInfo();

      node.updateRenderState(CoreNodeRenderState.InBounds);

      expect((node as any)._sdfCache).not.toBeNull();
    });

    it('should not release the cache for a canvas-type text node', () => {
      const canvasTextRenderer = {
        ...mockTextRenderer,
        type: 'canvas' as const,
      } as any;

      const node = new CoreTextNode(
        stage,
        defaultTextProps,
        canvasTextRenderer,
      );

      seedCache(node);
      (node as any)._renderInfo = {
        type: 'canvas',
        width: 100,
        height: 20,
        imageData: {} as ImageData,
        hasRemainingText: false,
        remainingLines: 0,
      };

      node.updateRenderState(CoreNodeRenderState.OutOfBounds);

      expect((node as any)._sdfCache).not.toBeNull();
    });
  });

  describe('SDF cache release on layout regeneration', () => {
    it('should drop the cache before regenerating layout when font is already loaded', () => {
      const props = { ...defaultTextProps, forceLoad: true };
      const node = new CoreTextNode(stage, props, mockTextRenderer);

      (node as any)._sdfCache = {
        vertices: new Float32Array([0, 0]),
        glyphCount: 1,
        color: 0xffffffff,
        alpha: 1,
        transform: new Float32Array(6),
        layoutRef: null,
      };

      node.update(16, clippingRect);

      // The stale cached vertices are dropped; a fresh empty cache is created
      // when the new layout renders.
      const cache = (node as any)._sdfCache;
      expect(cache).not.toBeNull();
      expect(cache.vertices).toBeNull();
      expect(cache.layoutRef).toBeNull();
    });

    it('should not call renderer.deleteBuffer (buffers are renderer-owned)', () => {
      const deleteBuffer = vi.fn();
      const props = { ...defaultTextProps, forceLoad: true };
      const node = new CoreTextNode(
        makeStageWithDeleteBuffer(deleteBuffer),
        props,
        mockTextRenderer,
      );

      (node as any)._sdfCache = {
        vertices: new Float32Array([0, 0]),
        glyphCount: 1,
        color: 0xffffffff,
        alpha: 1,
        transform: new Float32Array(6),
        layoutRef: null,
      };

      node.update(16, clippingRect);

      expect(deleteBuffer).not.toHaveBeenCalled();
    });
  });

  describe('SDF cache release when text becomes invalid', () => {
    it('should drop the cache when text is cleared during update', () => {
      const props = { ...defaultTextProps, text: 'Hello', forceLoad: true };
      const node = new CoreTextNode(stage, props, mockTextRenderer);

      // Prime the node with a cached layout and vertex cache
      (node as any)._sdfCache = {
        vertices: new Float32Array([0, 0]),
        glyphCount: 1,
        color: 0xffffffff,
        alpha: 1,
        transform: new Float32Array(6),
        layoutRef: null,
      };
      (node as any)._layoutGenerated = true;

      node.text = '';
      node.update(16, clippingRect);

      expect((node as any)._sdfCache).toBeNull();
    });

    it('should not call renderer.deleteBuffer when text is invalid and cache already null', () => {
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

      (node as any)._renderInfo = createSdfRenderInfo();

      node.text = '';
      node.update(16, clippingRect);

      expect((node as any)._renderInfo).toBeNull();
    });
  });

  describe('SDF cache release on destroy', () => {
    it('should clear the SDF cache on destroy when a cache is held', () => {
      const deleteBuffer = vi.fn();
      const node = new CoreTextNode(
        makeStageWithDeleteBuffer(deleteBuffer),
        defaultTextProps,
        mockTextRenderer,
      );

      (node as any)._sdfCache = {
        vertices: new Float32Array([0, 0]),
        glyphCount: 1,
        color: 0xffffffff,
        alpha: 1,
        transform: new Float32Array(6),
        layoutRef: null,
      };

      node.destroy();

      expect(deleteBuffer).not.toHaveBeenCalled();
      expect((node as any)._sdfCache).toBeNull();
    });

    it('should not call renderer.deleteBuffer on destroy when cache is already null', () => {
      const deleteBuffer = vi.fn();
      const node = new CoreTextNode(
        makeStageWithDeleteBuffer(deleteBuffer),
        defaultTextProps,
        mockTextRenderer,
      );

      // _sdfCache is null by default
      node.destroy();

      expect(deleteBuffer).not.toHaveBeenCalled();
    });

    it('should clear _renderInfo on destroy', () => {
      const node = new CoreTextNode(stage, defaultTextProps, mockTextRenderer);

      (node as any)._renderInfo = createSdfRenderInfo();

      node.destroy();

      expect((node as any)._renderInfo).toBeNull();
    });
  });

  describe('SDF render path', () => {
    it('submits glyphs to the renderer via textRenderer.renderQuads with cache props', () => {
      const node = new CoreTextNode(stage, defaultTextProps, mockTextRenderer);
      const transform = new Float32Array([1, 0, 0, 1, 0, 0]);

      (node as any).handleRenderResult(createSdfRenderInfo());
      (node as any).globalTransform = {
        getFloatArr: vi.fn().mockReturnValue(transform),
      };

      node.renderQuads(stage.renderer);
      node.renderQuads(stage.renderer);

      // Batched path: no per-node WebGL buffer is ever created.
      expect(mockTextRenderer.renderQuads).toHaveBeenCalledTimes(2);
      const layout = (node as any)._renderInfo.layout;
      const renderProps = (mockTextRenderer.renderQuads as any).mock
        .calls[0][3];
      expect((mockTextRenderer.renderQuads as any).mock.calls[0][1]).toBe(
        layout,
      );
      expect((mockTextRenderer.renderQuads as any).mock.calls[0][2]).toBeNull();
      expect(renderProps.globalTransform).toBe(transform);
      expect(renderProps.worldAlpha).toBe(node.worldAlpha);
      expect(renderProps.color).toBe(node.props.color);
      expect(renderProps.clippingRect).toBe(node.clippingRect);
      expect(renderProps.sdfCache).not.toBeNull();
      expect(renderProps.sdfCache).toBe((node as any)._sdfCache);
    });

    it('does not submit when _renderInfo is null', () => {
      const node = new CoreTextNode(stage, defaultTextProps, mockTextRenderer);

      node.renderQuads(stage.renderer);

      expect(mockTextRenderer.renderQuads).not.toHaveBeenCalled();
    });

    it('defers to super for canvas render info', () => {
      const canvasTextRenderer = {
        ...mockTextRenderer,
        type: 'canvas' as const,
      } as any;
      const node = new CoreTextNode(
        stage,
        defaultTextProps,
        canvasTextRenderer,
      );

      (node as any)._renderInfo = {
        type: 'canvas',
        width: 100,
        height: 20,
        imageData: {} as ImageData,
        hasRemainingText: false,
        remainingLines: 0,
      };
      node.texture = stage.defaultTexture as any;
      (node as any).props.texture = stage.defaultTexture;

      const addQuad = vi.fn();
      (stage.renderer as any).addQuad = addQuad;

      node.renderQuads(stage.renderer);

      expect(mockTextRenderer.renderQuads).not.toHaveBeenCalled();
      expect(addQuad).toHaveBeenCalled();
    });
  });

  describe('SDF batch key', () => {
    it('returns a batch key for main-pass SDF text', () => {
      const node = new CoreTextNode(stage, defaultTextProps, mockTextRenderer);

      (node as any).handleRenderResult(createSdfRenderInfo());

      const key = node.getSdfBatchKey();
      expect(key).not.toBeNull();
      expect(key!.richText).toBe(false);
      expect(key!.fontFamily).toBe('Arial');
      expect(key!.clippingRect).toBe(node.clippingRect);
    });

    it('reflects the rich layout in the batch key', () => {
      const node = new CoreTextNode(stage, defaultTextProps, mockTextRenderer);
      const info = createSdfRenderInfo();
      info.layout.richText = true;

      (node as any).handleRenderResult(info);

      expect(node.getSdfBatchKey()!.richText).toBe(true);
    });

    it('uses the node font family, not the layout font family', () => {
      const node = new CoreTextNode(stage, defaultTextProps, mockTextRenderer);

      (node as any).handleRenderResult(createSdfRenderInfo());
      node.fontFamily = 'NotoSans';

      expect(node.getSdfBatchKey()!.fontFamily).toBe('NotoSans');
    });

    it('returns null before layout generation', () => {
      const node = new CoreTextNode(stage, defaultTextProps, mockTextRenderer);

      expect(node.getSdfBatchKey()).toBeNull();
    });

    it('returns null for canvas text', () => {
      const canvasTextRenderer = {
        ...mockTextRenderer,
        type: 'canvas' as const,
      } as any;
      const node = new CoreTextNode(
        stage,
        defaultTextProps,
        canvasTextRenderer,
      );

      (node as any)._renderInfo = {
        type: 'canvas',
        width: 100,
        height: 20,
        imageData: {} as ImageData,
        hasRemainingText: false,
        remainingLines: 0,
      };

      expect(node.getSdfBatchKey()).toBeNull();
    });

    it('returns null for text inside a render-to-texture subtree', () => {
      const node = new CoreTextNode(stage, defaultTextProps, mockTextRenderer);

      (node as any).handleRenderResult(createSdfRenderInfo());
      (node as any).parentHasRenderTexture = true;

      expect(node.getSdfBatchKey()).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // richText property
  // -------------------------------------------------------------------------

  describe('richText property', () => {
    let node: CoreTextNode;

    beforeEach(() => {
      node = new CoreTextNode(stage, { ...defaultTextProps }, mockTextRenderer);
      // Start each test with a clean update state
      node.update(0, stage as any);
    });

    it('defaults to false', () => {
      const fresh = new CoreTextNode(
        stage,
        { ...defaultTextProps },
        mockTextRenderer,
      );
      expect(fresh.richText).toBe(false);
    });

    it('getter returns the stored value after being set to true', () => {
      node.richText = true;
      expect(node.richText).toBe(true);
    });

    it('getter returns false after being set back to false', () => {
      node.richText = true;
      node.richText = false;
      expect(node.richText).toBe(false);
    });

    it('setter marks layout as stale when value changes to true', () => {
      node['_layoutGenerated'] = true;
      node.richText = true;
      expect(node['_layoutGenerated']).toBe(false);
    });

    it('setter marks layout as stale when value changes back to false', () => {
      node.richText = true;
      node['_layoutGenerated'] = true;
      node.richText = false;
      expect(node['_layoutGenerated']).toBe(false);
    });

    it('setter does not mark layout as stale when value is unchanged (false → false)', () => {
      node['_layoutGenerated'] = true;
      node.richText = false;
      expect(node['_layoutGenerated']).toBe(true);
    });

    it('setter does not mark layout as stale when value is unchanged (true → true)', () => {
      node.richText = true;
      node['_layoutGenerated'] = true;
      node.richText = true;
      expect(node['_layoutGenerated']).toBe(true);
    });
  });
});
