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

/**
 * Regression tests for PR #915 (fix for the PR #857 regression where MSDF
 * text would permanently disappear).
 *
 * `Stage.buildRenderList` excludes children with `worldAlpha === 0` from the
 * cached render list, but `CoreNode.update()` recomputed `worldAlpha` without
 * ever calling `Stage.requestRenderListUpdate()`. A node that was at alpha 0
 * when the list was (re)built — e.g. text faded in via an entrance animation
 * — stayed excluded forever once its alpha became non-zero, because nothing
 * marked the list dirty.
 *
 * SDF text is hit hardest: `CoreTextNode.updateIsRenderable()` reports
 * renderable unconditionally once a layout exists, so unlike images/rects no
 * `setRenderable` transition ever re-dirties the list on the alpha path.
 * The fix invalidates the list on `worldAlpha` zero-crossings only, so plain
 * fade animations don't pay for a rebuild every frame.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CoreNode, UpdateType } from './CoreNode.js';
import { CoreTextNode } from './CoreTextNode.js';
import type { Stage } from './Stage.js';
import type { TextRenderer } from './text-rendering/TextRenderer.js';
import {
  makeMockStage,
  makeNodeProps,
  makeTextProps,
} from '../../test/mockStage.js';

describe('CoreNode worldAlpha zero-crossing render list invalidation', () => {
  let stage: Stage;
  let requestRenderListUpdate: ReturnType<typeof vi.fn>;

  const clippingRect = {
    x: 0,
    y: 0,
    w: 200,
    h: 200,
    valid: false,
    clipRadius: 0,
  };

  beforeEach(() => {
    stage = makeMockStage();
    requestRenderListUpdate = vi.mocked(stage.requestRenderListUpdate);
  });

  /**
   * Build a node with a clean update slate so only the flags set by the
   * test itself are processed (the constructor leaves UpdateType.All set).
   */
  function makeIdleNode(alpha: number, worldAlpha: number): CoreNode {
    const node = new CoreNode(stage, makeNodeProps({ alpha }));
    node.updateType = 0;
    node.childUpdateType = 0;
    node.worldAlpha = worldAlpha;
    requestRenderListUpdate.mockClear();
    return node;
  }

  function updateWorldAlpha(node: CoreNode, alpha: number): void {
    node.props.alpha = alpha;
    node.setUpdateType(UpdateType.WorldAlpha);
    node.update(0, clippingRect);
  }

  it('invalidates when fading from visible to zero (1 -> 0)', () => {
    const node = makeIdleNode(1, 1);

    updateWorldAlpha(node, 0);

    expect(node.worldAlpha).toBe(0);
    expect(requestRenderListUpdate).toHaveBeenCalledTimes(1);
  });

  it('invalidates when fading in from zero (0 -> 1)', () => {
    const node = makeIdleNode(0, 0);

    updateWorldAlpha(node, 1);

    expect(node.worldAlpha).toBe(1);
    expect(requestRenderListUpdate).toHaveBeenCalledTimes(1);
  });

  it('does not invalidate on non-zero alpha deltas (0.5 -> 0.8)', () => {
    const node = makeIdleNode(0.5, 0.5);

    updateWorldAlpha(node, 0.8);

    expect(node.worldAlpha).toBeCloseTo(0.8);
    expect(requestRenderListUpdate).not.toHaveBeenCalled();
  });

  it('does not invalidate when staying at zero (0 -> 0)', () => {
    const node = makeIdleNode(0, 0);

    updateWorldAlpha(node, 0);

    expect(node.worldAlpha).toBe(0);
    expect(requestRenderListUpdate).not.toHaveBeenCalled();
  });

  it('detects the crossing on children when an ancestor fades in', () => {
    const parent = new CoreNode(stage, makeNodeProps({ alpha: 0 }));
    const child = new CoreNode(stage, makeNodeProps({ alpha: 1 }));
    // Wire both directions: props.parent for alpha inheritance lookups and
    // the children array so parent.update() actually visits the child.
    child.props.parent = parent;
    parent.addChild(child);

    for (const node of [parent, child]) {
      node.updateType = 0;
      node.childUpdateType = 0;
      node.worldAlpha = 0;
    }
    requestRenderListUpdate.mockClear();

    parent.props.alpha = 1;
    parent.setUpdateType(UpdateType.WorldAlpha);
    parent.update(0, clippingRect);

    // Both the parent and the child cross zero, so the list is invalidated.
    expect(parent.worldAlpha).toBe(1);
    expect(child.worldAlpha).toBe(1);
    expect(requestRenderListUpdate).toHaveBeenCalledTimes(2);
  });
});

describe('SDF text alpha fade regression (PR #915)', () => {
  let stage: Stage;
  let requestRenderListUpdate: ReturnType<typeof vi.fn>;
  let mockTextRenderer: TextRenderer;

  const clippingRect = {
    x: 0,
    y: 0,
    w: 200,
    h: 200,
    valid: true,
    clipRadius: 0,
  };

  function createSdfRenderInfo() {
    return {
      type: 'sdf' as const,
      width: 100,
      height: 20,
      atlasTexture: {} as never,
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

  beforeEach(() => {
    stage = makeMockStage();
    requestRenderListUpdate = vi.mocked(stage.requestRenderListUpdate);
    mockTextRenderer = {
      type: 'sdf',
      font: {
        isFontLoaded: vi.fn().mockReturnValue(true),
        waitingForFont: vi.fn(),
        stopWaitingForFont: vi.fn(),
      },
      renderText: vi.fn(),
      addQuads: vi.fn().mockReturnValue(new Float32Array(0)),
      renderQuads: vi.fn(),
    } as unknown as TextRenderer;
  });

  it('SDF updateIsRenderable never flips on worldAlpha changes (the hole #915 closes)', () => {
    const node = new CoreTextNode(stage, makeTextProps(), mockTextRenderer);
    (node as unknown as { _renderInfo: unknown })._renderInfo =
      createSdfRenderInfo();
    node.isRenderable = true;
    node.worldAlpha = 0;

    // Pre-fix this produced no setRenderable transition and therefore no
    // render list rebuild — the node stayed excluded forever. The SDF
    // override intentionally ignores alpha here; invalidation now comes from
    // the WorldAlpha branch of update() instead.
    node.updateIsRenderable();

    expect(node.isRenderable).toBe(true);
    expect(requestRenderListUpdate).not.toHaveBeenCalled();
  });

  it('fading SDF text in from zero invalidates the render list', () => {
    const node = new CoreTextNode(stage, makeTextProps(), mockTextRenderer);
    (node as unknown as { _renderInfo: unknown })._renderInfo =
      createSdfRenderInfo();
    node.isRenderable = true;
    node.updateType = 0;
    node.childUpdateType = 0;
    node.worldAlpha = 0;
    requestRenderListUpdate.mockClear();

    node.props.alpha = 1;
    node.setUpdateType(UpdateType.WorldAlpha);
    node.update(0, clippingRect);

    expect(node.worldAlpha).toBe(1);
    // Exactly one invalidation (the zero-crossing): updateIsRenderable keeps
    // reporting renderable, so it must not add a second one.
    expect(requestRenderListUpdate).toHaveBeenCalledTimes(1);
  });
});
