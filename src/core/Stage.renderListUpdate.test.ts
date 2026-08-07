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
 * Tests for Stage.requestRenderListUpdate.
 *
 * A full Stage needs a live renderer, so the method is exercised on a minimal
 * fake via the prototype. Only the fields requestRenderListUpdate touches are
 * provided: renderer.invalidateQuadBuffer, renderListDirty, requestRender.
 */
import { describe, it, expect, vi } from 'vitest';
import { Stage } from './Stage.js';

type FakeStage = {
  renderer: { invalidateQuadBuffer?: ReturnType<typeof vi.fn> };
  renderListDirty: boolean;
  requestRender: ReturnType<typeof vi.fn>;
};

const makeStage = (hasInvalidate = true): FakeStage => ({
  renderer: hasInvalidate ? { invalidateQuadBuffer: vi.fn() } : {},
  renderListDirty: false,
  requestRender: vi.fn(),
});

const requestRenderListUpdate = (stage: FakeStage) =>
  Stage.prototype.requestRenderListUpdate.call(stage as unknown as Stage);

describe('Stage.requestRenderListUpdate', () => {
  it('invalidates the quad buffer and marks the list dirty on first call', () => {
    const stage = makeStage();

    requestRenderListUpdate(stage);

    expect(stage.renderer.invalidateQuadBuffer!.mock.calls.length).toBe(1);
    expect(stage.renderListDirty).toBe(true);
    expect(stage.requestRender.mock.calls.length).toBe(1);
  });

  it('skips repeat invalidations while a rebuild is already pending', () => {
    const stage = makeStage();

    requestRenderListUpdate(stage);
    requestRenderListUpdate(stage);
    requestRenderListUpdate(stage);

    // One structural invalidation and one render request for the whole burst
    // (e.g. a row of cards flipping renderable in the same frame); the list
    // rebuild on the next frame clears the flag for the following burst.
    expect(stage.renderer.invalidateQuadBuffer!.mock.calls.length).toBe(1);
    expect(stage.requestRender.mock.calls.length).toBe(1);
    expect(stage.renderListDirty).toBe(true);
  });

  it('invalidates again after drawFrame clears the dirty flag', () => {
    const stage = makeStage();

    requestRenderListUpdate(stage);
    // drawFrame rebuilds the render list and clears the flag
    stage.renderListDirty = false;
    requestRenderListUpdate(stage);

    expect(stage.renderer.invalidateQuadBuffer!.mock.calls.length).toBe(2);
    expect(stage.renderListDirty).toBe(true);
  });

  it('handles renderers without invalidateQuadBuffer (canvas backend)', () => {
    const stage = makeStage(false);

    requestRenderListUpdate(stage);

    expect(stage.renderListDirty).toBe(true);
    expect(stage.requestRender.mock.calls.length).toBe(1);
  });
});
