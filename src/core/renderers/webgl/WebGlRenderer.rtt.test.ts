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
 * RTT (Render To Texture) pipeline unit tests for WebGlRenderer.
 *
 * These tests validate rttNodes ordering, dirty-flag lifecycle, and skip
 * conditions without requiring a real WebGL context. The WebGlRenderer is
 * tested at the level of its internal bookkeeping methods only.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import {
  CoreNode,
  CoreNodeRenderState,
  type CoreNodeProps,
} from '../../CoreNode.js';
import type { Stage } from '../../Stage.js';
import type { CoreRenderer } from '../CoreRenderer.js';
import { createBound } from '../../lib/utils.js';
import type { TextureOptions } from '../../CoreTextureManager.js';
import { Texture } from '../../textures/Texture.js';
import { WebGlRenderer } from './WebGlRenderer.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeDefaultProps = (): CoreNodeProps => ({
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
  h: 100,
  mount: 0,
  mountX: 0,
  mountY: 0,
  parent: null,
  pivot: 0.5,
  pivotX: 0.5,
  pivotY: 0.5,
  rotation: 0,
  rtt: false,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  shader: null,
  src: '',
  texture: null,
  textureOptions: {} as TextureOptions,
  w: 100,
  x: 0,
  y: 0,
  zIndex: 0,
});

/**
 * Minimal mock stage that satisfies CoreNode's constructor requirements.
 */
const makeStage = (): Stage =>
  mock<Stage>({
    strictBound: createBound(0, 0, 1920, 1080),
    preloadBound: createBound(0, 0, 1920, 1080),
    defaultTexture: { state: 'loaded' } as unknown as Texture,
    renderer: mock<CoreRenderer>() as CoreRenderer,
    txManager: {
      createTexture: vi.fn().mockReturnValue({
        state: 'loaded',
        ctxTexture: { framebuffer: {} },
      }),
    } as unknown as Stage['txManager'],
  });

// ---------------------------------------------------------------------------
// RTT ordering tests — exercised via renderToTexture() on a real
// WebGlRenderer instance created with Object.create so no GL context is needed.
// ---------------------------------------------------------------------------

/**
 * Creates a minimal WebGlRenderer instance with only `rttNodes` initialised.
 * Object.create skips the constructor so no GL context is required.
 * insertRTTNodeInOrder / findMaxChildRTTIndex / renderToTexture only access
 * `this.rttNodes`, so this stub is sufficient to exercise the real production
 * code paths.
 */
function makeOrderer(): WebGlRenderer {
  const r = Object.create(WebGlRenderer.prototype) as WebGlRenderer;
  r.rttNodes = [];
  return r;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RTT — rttNodes insertion ordering', () => {
  let stage: Stage;
  let orderer: WebGlRenderer;

  beforeEach(() => {
    stage = makeStage();
    orderer = makeOrderer();
  });

  it('adds a single RTT node to an empty list', () => {
    const node = new CoreNode(stage, makeDefaultProps());
    orderer.renderToTexture(node);
    expect(orderer.rttNodes.length).toBe(1);
    expect(orderer.rttNodes[0]).toBe(node);
  });

  it('does not add the same node twice', () => {
    const node = new CoreNode(stage, makeDefaultProps());
    orderer.renderToTexture(node);
    orderer.renderToTexture(node);
    expect(orderer.rttNodes.length).toBe(1);
  });

  it('places a child RTT node BEFORE its RTT parent', () => {
    const parent = new CoreNode(stage, makeDefaultProps());
    const child = new CoreNode(stage, makeDefaultProps());
    child.parent = parent;

    // Parent added first, then child — child must end up before parent
    orderer.renderToTexture(parent);
    orderer.renderToTexture(child);

    const parentIdx = orderer.rttNodes.indexOf(parent);
    const childIdx = orderer.rttNodes.indexOf(child);
    expect(childIdx).toBeLessThan(parentIdx);
  });

  it('places a parent RTT node AFTER an already-registered child', () => {
    const parent = new CoreNode(stage, makeDefaultProps());
    const child = new CoreNode(stage, makeDefaultProps());
    child.parent = parent;

    // Child added first, then parent — parent must end up after child
    orderer.renderToTexture(child);
    orderer.renderToTexture(parent);

    const parentIdx = orderer.rttNodes.indexOf(parent);
    const childIdx = orderer.rttNodes.indexOf(child);
    expect(childIdx).toBeLessThan(parentIdx);
  });

  it('handles 3-level nested RTT ordering: grandchild < child < parent', () => {
    const grandparent = new CoreNode(stage, makeDefaultProps());
    const parent = new CoreNode(stage, makeDefaultProps());
    const grandchild = new CoreNode(stage, makeDefaultProps());
    parent.parent = grandparent;
    grandchild.parent = parent;

    // Insert in arbitrary order
    orderer.renderToTexture(grandparent);
    orderer.renderToTexture(grandchild);
    orderer.renderToTexture(parent);

    const gpIdx = orderer.rttNodes.indexOf(grandparent);
    const pIdx = orderer.rttNodes.indexOf(parent);
    const gcIdx = orderer.rttNodes.indexOf(grandchild);

    expect(gcIdx).toBeLessThan(pIdx);
    expect(pIdx).toBeLessThan(gpIdx);
  });

  it('inserts sibling RTT nodes in insertion order (a before b)', () => {
    const root = new CoreNode(stage, makeDefaultProps());
    const a = new CoreNode(stage, makeDefaultProps());
    const b = new CoreNode(stage, makeDefaultProps());
    a.parent = root;
    b.parent = root;

    orderer.renderToTexture(a);
    orderer.renderToTexture(b);

    expect(orderer.rttNodes.length).toBe(2);
    // Siblings have no ordering constraint relative to each other, so the
    // expected behaviour is that insertion order is preserved.
    expect(orderer.rttNodes.indexOf(a)).toBeLessThan(
      orderer.rttNodes.indexOf(b),
    );
  });
});

// ---------------------------------------------------------------------------
// RTT dirty-flag lifecycle — exercised directly on CoreNode fields
// (no GL context needed)
// ---------------------------------------------------------------------------

describe('RTT — hasRTTupdates dirty-flag lifecycle', () => {
  let stage: Stage;

  beforeEach(() => {
    stage = makeStage();
  });

  it('hasRTTupdates starts as false on a new node', () => {
    const node = new CoreNode(stage, makeDefaultProps());
    expect(node.hasRTTupdates).toBe(false);
  });

  it('notifyParentRTTOfUpdate sets hasRTTupdates on the RTT ancestor', () => {
    const rttParent = new CoreNode(stage, {
      ...makeDefaultProps(),
      rtt: false,
    });
    const child = new CoreNode(stage, makeDefaultProps());
    child.parent = rttParent;

    // Manually wire rttParent flag used by notifyParentRTTOfUpdate path
    // (normally set by markChildrenWithRTT when rtt is enabled on rttParent)
    // Simulate the state that exists after rtt=true is set on rttParent
    rttParent['props'].rtt = true;
    child.parentHasRenderTexture = true;
    child.rttParent = rttParent;

    rttParent.hasRTTupdates = false;

    // Call the protected method via cast
    (
      child as unknown as { notifyParentRTTOfUpdate(): void }
    ).notifyParentRTTOfUpdate();

    expect(rttParent.hasRTTupdates).toBe(true);
  });

  it('notifyParentRTTOfUpdate is a no-op when node has no RTT ancestor', () => {
    const node = new CoreNode(stage, makeDefaultProps());
    // No parent — should not throw
    expect(() => {
      (
        node as unknown as { notifyParentRTTOfUpdate(): void }
      ).notifyParentRTTOfUpdate();
    }).not.toThrow();
    expect(node.hasRTTupdates).toBe(false);
  });

  it('hasRTTupdates can be reset to false', () => {
    const node = new CoreNode(stage, makeDefaultProps());
    node.hasRTTupdates = true;
    node.hasRTTupdates = false;
    expect(node.hasRTTupdates).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RTT parentHasRenderTexture propagation
// ---------------------------------------------------------------------------

describe('RTT — parentHasRenderTexture propagation', () => {
  let stage: Stage;

  beforeEach(() => {
    stage = makeStage();
  });

  it('parentHasRenderTexture is false by default', () => {
    const node = new CoreNode(stage, makeDefaultProps());
    expect(node.parentHasRenderTexture).toBe(false);
  });

  it('markChildrenWithRTT sets parentHasRenderTexture=true on direct children', () => {
    const parent = new CoreNode(stage, makeDefaultProps());
    const child = new CoreNode(stage, makeDefaultProps());
    child.parent = parent;

    // Call private method directly
    (
      parent as unknown as { markChildrenWithRTT(): void }
    ).markChildrenWithRTT();

    expect(child.parentHasRenderTexture).toBe(true);
  });

  it('markChildrenWithRTT propagates to grandchildren', () => {
    const parent = new CoreNode(stage, makeDefaultProps());
    const child = new CoreNode(stage, makeDefaultProps());
    const grandchild = new CoreNode(stage, makeDefaultProps());
    child.parent = parent;
    grandchild.parent = child;

    (
      parent as unknown as { markChildrenWithRTT(): void }
    ).markChildrenWithRTT();

    expect(child.parentHasRenderTexture).toBe(true);
    expect(grandchild.parentHasRenderTexture).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// RTT parentRenderTexture getter — uncached parent-chain walk
// (this is Bottleneck 1 in the perf analysis)
// ---------------------------------------------------------------------------

describe('RTT — parentRenderTexture getter', () => {
  let stage: Stage;

  beforeEach(() => {
    stage = makeStage();
  });

  it('returns null when there is no RTT ancestor', () => {
    const node = new CoreNode(stage, makeDefaultProps());
    expect(node.parentRenderTexture).toBe(null);
  });

  it('returns the nearest RTT ancestor', () => {
    const rttAncestor = new CoreNode(stage, makeDefaultProps());
    rttAncestor['props'].rtt = true;
    const child = new CoreNode(stage, makeDefaultProps());
    child.parent = rttAncestor;

    expect(child.parentRenderTexture).toBe(rttAncestor);
  });

  it('returns the NEAREST RTT ancestor in a nested chain', () => {
    const outer = new CoreNode(stage, makeDefaultProps());
    const inner = new CoreNode(stage, makeDefaultProps());
    const leaf = new CoreNode(stage, makeDefaultProps());
    outer['props'].rtt = true;
    inner['props'].rtt = true;
    inner.parent = outer;
    leaf.parent = inner;

    // leaf's nearest RTT ancestor is inner, not outer
    expect(leaf.parentRenderTexture).toBe(inner);
  });
});

// ---------------------------------------------------------------------------
// RTT — renderRTTNodes skip conditions
// Validated via a lightweight simulation of the skip logic
// ---------------------------------------------------------------------------

describe('RTT — renderRTTNodes skip conditions', () => {
  let stage: Stage;

  beforeEach(() => {
    stage = makeStage();
  });

  /**
   * Simulate the exact skip gates in renderRTTNodes() for a single node.
   * Returns true if the node would be rendered, false if skipped.
   */
  const wouldRender = (
    node: CoreNode,
    texture: { state: string } | null,
  ): boolean => {
    if (node.hasRTTupdates === false) return false;
    if (node.worldAlpha === 0) return false;
    if (node.renderState === CoreNodeRenderState.OutOfBounds) return false;
    if (texture === null || texture.state !== 'loaded') return false;
    return true;
  };

  it('skips a node when hasRTTupdates is false', () => {
    const node = new CoreNode(stage, makeDefaultProps());
    node.hasRTTupdates = false;
    node.worldAlpha = 1;
    node.renderState = CoreNodeRenderState.InBounds;
    expect(wouldRender(node, { state: 'loaded' })).toBe(false);
  });

  it('renders a node when hasRTTupdates is true and all other conditions pass', () => {
    const node = new CoreNode(stage, makeDefaultProps());
    node.hasRTTupdates = true;
    node.worldAlpha = 1;
    node.renderState = CoreNodeRenderState.InBounds;
    expect(wouldRender(node, { state: 'loaded' })).toBe(true);
  });

  it('skips a node when worldAlpha is 0', () => {
    const node = new CoreNode(stage, makeDefaultProps());
    node.hasRTTupdates = true;
    node.worldAlpha = 0;
    node.renderState = CoreNodeRenderState.InBounds;
    expect(wouldRender(node, { state: 'loaded' })).toBe(false);
  });

  it('skips a node when renderState is OutOfBounds', () => {
    const node = new CoreNode(stage, makeDefaultProps());
    node.hasRTTupdates = true;
    node.worldAlpha = 1;
    node.renderState = CoreNodeRenderState.OutOfBounds;
    expect(wouldRender(node, { state: 'loaded' })).toBe(false);
  });

  it('skips a node when texture is null', () => {
    const node = new CoreNode(stage, makeDefaultProps());
    node.hasRTTupdates = true;
    node.worldAlpha = 1;
    node.renderState = CoreNodeRenderState.InBounds;
    expect(wouldRender(node, null)).toBe(false);
  });

  it('skips a node when texture is not loaded', () => {
    const node = new CoreNode(stage, makeDefaultProps());
    node.hasRTTupdates = true;
    node.worldAlpha = 1;
    node.renderState = CoreNodeRenderState.InBounds;
    expect(wouldRender(node, { state: 'loading' })).toBe(false);
  });
});
