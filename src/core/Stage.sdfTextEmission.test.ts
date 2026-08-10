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
 * Tests for main-pass SDF text emission in the Stage render list.
 *
 * buildRenderList writes every renderable node — images and SDF text alike —
 * inline during the pre-order traversal, so the renderer's op sequence
 * preserves the scene's z-order. A higher-z quad is emitted after lower-z SDF
 * text and therefore draws on top of it. Text batching is the renderer's job
 * (consecutive same-key writes merge); the Stage never reorders or defers
 * text. The methods are exercised on a minimal fake `this` via the Stage
 * prototype, mirroring the WebGlRenderer test style: the real production code
 * runs, only the node tree and renderer are stubs.
 */
import { describe, expect, it, vi } from 'vitest';
import { Stage } from './Stage.js';
import { CoreNodeRenderState, type CoreNode } from './CoreNode.js';

interface FakeNode {
  props: { clipping: boolean; clipRadius: number };
  isRenderable: boolean;
  worldAlpha: number;
  renderState: CoreNodeRenderState;
  children: FakeNode[];
  renderQuads: ReturnType<typeof vi.fn>;
}

const makeNode = (
  overrides: Partial<FakeNode> = {},
  callOrder?: FakeNode[],
): FakeNode => {
  const node: FakeNode = {
    props: { clipping: false, clipRadius: 0 },
    isRenderable: true,
    worldAlpha: 1,
    renderState: CoreNodeRenderState.InBounds,
    children: [],
    renderQuads: vi.fn(),
  };
  Object.assign(node, overrides);
  if (callOrder !== undefined) {
    node.renderQuads.mockImplementation(() => {
      callOrder.push(node);
    });
  }
  return node;
};

/** A non-renderable container so the traversal only visits its children. */
const makeRoot = (children: FakeNode[]): FakeNode =>
  makeNode({ isRenderable: false, children });

interface StageStub {
  renderer: {
    beginRoundedClip: ReturnType<typeof vi.fn>;
    endRoundedClip: ReturnType<typeof vi.fn>;
  };
  renderListNodes: CoreNode[];
  renderListOps: Uint8Array;
  renderListLen: number;
  // Private Stage methods exercised via the prototype (cast through `any`).
  buildRenderList(node: CoreNode, cache?: boolean): void;
  addSubtreeQuads(node: CoreNode): void;
}

const makeStageStub = (): StageStub => {
  const stub = Object.create(Stage.prototype) as unknown as StageStub;
  stub.renderer = {
    beginRoundedClip: vi.fn(),
    endRoundedClip: vi.fn(),
  };
  stub.renderListNodes = [];
  stub.renderListOps = new Uint8Array(256);
  stub.renderListLen = 0;
  return stub;
};

describe('buildRenderList — SDF text z-order', () => {
  it('writes SDF text inline in scene order, interleaved with quads', () => {
    const stub = makeStageStub();
    const callOrder: FakeNode[] = [];

    // Scene order = z-order: text, quad, text, quad. Both text nodes write at
    // their scene position so the quad between them draws on top of the first
    // text and under the second.
    const t1 = makeNode({}, callOrder);
    const q1 = makeNode({}, callOrder);
    const t2 = makeNode({}, callOrder);
    const q2 = makeNode({}, callOrder);
    const root = makeRoot([t1, q1, t2, q2]);

    stub.buildRenderList(root as unknown as CoreNode);

    expect(callOrder).toEqual([t1, q1, t2, q2]);
    // Every renderable node is part of the regular op sequence.
    expect(stub.renderListNodes).toEqual([t1, q1, t2, q2]);
    for (let i = 0; i < 4; i++) {
      expect(stub.renderListOps[i]).toBe(0);
    }
    for (const node of [t1, q1, t2, q2]) {
      expect(node.renderQuads).toHaveBeenCalledTimes(1);
      expect(node.renderQuads).toHaveBeenCalledWith(stub.renderer);
    }
  });

  it('records rounded clip begin/end ops around the clipped text node', () => {
    const stub = makeStageStub();

    const clipped = makeNode({
      props: { clipping: true, clipRadius: 8 },
    });
    const root = makeRoot([clipped]);

    stub.buildRenderList(root as unknown as CoreNode);

    expect(stub.renderListNodes).toEqual([clipped, clipped, clipped]);
    expect(stub.renderListOps[0]).toBe(1); // beginRoundedClip
    expect(stub.renderListOps[1]).toBe(0); // renderQuads
    expect(stub.renderListOps[2]).toBe(2); // endRoundedClip
    expect(stub.renderer.beginRoundedClip).toHaveBeenCalledWith(clipped);
    expect(stub.renderer.endRoundedClip).toHaveBeenCalledWith(clipped);
    expect(clipped.renderQuads).toHaveBeenCalledTimes(1);
  });

  it('writes RTT-pass text inline and in scene order', () => {
    const stub = makeStageStub();

    const text = makeNode();
    const quad = makeNode();
    const root = makeRoot([text, quad]);

    // addSubtreeQuads → buildRenderList(node, false): no caching, but the
    // traversal still writes nodes inline so text cannot float above quads
    // inside a render-to-texture subtree.
    stub.addSubtreeQuads(root as unknown as CoreNode);

    expect(text.renderQuads).toHaveBeenCalledTimes(1);
    expect(quad.renderQuads).toHaveBeenCalledTimes(1);
    expect(stub.renderListLen).toBe(0);
  });

  it('skips invisible and out-of-bounds children', () => {
    const stub = makeStageStub();

    const hidden = makeNode({ worldAlpha: 0 });
    const offscreen = makeNode({
      renderState: CoreNodeRenderState.OutOfBounds,
    });
    const visible = makeNode();
    const root = makeRoot([hidden, offscreen, visible]);

    stub.buildRenderList(root as unknown as CoreNode);

    expect(hidden.renderQuads).not.toHaveBeenCalled();
    expect(offscreen.renderQuads).not.toHaveBeenCalled();
    expect(visible.renderQuads).toHaveBeenCalledTimes(1);
    expect(stub.renderListNodes).toEqual([visible]);
  });
});
