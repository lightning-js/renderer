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
 * Tests for the engine-side SDF text batch sort.
 *
 * buildRenderList defers main-pass SDF text into `renderListSdfTextNodes`
 * (instead of the regular op sequence) and sorts it by batch key so each
 * (layout, atlas, clip) group is one contiguous buffer range. The methods are
 * exercised on a minimal fake `this` via the Stage prototype, mirroring the
 * WebGlRenderer test style: the real production code runs, only the node tree
 * and renderer are stubs.
 */
import { describe, expect, it, vi } from 'vitest';
import { Stage } from './Stage.js';
import { CoreNodeRenderState, type CoreNode } from './CoreNode.js';
import {
  compareSdfBatchKeys,
  type RectWithValid,
  type SdfBatchKey,
} from './lib/utils.js';

const NO_CLIP: RectWithValid = {
  x: 0,
  y: 0,
  w: 0,
  h: 0,
  valid: false,
  clipRadius: 0,
};
const CLIP_A: RectWithValid = {
  x: 10,
  y: 20,
  w: 300,
  h: 100,
  valid: true,
  clipRadius: 0,
};
const CLIP_B: RectWithValid = {
  x: 10,
  y: 20,
  w: 300,
  h: 100,
  valid: true,
  clipRadius: 8,
};

interface FakeNode {
  props: { clipping: boolean; clipRadius: number };
  isRenderable: boolean;
  worldAlpha: number;
  renderState: CoreNodeRenderState;
  children: FakeNode[];
  key: SdfBatchKey | null;
  renderQuads: ReturnType<typeof vi.fn>;
  getSdfBatchKey(): SdfBatchKey | null;
}

const makeNode = (
  key: SdfBatchKey | null,
  overrides: Partial<FakeNode> = {},
  callOrder?: FakeNode[],
): FakeNode => {
  const node: FakeNode = {
    props: { clipping: false, clipRadius: 0 },
    isRenderable: true,
    worldAlpha: 1,
    renderState: CoreNodeRenderState.InBounds,
    children: [],
    key,
    renderQuads: vi.fn(),
    getSdfBatchKey() {
      return this.key;
    },
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
  makeNode(null, { isRenderable: false, children });

const textKey = (
  richText: boolean,
  fontFamily: string,
  clippingRect: RectWithValid = NO_CLIP,
): SdfBatchKey => ({ richText, fontFamily, clippingRect });

interface StageStub {
  renderer: {
    beginRoundedClip: ReturnType<typeof vi.fn>;
    endRoundedClip: ReturnType<typeof vi.fn>;
  };
  renderListNodes: CoreNode[];
  renderListOps: Uint8Array;
  renderListLen: number;
  renderListSdfTextNodes: CoreNode[];
  // Private Stage methods exercised via the prototype (cast through `any`).
  buildRenderList(node: CoreNode, cache?: boolean): void;
  sortRenderListSdfTextNodes(): void;
  writeRenderListSdfText(): void;
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
  stub.renderListSdfTextNodes = [];
  return stub;
};

describe('compareSdfBatchKeys', () => {
  it('orders plain before rich', () => {
    const plain = textKey(false, 'Arial');
    const rich = textKey(true, 'Arial');
    expect(compareSdfBatchKeys(plain, rich)).toBeLessThan(0);
    expect(compareSdfBatchKeys(rich, plain)).toBeGreaterThan(0);
  });

  it('groups by font family within the same layout', () => {
    const plainArial = textKey(false, 'Arial');
    const plainUbuntu = textKey(false, 'Ubuntu');
    expect(compareSdfBatchKeys(plainArial, plainUbuntu)).toBeLessThan(0);
  });

  it('groups by clipping rect within the same layout and family', () => {
    const a = textKey(false, 'Arial', CLIP_A);
    const b = textKey(false, 'Arial', CLIP_B);
    expect(compareSdfBatchKeys(a, b)).toBeLessThan(0);
  });

  it('returns 0 for equal keys (stable-sort keeps scene order)', () => {
    const a = textKey(true, 'Ubuntu', CLIP_A);
    const b = textKey(true, 'Ubuntu', CLIP_A);
    expect(compareSdfBatchKeys(a, b)).toBe(0);
  });
});

describe('buildRenderList — SDF text sorting', () => {
  it('defers main-pass SDF text into the sorted list, sorted by batch key', () => {
    const stub = makeStageStub();

    const p1 = makeNode(textKey(false, 'Ubuntu'));
    const r1 = makeNode(textKey(true, 'Ubuntu'));
    const p2 = makeNode(textKey(false, 'NotoSans'));
    const r2 = makeNode(textKey(true, 'NotoSans'));
    // Interleave creation order — the worst case for the renderer batching.
    const root = makeRoot([p1, r1, p2, r2]);

    // Collection during the traversal keeps scene order; the sort groups them.
    stub.buildRenderList(root as unknown as CoreNode);
    stub.sortRenderListSdfTextNodes();

    // Sorted order: plain first, then rich, grouped by family (alphabetical,
    // so NotoSans before Ubuntu).
    expect(stub.renderListSdfTextNodes).toEqual([p2, p1, r2, r1]);
    // Deferred text is NOT part of the regular op sequence.
    expect(stub.renderListNodes).toEqual([]);
    expect(stub.renderListLen).toBe(0);
    // Deferred text is not written during the traversal.
    expect(p1.renderQuads).not.toHaveBeenCalled();
  });

  it('writes the sorted text list in batch-key order', () => {
    const stub = makeStageStub();
    const callOrder: FakeNode[] = [];

    const p1 = makeNode(textKey(false, 'Ubuntu'), {}, callOrder);
    const r1 = makeNode(textKey(true, 'Ubuntu'), {}, callOrder);
    const p2 = makeNode(textKey(false, 'NotoSans'), {}, callOrder);
    const r2 = makeNode(textKey(true, 'NotoSans'), {}, callOrder);
    const root = makeRoot([p1, r1, p2, r2]);

    stub.buildRenderList(root as unknown as CoreNode);
    stub.sortRenderListSdfTextNodes();
    stub.writeRenderListSdfText();

    // Emission order = sorted batch order: all plain, then all rich (family
    // alphabetical: NotoSans before Ubuntu).
    expect(callOrder).toEqual([p2, p1, r2, r1]);
    for (const node of [p1, p2, r1, r2]) {
      expect(node.renderQuads).toHaveBeenCalledTimes(1);
      expect(node.renderQuads).toHaveBeenCalledWith(stub.renderer);
    }
  });

  it('keeps non-SDF renderable nodes inline in the regular op sequence', () => {
    const stub = makeStageStub();

    const image = makeNode(null);
    const text = makeNode(textKey(false, 'Ubuntu'));
    const root = makeRoot([image, text]);

    stub.buildRenderList(root as unknown as CoreNode);

    expect(stub.renderListNodes).toEqual([image]);
    expect(stub.renderListOps[0]).toBe(0);
    expect(image.renderQuads).toHaveBeenCalledTimes(1);
    expect(stub.renderListSdfTextNodes).toEqual([text]);
  });

  it('records rounded clip begin/end ops for clipping nodes', () => {
    const stub = makeStageStub();

    const clipped = makeNode(textKey(false, 'Ubuntu'), {
      props: { clipping: true, clipRadius: 8 },
    });
    const root = makeRoot([clipped]);

    stub.buildRenderList(root as unknown as CoreNode);

    // The clip node is recorded once per begin/end op even though its quads
    // are deferred into the sorted text list.
    expect(stub.renderListNodes).toEqual([clipped, clipped]);
    expect(stub.renderListOps[0]).toBe(1); // beginRoundedClip
    expect(stub.renderListOps[1]).toBe(2); // endRoundedClip
    expect(stub.renderer.beginRoundedClip).toHaveBeenCalledWith(clipped);
    expect(stub.renderer.endRoundedClip).toHaveBeenCalledWith(clipped);
    expect(stub.renderListSdfTextNodes).toEqual([clipped]);
  });

  it('keeps RTT-pass text inline and out of the sorted list', () => {
    const stub = makeStageStub();

    const rttText = makeNode(textKey(false, 'Ubuntu'));
    const root = makeRoot([rttText]);

    // addSubtreeQuads → buildRenderList(node, false): no caching, no deferral.
    stub.addSubtreeQuads(root as unknown as CoreNode);

    expect(stub.renderListSdfTextNodes).toEqual([]);
    expect(rttText.renderQuads).toHaveBeenCalledTimes(1);
    expect(stub.renderListLen).toBe(0);
  });

  it('skips invisible and out-of-bounds children', () => {
    const stub = makeStageStub();

    const hidden = makeNode(textKey(false, 'Ubuntu'), { worldAlpha: 0 });
    const offscreen = makeNode(textKey(true, 'Ubuntu'), {
      renderState: CoreNodeRenderState.OutOfBounds,
    });
    const visible = makeNode(textKey(false, 'Ubuntu'));
    const root = makeRoot([hidden, offscreen, visible]);

    stub.buildRenderList(root as unknown as CoreNode);

    expect(stub.renderListSdfTextNodes).toEqual([visible]);
  });

  it('keeps scene order within equal batch keys (stable sort)', () => {
    const stub = makeStageStub();

    const first = makeNode(textKey(true, 'Ubuntu', CLIP_A));
    const second = makeNode(textKey(true, 'Ubuntu', CLIP_A));
    const other = makeNode(textKey(false, 'NotoSans'));
    const root = makeRoot([other, first, second]);

    stub.buildRenderList(root as unknown as CoreNode);
    stub.sortRenderListSdfTextNodes();

    // Same key, same clip: relative order preserved.
    expect(stub.renderListSdfTextNodes).toEqual([other, first, second]);
  });

  it('reuses the cached sorted list on clean frames (no rebuild)', () => {
    const stub = makeStageStub();

    const p = makeNode(textKey(false, 'Ubuntu'));
    const r = makeNode(textKey(true, 'NotoSans'));
    const root = makeRoot([p, r]);

    stub.buildRenderList(root as unknown as CoreNode);
    stub.sortRenderListSdfTextNodes();

    // A second frame with no structural change does not re-traverse; the
    // write pass simply replays the same (already sorted) cached array.
    stub.writeRenderListSdfText();

    expect(p.renderQuads).toHaveBeenCalledTimes(1);
    expect(r.renderQuads).toHaveBeenCalledTimes(1);
    expect(stub.renderListSdfTextNodes).toEqual([p, r]);
  });
});
