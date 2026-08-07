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
 * Dirty quad buffer (C2) unit tests for WebGlRenderer.
 *
 * Validates the surgical `bufferSubData` upload path: permanent slot
 * assignment in addQuad, the full-vs-surgical decision in render(), the
 * structural invalidation hook, and the dedicated RTT buffer. The renderer is
 * created via Object.create so no WebGL context is required; only the fields
 * under test are wired up.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CoreNode, CoreNodeRenderState } from '../../CoreNode.js';
import { TextureType, type Texture } from '../../textures/Texture.js';
import type { Stage } from '../../Stage.js';
import { WebGlRenderer } from './WebGlRenderer.js';
import { makeMockStage, makeNodeProps } from '../../../../test/mockStage.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const clippingRect = {
  x: 0,
  y: 0,
  w: 200,
  h: 200,
  valid: false,
  clipRadius: 0,
};

const makeTexture = (): Texture =>
  ({
    type: TextureType.image,
    ctxTexture: {},
    state: 'loaded',
    setRenderableOwner: vi.fn(),
    retryCount: 0,
    maxRetryCount: 0,
  } as unknown as Texture);

interface GlwMock {
  arrayBufferData: ReturnType<typeof vi.fn>;
  arrayBufferSubData: ReturnType<typeof vi.fn>;
  bindFramebuffer: ReturnType<typeof vi.fn>;
  viewport: ReturnType<typeof vi.fn>;
  clearColor: ReturnType<typeof vi.fn>;
  STATIC_DRAW: number;
  DYNAMIC_DRAW: number;
}

interface RendererHarness {
  renderer: WebGlRenderer;
  glw: GlwMock;
  stage: Stage;
}

const makeRenderer = (nodes: CoreNode[] = []): RendererHarness => {
  const glw = {
    arrayBufferData: vi.fn(),
    arrayBufferSubData: vi.fn(),
    bindFramebuffer: vi.fn(),
    viewport: vi.fn(),
    clearColor: vi.fn(),
    STATIC_DRAW: 0x88e4,
    DYNAMIC_DRAW: 0x88e8,
    setScissorTest: vi.fn(),
    setStencilTest: vi.fn(),
    clear: vi.fn(),
    canvas: { width: 1920, height: 1080 },
  };

  const quadBuffer = new ArrayBuffer(80 * 20); // 20-quad capacity
  const stage = makeMockStage({
    renderListNodes: nodes,
    renderListLen: nodes.length,
    options: { quadBufferSize: quadBuffer.byteLength, enableClear: true },
    // A concrete default shader so reuseRenderOp batches via the
    // shaderKey==='default' fast path instead of touching shader programs.
    defShaderNode: {
      shaderKey: 'default',
      program: {},
    } as unknown as Stage['defShaderNode'],
  } as Partial<Stage>);

  const renderer = Object.create(WebGlRenderer.prototype) as WebGlRenderer;
  (renderer as any).glw = glw;
  (renderer as any).stage = stage;
  (renderer as any).quadBuffer = quadBuffer;
  (renderer as any).fQuadBuffer = new Float32Array(quadBuffer);
  (renderer as any).uiQuadBuffer = new Uint32Array(quadBuffer);
  (renderer as any).renderOps = [];
  (renderer as any).rttNodes = [];
  (renderer as any).activeRttNode = null;
  (renderer as any).renderToTextureActive = false;
  (renderer as any).curBufferIdx = 0;
  (renderer as any).curRenderOp = null;
  (renderer as any).dirtyQuadCount = 0;
  (renderer as any).needsFullUpload = true;
  (renderer as any).lastUploadedBufferSize = 0;
  (renderer as any).rttQuadBuffer = null;
  (renderer as any).fRttQuadBuffer = null;
  (renderer as any).uiRttQuadBuffer = null;
  (renderer as any).clearColor = { raw: 0, normalized: [0, 0, 0, 0] };
  (renderer as any).quadBufferCollection = {
    getBuffer: () => 'quad-buffer',
  };
  (renderer as any).defaultTextureCoords = { x1: 0, y1: 0, x2: 1, y2: 1 };
  const scratch = new Float32Array(20);
  (renderer as any)._quadScratchBuffer = scratch.buffer;
  (renderer as any)._quadScratchF = scratch;

  return { renderer, glw, stage };
};

const makeNode = (stage: Stage): CoreNode => {
  const node = new CoreNode(stage, makeNodeProps({ w: 100, h: 100 }));
  (node as any).props.texture = makeTexture();
  // The draw loop calls op.draw(this); unit tests focus on the quad buffer
  // bookkeeping, so draw is stubbed out here.
  vi.spyOn(node, 'draw').mockReturnValue(undefined);
  node.update(0, clippingRect);
  return node;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WebGlRenderer dirty quad buffer — slot assignment', () => {
  let harness: RendererHarness;
  let renderer: WebGlRenderer;
  let stage: Stage;
  let a: CoreNode;
  let b: CoreNode;
  let c: CoreNode;

  beforeEach(() => {
    harness = makeRenderer();
    renderer = harness.renderer;
    stage = harness.stage;
    a = makeNode(stage);
    b = makeNode(stage);
    c = makeNode(stage);
    stage.renderListNodes = [a, b, c];
    stage.renderListLen = 3;
  });

  it('assigns contiguous permanent slots and advances curBufferIdx by 20 per quad', () => {
    renderer.reset();
    renderer.addQuad(a);
    expect(a.quadBufferIndex).toBe(0);
    expect(renderer.curBufferIdx).toBe(20);

    renderer.addQuad(b);
    expect(b.quadBufferIndex).toBe(20);
    expect(renderer.curBufferIdx).toBe(40);

    renderer.addQuad(c);
    expect(c.quadBufferIndex).toBe(40);
    expect(renderer.curBufferIdx).toBe(60);

    expect(renderer.fQuadBuffer[0]).toBe(a.renderCoords!.x1);
    expect(renderer.fQuadBuffer[20]).toBe(b.renderCoords!.x1);
    expect(renderer.fQuadBuffer[40]).toBe(c.renderCoords!.x1);
  });

  it('re-assigns the same slots on a stable replay frame', () => {
    renderer.reset();
    renderer.addQuad(a);
    renderer.addQuad(b);
    renderer.addQuad(c);
    const slots = [a.quadBufferIndex, b.quadBufferIndex, c.quadBufferIndex];

    renderer.reset();
    renderer.addQuad(a);
    renderer.addQuad(b);
    renderer.addQuad(c);

    expect([a.quadBufferIndex, b.quadBufferIndex, c.quadBufferIndex]).toEqual(
      slots,
    );
  });

  it('counts dirty main-scene nodes in dirtyQuadCount during the pass', () => {
    a.isQuadDirty = false;
    b.isQuadDirty = true;
    c.isQuadDirty = false;
    renderer.reset();
    renderer.addQuad(a);
    renderer.addQuad(b);
    renderer.addQuad(c);
    expect(renderer.dirtyQuadCount).toBe(1);
  });

  it('does not count RTT nodes in dirtyQuadCount', () => {
    b.isQuadDirty = true;
    renderer.renderToTextureActive = true;
    renderer.reset();
    renderer.addQuad(a);
    renderer.addQuad(b);
    expect(renderer.dirtyQuadCount).toBe(0);
    renderer.renderToTextureActive = false;
  });
});

describe('WebGlRenderer dirty quad buffer — render() upload decision', () => {
  let harness: RendererHarness;
  let renderer: WebGlRenderer;
  let glw: GlwMock;
  let stage: Stage;
  let a: CoreNode;
  let b: CoreNode;
  let c: CoreNode;

  beforeEach(() => {
    harness = makeRenderer();
    renderer = harness.renderer;
    glw = harness.glw;
    stage = harness.stage;
    a = makeNode(stage);
    b = makeNode(stage);
    c = makeNode(stage);
    stage.renderListNodes = [a, b, c];
    stage.renderListLen = 3;
  });

  it('full uploads on the first frame with DYNAMIC_DRAW and clears dirty flags', () => {
    renderer.reset();
    renderer.addQuad(a);
    renderer.addQuad(b);
    renderer.addQuad(c);
    renderer.render();

    expect(glw.arrayBufferData).toHaveBeenCalledTimes(1);
    const [buffer, data, usage] = glw.arrayBufferData.mock.calls[0]!;
    expect(buffer).toBe('quad-buffer');
    expect((data as Float32Array).length).toBe(60);
    expect(usage).toBe(glw.DYNAMIC_DRAW);
    expect(glw.arrayBufferSubData).not.toHaveBeenCalled();
    expect(a.isQuadDirty).toBe(false);
    expect(renderer.needsFullUpload).toBe(false);
    expect(renderer.lastUploadedBufferSize).toBe(60);
  });

  it('surgically uploads only the dirty slot via arrayBufferSubData', () => {
    renderer.reset();
    renderer.addQuad(a);
    renderer.addQuad(b);
    renderer.addQuad(c);
    renderer.render(); // full upload frame 1
    expect(glw.arrayBufferData).toHaveBeenCalledTimes(1);

    // Frame 2: only node b changed.
    b.isQuadDirty = true;
    renderer.reset();
    renderer.addQuad(a);
    renderer.addQuad(b);
    renderer.addQuad(c);
    renderer.render();

    expect(glw.arrayBufferData).toHaveBeenCalledTimes(1);
    expect(glw.arrayBufferSubData).toHaveBeenCalledTimes(1);
    const [buffer, byteOffset, data] = glw.arrayBufferSubData.mock.calls[0]!;
    expect(buffer).toBe('quad-buffer');
    expect(byteOffset).toBe(b.quadBufferIndex * 4);
    expect((data as Float32Array).length).toBe(20);
    expect(b.isQuadDirty).toBe(false);
    expect(a.isQuadDirty).toBe(false);
    expect(c.isQuadDirty).toBe(false);
  });

  it('falls back to a full upload when more than 40% of nodes are dirty', () => {
    renderer.reset();
    renderer.addQuad(a);
    renderer.addQuad(b);
    renderer.addQuad(c);
    renderer.render(); // full upload frame 1
    expect(glw.arrayBufferData).toHaveBeenCalledTimes(1);

    // Frame 2: 2 of 3 nodes dirty → 2 > 1.2 → full upload.
    a.isQuadDirty = true;
    b.isQuadDirty = true;
    renderer.reset();
    renderer.addQuad(a);
    renderer.addQuad(b);
    renderer.addQuad(c);
    renderer.render();

    expect(glw.arrayBufferData).toHaveBeenCalledTimes(2);
    expect(glw.arrayBufferSubData).not.toHaveBeenCalled();
    expect(a.isQuadDirty).toBe(false);
    expect(b.isQuadDirty).toBe(false);
  });

  it('full uploads when the buffer grows past the last uploaded size', () => {
    renderer.reset();
    renderer.addQuad(a);
    renderer.addQuad(b);
    renderer.addQuad(c);
    renderer.render(); // full upload, lastUploadedBufferSize = 60
    expect(renderer.lastUploadedBufferSize).toBe(60);

    // Scene grows: two more nodes join this frame.
    stage.renderListNodes = [a, b, c, makeNode(stage), makeNode(stage)];
    stage.renderListLen = stage.renderListNodes.length;
    renderer.reset();
    for (let i = 0; i < stage.renderListLen; i++) {
      renderer.addQuad(stage.renderListNodes[i]!);
    }
    renderer.render();

    expect(glw.arrayBufferData).toHaveBeenCalledTimes(2);
    const [, data] = glw.arrayBufferData.mock.calls[1]!;
    expect((data as Float32Array).length).toBe(100);
    expect(renderer.lastUploadedBufferSize).toBe(100);
  });

  it('uses the preallocated scratch buffer for surgical uploads', () => {
    renderer.reset();
    renderer.addQuad(a);
    renderer.addQuad(b);
    renderer.addQuad(c);
    renderer.render();

    b.isQuadDirty = true;
    renderer.reset();
    renderer.addQuad(a);
    renderer.addQuad(b);
    renderer.addQuad(c);
    renderer.render();

    const [, , data] = glw.arrayBufferSubData.mock.calls[0]!;
    expect(data).toBe((renderer as any)._quadScratchF);
    // The scratch holds the slot's fresh data.
    expect((data as Float32Array)[0]).toBe(
      renderer.fQuadBuffer[b.quadBufferIndex],
    );
  });
});

describe('WebGlRenderer dirty quad buffer — invalidateQuadBuffer', () => {
  let harness: RendererHarness;
  let renderer: WebGlRenderer;
  let stage: Stage;
  let a: CoreNode;
  let b: CoreNode;
  let c: CoreNode;

  beforeEach(() => {
    harness = makeRenderer();
    renderer = harness.renderer;
    stage = harness.stage;
    a = makeNode(stage);
    b = makeNode(stage);
    c = makeNode(stage);
    stage.renderListNodes = [a, b, c];
    stage.renderListLen = 3;
  });

  it('resets all slots, marks everything dirty and forces a full upload', () => {
    renderer.reset();
    renderer.addQuad(a);
    renderer.addQuad(b);
    renderer.addQuad(c);
    renderer.render();
    expect(renderer.needsFullUpload).toBe(false);

    renderer.invalidateQuadBuffer();

    expect(a.quadBufferIndex).toBe(-1);
    expect(b.quadBufferIndex).toBe(-1);
    expect(c.quadBufferIndex).toBe(-1);
    expect(a.isQuadDirty).toBe(true);
    expect(b.isQuadDirty).toBe(true);
    expect(c.isQuadDirty).toBe(true);
    expect(renderer.needsFullUpload).toBe(true);
    expect(renderer.curBufferIdx).toBe(0);
    expect(renderer.lastUploadedBufferSize).toBe(0);
  });

  it('reassigns compact slots from 0 on the next frame', () => {
    renderer.reset();
    renderer.addQuad(a);
    renderer.addQuad(b);
    renderer.render();

    renderer.invalidateQuadBuffer();
    renderer.reset();
    renderer.addQuad(a);
    renderer.addQuad(b);

    expect(a.quadBufferIndex).toBe(0);
    expect(b.quadBufferIndex).toBe(20);
  });
});

describe('WebGlRenderer dirty quad buffer — RTT isolation', () => {
  let harness: RendererHarness;
  let renderer: WebGlRenderer;
  let glw: GlwMock;
  let stage: Stage;
  let child: CoreNode;

  beforeEach(() => {
    harness = makeRenderer();
    renderer = harness.renderer;
    glw = harness.glw;
    stage = harness.stage;
    child = makeNode(stage);
  });

  it('writes RTT quads into the dedicated RTT buffer without touching main slots', () => {
    child.quadBufferIndex = 123; // simulate an existing main-scene slot
    renderer.renderToTextureActive = true;
    renderer.addQuad(child);

    expect(renderer.rttQuadBuffer).not.toBeNull();
    expect(renderer.curBufferIdx).toBe(20);
    expect(child.quadBufferIndex).toBe(123);
    expect((renderer.fRttQuadBuffer as Float32Array)[0]).toBe(
      child.renderCoords!.x1,
    );
    // Main CPU buffer is untouched.
    expect(renderer.fQuadBuffer[0]).toBe(0);
    renderer.renderToTextureActive = false;
  });

  it('renderRTT full uploads from the RTT buffer with STATIC_DRAW', () => {
    const drawSpy = vi.spyOn(child, 'draw').mockReturnValue(undefined);
    renderer.renderToTextureActive = true;
    renderer.addQuad(child);
    (renderer as any).renderRTT();

    expect(glw.arrayBufferData).toHaveBeenCalledTimes(1);
    const [buffer, data, usage] = glw.arrayBufferData.mock.calls[0]!;
    expect(buffer).toBe('quad-buffer');
    expect((data as Float32Array).length).toBe(20);
    expect(usage).toBe(glw.STATIC_DRAW);
    expect(drawSpy).toHaveBeenCalledTimes(1);
    renderer.renderToTextureActive = false;
  });

  it('renderRTTNodes restores the main buffer state and forces a full re-upload', () => {
    const rttNode = new CoreNode(stage, makeNodeProps({ rtt: false }));
    (rttNode as any).props.texture = {
      type: TextureType.renderToTexture,
      state: 'loaded',
      ctxTexture: { framebuffer: {}, w: 100, h: 100 },
    };
    rttNode.hasRTTupdates = true;
    rttNode.worldAlpha = 1;
    rttNode.renderState = CoreNodeRenderState.InBounds;
    (stage as any).addSubtreeQuads = vi.fn();

    renderer.rttNodes = [rttNode];
    renderer.curBufferIdx = 999;
    renderer.needsFullUpload = false;
    renderer.lastUploadedBufferSize = 999;
    (renderer as any).rttQuadBuffer = new ArrayBuffer(80);
    (renderer as any).fRttQuadBuffer = new Float32Array(
      (renderer as any).rttQuadBuffer,
    );
    (renderer as any).uiRttQuadBuffer = new Uint32Array(
      (renderer as any).rttQuadBuffer,
    );

    renderer.renderRTTNodes();

    expect(renderer.curBufferIdx).toBe(999);
    expect(renderer.needsFullUpload).toBe(true);
    expect(renderer.lastUploadedBufferSize).toBe(0);
    expect(renderer.renderToTextureActive).toBe(false);
  });
});
