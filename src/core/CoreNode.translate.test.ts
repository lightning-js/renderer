/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2026 Comcast Cable Communications, LLC.
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
 * Tests for the translation-only update path (UpdateType.Translate):
 * x/y-only changes must produce exactly the same transforms, render coords
 * and bounds as the general local-update path — including stable nonzero
 * mounts and transformed parents — while taking the narrower code path.
 */
import { describe, expect, it } from 'vitest';
import { CoreNode, CoreNodeRenderState, UpdateType } from './CoreNode.js';
import type { Matrix3d } from './lib/Matrix3d.js';
import type { Stage } from './Stage.js';
import { makeMockStage, makeNodeProps } from '../../test/mockStage.js';

const clippingRect = {
  x: 0,
  y: 0,
  w: 2000,
  h: 2000,
  valid: false,
  clipRadius: 0,
};

const makeStage = (): Stage => makeMockStage({}, { width: 2000, height: 2000 });

const matrixFields = (m: Matrix3d | undefined) =>
  m === undefined ? undefined : [m.ta, m.tb, m.tx, m.tc, m.td, m.ty];

const expectSameTransform = (fast: CoreNode, reference: CoreNode): void => {
  expect(matrixFields(fast.localTransform)).toEqual(
    matrixFields(reference.localTransform),
  );
  expect(matrixFields(fast.globalTransform)).toEqual(
    matrixFields(reference.globalTransform),
  );
  expect({ ...fast.renderCoords }).toEqual({ ...reference.renderCoords });
  expect({ ...fast.renderBound }).toEqual({ ...reference.renderBound });
};

describe('CoreNode translation-only updates', () => {
  it('x/y setters request UpdateType.Translate, not Local', () => {
    const stage = makeStage();
    const node = new CoreNode(stage, makeNodeProps({ w: 10, h: 10 }));
    node.update(0, clippingRect); // flush initial update
    expect(node.updateType).toBe(UpdateType.None);

    node.x = 5;
    expect(node.updateType & UpdateType.Translate).toBe(UpdateType.Translate);
    expect(node.updateType & UpdateType.Local).toBe(0);

    node.update(0, clippingRect);
    node.y = 7;
    expect(node.updateType & UpdateType.Translate).toBe(UpdateType.Translate);
    expect(node.updateType & UpdateType.Local).toBe(0);
  });

  it('x/y-only motion matches the general path exactly', () => {
    const stage = makeStage();
    const root = new CoreNode(stage, makeNodeProps({ w: 500, h: 500 }));
    const fast = new CoreNode(
      stage,
      makeNodeProps({ parent: root, w: 40, h: 30, x: 10, y: 20 }),
    );
    const ref = new CoreNode(
      stage,
      makeNodeProps({ parent: root, w: 40, h: 30, x: 10, y: 20 }),
    );
    root.update(0, clippingRect);

    fast.x = 111;
    fast.y = 222;
    // Reference goes through the general local path.
    ref.props.x = 111;
    ref.props.y = 222;
    ref.setUpdateType(UpdateType.Local);

    root.update(1, clippingRect);
    expectSameTransform(fast, ref);
    expect(fast.renderCoords!.x1).toBe(111);
    expect(fast.renderCoords!.y1).toBe(222);
    expect(fast.globalTransform!.tx).toBe(111);
    expect(fast.globalTransform!.ty).toBe(222);
  });

  it('supports stable nonzero mounts (centered square stays translation-only)', () => {
    const stage = makeStage();
    const root = new CoreNode(stage, makeNodeProps({ w: 500, h: 500 }));
    const fast = new CoreNode(
      stage,
      makeNodeProps({
        parent: root,
        w: 40,
        h: 40,
        x: 100,
        y: 100,
        mountX: 0.5,
        mountY: 0.5,
      }),
    );
    const ref = new CoreNode(
      stage,
      makeNodeProps({
        parent: root,
        w: 40,
        h: 40,
        x: 100,
        y: 100,
        mountX: 0.5,
        mountY: 0.5,
      }),
    );
    // A child of the mount node, to verify inherited world updates still work.
    const leaf = new CoreNode(
      stage,
      makeNodeProps({ parent: fast, w: 5, h: 5, x: 1, y: 2 }),
    );
    const leafRef = new CoreNode(
      stage,
      makeNodeProps({ parent: ref, w: 5, h: 5, x: 1, y: 2 }),
    );
    root.update(0, clippingRect);
    // Mount-only local transform is a pure translation of (x - 0.5*w).
    expect(fast._localIsTranslate).toBe(true);
    expect(fast.localTransform!.tx).toBe(80);
    expect(fast.localTransform!.ty).toBe(80);

    fast.x = 200;
    ref.props.x = 200;
    ref.setUpdateType(UpdateType.Local);
    root.update(1, clippingRect);

    expectSameTransform(fast, ref);
    expect(fast.localTransform!.tx).toBe(180);
    // The mount node is translate-classified, so it takes the cheap
    // translate() global path rather than a full matrix multiply.
    expectSameTransform(leaf, leafRef);
    expect(leaf.globalTransform!.tx).toBe(181);
    expect(leaf.globalTransform!.ty).toBe(82);
  });

  it('maps child translation through an affine (rotated/scaled) parent', () => {
    const stage = makeStage();
    const root = new CoreNode(
      stage,
      makeNodeProps({
        w: 500,
        h: 500,
        x: 50,
        y: 60,
        rotation: Math.PI / 6,
        scaleX: 2,
        scaleY: 1.5,
        pivot: 0.5,
      }),
    );
    const fast = new CoreNode(
      stage,
      makeNodeProps({ parent: root, w: 10, h: 10, x: 5, y: 6 }),
    );
    const ref = new CoreNode(
      stage,
      makeNodeProps({ parent: root, w: 10, h: 10, x: 5, y: 6 }),
    );
    root.update(0, clippingRect);

    fast.x = 77;
    fast.y = 88;
    ref.props.x = 77;
    ref.props.y = 88;
    ref.setUpdateType(UpdateType.Local);
    root.update(1, clippingRect);

    expectSameTransform(fast, ref);
    // Parent is not a pure translation, so the child must not take the
    // two-addition fast path — but the result must still be correct.
    expect(fast._globalIsTranslate).toBe(false);
    const p = root.globalTransform!;
    const l = fast.localTransform!;
    expect(fast.globalTransform!.tx).toBeCloseTo(
      p.ta * l.tx + p.tb * l.ty + p.tx,
    );
    expect(fast.globalTransform!.ty).toBeCloseTo(
      p.tc * l.tx + p.td * l.ty + p.ty,
    );
  });

  it('applies simultaneous parent and child motion exactly once', () => {
    const stage = makeStage();
    const root = new CoreNode(
      stage,
      makeNodeProps({ w: 500, h: 500, x: 0, y: 0 }),
    );
    const child = new CoreNode(
      stage,
      makeNodeProps({ parent: root, w: 10, h: 10, x: 10, y: 10 }),
    );
    root.update(0, clippingRect);
    expect(child.globalTransform!.tx).toBe(10);

    root.x = 100;
    child.x = 30;
    root.update(1, clippingRect);

    expect(child.globalTransform!.tx).toBe(130);
    expect(child.globalTransform!.ty).toBe(10);
    expect(child.renderCoords!.x1).toBe(130);
  });

  it('a general Local change dominates a mixed Translate+Local frame', () => {
    const stage = makeStage();
    const root = new CoreNode(stage, makeNodeProps({ w: 500, h: 500 }));
    const fast = new CoreNode(
      stage,
      makeNodeProps({ parent: root, w: 10, h: 10, x: 0, y: 0 }),
    );
    const ref = new CoreNode(
      stage,
      makeNodeProps({ parent: root, w: 10, h: 10, x: 0, y: 0 }),
    );
    root.update(0, clippingRect);

    // Size change (Local) and position change (Translate) in the same frame,
    // in both orders.
    fast.w = 25;
    fast.x = 40;
    ref.props.w = 25;
    ref.props.x = 40;
    ref.setUpdateType(UpdateType.Local);
    root.update(1, clippingRect);
    expectSameTransform(fast, ref);

    fast.x = 90;
    fast.h = 33;
    ref.props.x = 90;
    ref.props.h = 33;
    ref.setUpdateType(UpdateType.Local);
    root.update(2, clippingRect);
    expectSameTransform(fast, ref);
    expect(fast.renderCoords!.x2).toBe(90 + 25);
    expect(fast.renderCoords!.y3).toBe(33);
  });

  it('keeps visibility transitions when moving in and out of the viewport', () => {
    const stage = makeMockStage({}, { width: 100, height: 100 });
    const root = new CoreNode(stage, makeNodeProps({ w: 100, h: 100 }));
    const node = new CoreNode(
      stage,
      makeNodeProps({ parent: root, w: 10, h: 10, x: 10, y: 10 }),
    );
    root.update(0, clippingRect);
    expect(node.renderState).toBe(CoreNodeRenderState.InViewport);

    node.x = 5000;
    root.update(1, clippingRect);
    expect(node.renderState).toBe(CoreNodeRenderState.OutOfBounds);

    node.x = 20;
    root.update(2, clippingRect);
    expect(node.renderState).toBe(CoreNodeRenderState.InViewport);
    expect(node.renderCoords!.x1).toBe(20);
  });

  it('marks the quad dirty on translation-only updates', () => {
    const stage = makeMockStage({
      options: { enableDirtyRepaints: true },
    } as Partial<Stage>) as Stage;
    const root = new CoreNode(stage, makeNodeProps({ w: 100, h: 100 }));
    const node = new CoreNode(
      stage,
      makeNodeProps({ parent: root, w: 10, h: 10, x: 1, y: 1 }),
    );
    root.update(0, clippingRect);
    node.isQuadDirty = false;

    node.x = 2;
    root.update(1, clippingRect);
    expect(node.isQuadDirty).toBe(true);
  });

  it('repeated x writes before an update collapse into one translation', () => {
    const stage = makeStage();
    const node = new CoreNode(stage, makeNodeProps({ w: 10, h: 10 }));
    node.update(0, clippingRect);

    node.x = 10;
    node.x = 20;
    node.x = 30;
    node.update(1, clippingRect);
    expect(node.globalTransform!.tx).toBe(30);
    expect(node.localTransform!.tx).toBe(30);
  });
});
