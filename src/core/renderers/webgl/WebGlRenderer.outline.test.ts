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
 * Tests for the dedicated outline quad path: nodes whose shader sets
 * `usesOutlineBuffer` (the lightweight Outline primitive) must write extended
 * 7-float vertices into the OutlineBuffer, batch into OutlineRenderOps across
 * mixed node sizes, split on incompatible state, and be uploaded/drawn by
 * render().
 */
import { describe, expect, it, vi } from 'vitest';
import { CoreNode } from '../../CoreNode.js';
import { TextureType, type Texture } from '../../textures/Texture.js';
import type { Stage } from '../../Stage.js';
import { WebGlRenderer } from './WebGlRenderer.js';
import { OutlineRenderOp } from './OutlineRenderOp.js';
import { OutlineBuffer, OUTLINE_FLOATS_PER_VERTEX } from './OutlineBuffer.js';
import { Outline } from '../../shaders/webgl/Outline.js';
import { makeMockStage, makeNodeProps } from '../../../../test/mockStage.js';

const clippingRect = {
  x: 0,
  y: 0,
  w: 2000,
  h: 2000,
  valid: false,
  clipRadius: 0,
};

const makeTexture = (): Texture =>
  ({
    type: TextureType.image,
    ctxTexture: { tex: 'ctx' },
    state: 'loaded',
    setRenderableOwner: vi.fn(),
    retryCount: 0,
    maxRetryCount: 0,
  }) as unknown as Texture;

interface FakeShaderNode {
  shaderKey: string;
  uniforms: { hasStoredUniforms: boolean };
  program: {
    usesOutlineBuffer: boolean;
    reuseRenderOp: (node: CoreNode, op: unknown) => boolean;
  };
}

const makeOutlineShaderNode = (
  uniforms: FakeShaderNode['uniforms'] = { hasStoredUniforms: false },
): FakeShaderNode => ({
  shaderKey: 'outline',
  uniforms,
  program: {
    usesOutlineBuffer: true,
    // Mirrors WebGlShaderProgram.reuseRenderOp's uniform-collection identity
    // shortcut: same collection reference => same values => batchable.
    reuseRenderOp: (node, op) =>
      (node.props.shader as unknown as FakeShaderNode).uniforms ===
      (op as OutlineRenderOp).shader.uniforms,
  },
});

const makeRenderer = (quadBufferSize = 4096) => {
  const glw = {
    createBuffer: vi.fn(() => ({ buf: 'gpu' })),
    arrayBufferData: vi.fn(),
    arrayBufferSubData: vi.fn(),
    bindFramebuffer: vi.fn(),
    viewport: vi.fn(),
    clearColor: vi.fn(),
    setScissorTest: vi.fn(),
    setStencilTest: vi.fn(),
    clear: vi.fn(),
    canvas: { width: 1920, height: 1080 },
    STATIC_DRAW: 0x88e4,
    DYNAMIC_DRAW: 0x88e8,
    FLOAT: 0x1406,
    UNSIGNED_BYTE: 0x1401,
  };
  const stage = makeMockStage({
    renderListNodes: [],
    renderListLen: 0,
    options: {
      quadBufferSize,
      enableClear: true,
      enableDirtyRepaints: true,
    },
    bufferMemory: 8000,
    defShaderNode: {
      shaderKey: 'default',
      program: { usesOutlineBuffer: false },
    } as unknown as Stage['defShaderNode'],
  } as unknown as Partial<Stage>);

  const renderer = Object.create(WebGlRenderer.prototype) as WebGlRenderer;
  (renderer as any).glw = glw;
  (renderer as any).stage = stage;
  (renderer as any).useDirtyRepaints = true;
  (renderer as any).quadBuffer = new ArrayBuffer(80 * 20);
  (renderer as any).fQuadBuffer = new Float32Array(
    (renderer as any).quadBuffer,
  );
  (renderer as any).uiQuadBuffer = new Uint32Array(
    (renderer as any).quadBuffer,
  );
  (renderer as any).renderOps = [];
  (renderer as any).rttNodes = [];
  (renderer as any).activeRttNode = null;
  (renderer as any).renderToTextureActive = false;
  (renderer as any).curBufferIdx = 0;
  (renderer as any).curRenderOp = null;
  (renderer as any).curOutlineRenderOp = null;
  (renderer as any).curSdfRenderOp = null;
  (renderer as any).dirtyQuadCount = 0;
  (renderer as any).needsFullUpload = true;
  (renderer as any).lastUploadedBufferSize = 0;
  (renderer as any).stencilDepth = 0;
  (renderer as any).clearColor = { raw: 0, normalized: [0, 0, 0, 0] };
  (renderer as any).quadBufferCollection = { getBuffer: () => 'quad-buffer' };
  (renderer as any).defaultTextureCoords = { x1: 0, y1: 0, x2: 1, y2: 1 };
  (renderer as any).nodeCoordsBuffer = {
    buf: 'node-coords',
  } as unknown as WebGLBuffer;
  (renderer as any).indexBuffer = { buf: 'index' } as unknown as WebGLBuffer;
  (renderer as any)._outlineBuffer = null;
  const scratch = new Float32Array(20);
  (renderer as any)._quadScratchBuffer = scratch.buffer;
  (renderer as any)._quadScratchU = new Uint32Array(scratch.buffer);
  const sdfBuffer = {
    idx: 0,
    changed: true,
    lastUploadedSize: 0,
    clear: vi.fn(),
    quadBufferCollection: { getBuffer: () => 'sdf-buffer' },
  };
  (renderer as any).sdfBufferPlain = sdfBuffer;
  (renderer as any).sdfBufferRich = sdfBuffer;

  return { renderer, glw, stage };
};

const makeNode = (
  stage: Stage,
  props: Partial<Parameters<typeof makeNodeProps>[0]> = {},
  shader?: FakeShaderNode,
  texture?: Texture,
): CoreNode => {
  const node = new CoreNode(
    stage,
    makeNodeProps({ w: 100, h: 50, x: 10, y: 20, ...props }),
  );
  // Nodes in a real scene share the (default) texture, so render-op reuse
  // keys on the same ctxTexture; mirror that by sharing one texture unless a
  // test passes its own.
  (node as any).props.texture = texture ?? makeTexture();
  if (shader !== undefined) {
    (node as any).props.shader = shader;
  }
  node.update(0, clippingRect);
  return node;
};

describe('Outline shader config', () => {
  it('opts into the dedicated outline buffer and declares stroke props', () => {
    expect(Outline.usesOutlineBuffer).toBe(true);
    expect(Outline.props).toBeDefined();
    expect((Outline.props as Record<string, unknown>).w).toBe(0);
    expect((Outline.props as Record<string, unknown>).color).toBe(0xffffffff);
    // No u_dimensions in either stage: mixed-size nodes must batch without
    // per-node dimension uniforms.
    expect(Outline.vertex).not.toContain('u_dimensions');
    expect(Outline.fragment).not.toContain('u_dimensions');
    expect(Outline.fragment).toContain('a_dimensions' in {} ? '' : 'v_dims');
  });
});

describe('WebGlRenderer outline quad path', () => {
  it('routes outline-shader nodes into the OutlineBuffer with extended vertices', () => {
    const { renderer, stage } = makeRenderer();
    const shader = makeOutlineShaderNode();
    const node = makeNode(stage, { w: 100, h: 50, x: 10, y: 20 }, shader);

    renderer.reset();
    renderer.addQuad(node);

    const buffer = (renderer as any)._outlineBuffer as OutlineBuffer;
    expect(buffer).toBeInstanceOf(OutlineBuffer);
    // 4 vertices * 7 floats written; main quad buffer untouched.
    expect(buffer.idx).toBe(OUTLINE_FLOATS_PER_VERTEX * 4);
    expect(renderer.curBufferIdx).toBe(0);

    // Vertex 0 (upper-left): pos (10,20), uv (0,0), packed color, dims (100,50)
    const f = buffer.fBuffer;
    const u = buffer.uiBuffer;
    expect([f[0], f[1]]).toEqual([10, 20]);
    expect([f[2], f[3]]).toEqual([0, 0]);
    expect(u[4]).toBe(node.premultipliedColorTl);
    expect([f[5], f[6]]).toEqual([100, 50]);
    // Vertex 2 (lower-left) carries dims too.
    expect([f[14 + 5], f[14 + 6]]).toEqual([100, 50]);

    // One OutlineRenderOp pushed, referencing the outline collection.
    expect(renderer.renderOps.length).toBe(1);
    const op = renderer.renderOps[0] as OutlineRenderOp;
    expect(op).toBeInstanceOf(OutlineRenderOp);
    expect(op.numQuads).toBe(1);
    expect(op.startQuad).toBe(0);
    expect(op.quadBufferCollection).toBe(buffer.quadBufferCollection);
    expect(op.shader).toBe(shader as never);
  });

  it('batches mixed-size outline nodes into a single render op', () => {
    const { renderer, stage } = makeRenderer();
    const shader = makeOutlineShaderNode();
    const tex = makeTexture();
    const a = makeNode(stage, { w: 30, h: 30 }, shader, tex);
    const b = makeNode(stage, { w: 200, h: 80, x: 500, y: 400 }, shader, tex);

    renderer.reset();
    renderer.addQuad(a);
    renderer.addQuad(b);

    expect(renderer.renderOps.length).toBe(1);
    const op = renderer.renderOps[0] as OutlineRenderOp;
    expect(op.numQuads).toBe(2);
    expect(op.startQuad).toBe(0);

    const buffer = (renderer as any)._outlineBuffer as OutlineBuffer;
    expect(buffer.idx).toBe(OUTLINE_FLOATS_PER_VERTEX * 4 * 2);
    // Second quad's dims are its own, not the first node's.
    expect([buffer.fBuffer[28 + 5], buffer.fBuffer[28 + 6]]).toEqual([200, 80]);
  });

  it('splits the batch on differing shader uniform values', () => {
    const { renderer, stage } = makeRenderer();
    const shaderA = makeOutlineShaderNode({ hasStoredUniforms: true });
    const shaderB = makeOutlineShaderNode({ hasStoredUniforms: true });
    const a = makeNode(stage, {}, shaderA);
    const b = makeNode(stage, {}, shaderB);

    renderer.reset();
    renderer.addQuad(a);
    renderer.addQuad(b);

    expect(renderer.renderOps.length).toBe(2);
    expect((renderer.renderOps[0] as OutlineRenderOp).numQuads).toBe(1);
    expect((renderer.renderOps[1] as OutlineRenderOp).startQuad).toBe(1);
  });

  it('splits the batch on clipping rect changes and breaks node-op chains', () => {
    const { renderer, stage } = makeRenderer();
    const shader = makeOutlineShaderNode();
    const tex = makeTexture();
    const plain = makeNode(stage, {}, shader, tex);
    const clipped = makeNode(stage, {}, shader, tex);
    clipped.clippingRect = {
      x: 0,
      y: 0,
      w: 50,
      h: 50,
      valid: true,
      clipRadius: 0,
    };
    const normal = makeNode(stage, {}); // default shader node

    renderer.reset();
    renderer.addQuad(plain);
    renderer.addQuad(clipped);
    expect(renderer.renderOps.length).toBe(2);

    // A normal (non-outline) node after an outline op must not extend the
    // outline op, and must start a fresh node op.
    (normal as any).props.texture = tex;
    renderer.addQuad(normal);
    expect(renderer.renderOps.length).toBe(3);
    expect(renderer.renderOps[2]).toBe(normal);
    expect(renderer.curRenderOp).toBe(normal);

    // And an outline node after that must not merge into the earlier op.
    renderer.addQuad(plain); // same shared texture + shader
    expect(renderer.renderOps.length).toBe(4);
    expect(renderer.renderOps[3]).toBeInstanceOf(OutlineRenderOp);
    expect((renderer.renderOps[3] as OutlineRenderOp).startQuad).toBe(2);
  });

  it('render() uploads the outline buffer and draws outline ops', () => {
    const { renderer, glw, stage } = makeRenderer();
    const shader = makeOutlineShaderNode();
    const tex = makeTexture();
    const a = makeNode(stage, { w: 10, h: 10 }, shader, tex);
    const b = makeNode(stage, { w: 20, h: 20 }, shader, tex);
    stage.renderListNodes = [a, b];
    stage.renderListLen = 2;

    renderer.reset();
    renderer.addQuad(a);
    renderer.addQuad(b);

    const drawSpy = vi
      .spyOn(OutlineRenderOp.prototype, 'draw')
      .mockImplementation(() => undefined);
    // Ignore the OutlineBuffer's initial allocation upload.
    glw.arrayBufferData.mockClear();

    renderer.render();

    const buffer = (renderer as any)._outlineBuffer as OutlineBuffer;
    const gpuBuf = buffer.quadBufferCollection.getBuffer('a_position');
    const outlineUploads = glw.arrayBufferData.mock.calls.filter(
      (c: unknown[]) => c[0] === gpuBuf,
    );
    expect(outlineUploads.length).toBe(1);
    expect((outlineUploads[0]![1] as Float32Array).length).toBe(
      OUTLINE_FLOATS_PER_VERTEX * 4 * 2,
    );
    expect(drawSpy).toHaveBeenCalledTimes(1);
  });

  it('reset() clears the outline buffer cursor for the next frame', () => {
    const { renderer, stage } = makeRenderer();
    const shader = makeOutlineShaderNode();
    const a = makeNode(stage, {}, shader);

    renderer.reset();
    renderer.addQuad(a);
    expect(((renderer as any)._outlineBuffer as OutlineBuffer).idx).toBe(28);

    renderer.reset();
    expect(((renderer as any)._outlineBuffer as OutlineBuffer).idx).toBe(0);
    expect(renderer.curOutlineRenderOp).toBeNull();
  });

  it('drops outline quads beyond the indexable buffer capacity', () => {
    // 112 bytes per outline quad: 224 bytes => exactly 2 quads.
    const { renderer, stage } = makeRenderer(224);
    const shader = makeOutlineShaderNode();
    const tex = makeTexture();
    const a = makeNode(stage, {}, shader, tex);
    const b = makeNode(stage, {}, shader, tex);
    const c = makeNode(stage, {}, shader, tex);

    renderer.reset();
    renderer.addQuad(a);
    renderer.addQuad(b);
    renderer.addQuad(c);

    const op = renderer.renderOps[0] as OutlineRenderOp;
    expect(op.numQuads).toBe(2);
    expect(((renderer as any)._outlineBuffer as OutlineBuffer).idx).toBe(56);
  });
});
