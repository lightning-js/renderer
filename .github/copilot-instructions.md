# Lightning 3 Renderer - Agent Development Instructions

**Target**: High-performance JavaScript rendering engine for constrained embedded browser environments

## Core Philosophy

**Performance > Readability**: We optimize for raw performance. Readability is secondary.

### Architecture Principles

- **Class-based design** - Use TypeScript classes for structure and type safety
- **Zero GC pressure** - Minimize object allocation, reuse everything possible
- **Direct memory management** - Pre-allocate buffers, use typed arrays
- **Zero safety checks** - Input validation is caller's responsibility
- **Early returns** - Most common paths first, error checks on top
- **Arrow functions for utilities** - Use arrow functions for libraries/singletons/utilities

## GPU Target: Mali 400 / OpenGL ES 2.0 Class Hardware

This renderer targets **Mali 400-class GPUs** (and comparable OpenGL ES 2.0-class silicon such as Vivante GC400, PowerVR SGX). These are in-order, tile-based, scalar fragment pipelines with strict GLSL ES 1.0 constraints. Every shader decision must be evaluated against this baseline. Modern GPUs are a bonus, not the target.

### WebGL / GLSL Hard Constraints

- **WebGL 1.0 only** — no WebGL 2.0 APIs (`textureLod`, `textureOffset`, integer attributes, MRT, `gl.UNSIGNED_INT` indices, etc.)
- **Fragment shader precision** — Mali 400 has no `highp` in fragment shaders. Always use the `#ifdef GL_FRAGMENT_PRECISION_HIGH` guard that is already the project standard. Never assume `highp` is available in a fragment shader.
- **Index buffers** — always use `Uint16Array` / `gl.UNSIGNED_SHORT`. `gl.UNSIGNED_INT` requires `OES_element_index_uint` which is absent on Mali 400.
- **Max 8 texture units** — keep sampler count at or below 8. Do not index sampler arrays with a non-constant (varying or computed) expression — this is undefined behavior in GLSL ES 1.0 and silently breaks on Mali 400 drivers.
- **Max 8 vec4-equivalent varyings** — count varyings before adding new ones. Each `vec4` or `vec2 + vec2` pair counts as one unit toward the limit of 8. Exceeding this will silently drop varyings or fail to compile on constrained drivers.
- **NPOT textures** — non-power-of-two textures must use `CLAMP_TO_EDGE` wrapping and must not use mipmaps.
- **No derivative instructions** — `dFdx`, `dFdy`, and `fwidth` require `OES_standard_derivatives`. Check for the extension before use; do not use in core shaders.

### Avoid Branching in GLSL Shaders (CRITICAL)

Mali 400 has an in-order scalar fragment pipeline. Any `if`, `else`, or ternary `?:` in a fragment shader causes the pipeline to serialize both code paths for every fragment in the affected batch. This is not a style concern — it is a frame-time concern.

**Rule: never use `if`, `else`, or `?:` in a fragment shader.** Use arithmetic equivalents instead.

```glsl
// ❌ AVOID: if/else branch in fragment shader
if (v_texcoord.x < 0.0) {
  gl_FragColor = solidColor;
} else {
  gl_FragColor = texture2D(u_texture, v_texcoord);
}

// ✅ DO: arithmetic mask — no branch, both paths are cheap
float isSolid = step(0.0, -v_texcoord.x);   // 1.0 when x < 0, else 0.0
gl_FragColor = mix(texture2D(u_texture, v_texcoord), solidColor, isSolid);
```

```glsl
// ❌ AVOID: ternary in fragment shader (it is a branch in GLSL ES 1.0)
r.xy = (p.x > 0.0) ? r.yz : r.xw;

// ✅ DO: mix + step
float s = step(0.0, p.x);
r.xy = mix(r.xw, r.yz, s);
```

```glsl
// ❌ AVOID: early return from fragment main() or fragment functions
float getGradientColor(float dist) {
  if (dist <= u_stops[0]) return u_colors[0];  // early exit — branch
  for (int i = 0; i < LAST_STOP; i++) {
    if (dist >= u_stops[i] && dist <= u_stops[i+1]) {
      return mix(u_colors[i], u_colors[i+1], ...); // return inside loop — UB risk
    }
  }
  // missing final return — undefined behavior in GLSL ES 1.0
}

// ✅ DO: branchless accumulation — single return, no conditionals
vec4 getGradientColor(float dist) {
  vec4 color = u_colors[0];
  for (int i = 0; i < LAST_STOP; i++) {
    float t = clamp((dist - u_stops[i]) / (u_stops[i+1] - u_stops[i]), 0.0, 1.0);
    color = mix(color, mix(u_colors[i], u_colors[i+1], t), step(u_stops[i], dist));
  }
  return color;
}
```

Additional rules:

- **No `discard`** in fragment shaders — kills early-Z optimizations and stalls the tile pipeline. Use `mix()` with a zero-alpha result instead.
- **No `for` loops with non-compile-time-constant bounds** in shaders — loop counts must be a literal or `#define` constant resolvable at compile time.
- **No sampler array indexing by varying** — `texture2D(u_textures[int(v_index)], uv)` is undefined behavior in GLSL ES 1.0. Use a compile-time-unrolled `if/else` chain per texture unit, or restructure to avoid batched multi-texture lookups entirely.
- **All non-void GLSL functions must have a `return` on every code path** — a function that can exit without returning is undefined behavior in GLSL ES 1.0 and will produce incorrect output on Mali 400.

### CPU-side WebGL for Tile-Based Renderers

Tile-based GPUs (Mali, PowerVR, Adreno low-end) pay a heavy cost for certain API patterns that are cheap on desktop GPUs:

- **Minimize draw calls per frame** — each `drawElements` / `drawArrays` call triggers a tile flush. Batch geometry aggressively into as few calls as possible.
- **Avoid FBO switches mid-frame** — binding a different framebuffer forces the GPU to resolve and reload tile memory. Batch all RTT operations together; do not interleave them with main framebuffer draws.
- **No `gl.getError()` in hot paths** — this synchronizes the CPU and GPU pipelines. Use it only during development/debug builds.
- **No `readPixels` in hot paths** — stalls the GPU pipeline completely while data is transferred to CPU memory.
- **Request `antialias: false`** in WebGL context creation — MSAA is prohibitively expensive on tile-based hardware. Handle anti-aliasing in-shader with `smoothstep` SDF edges if needed.
- **Only request `depth: true` / `stencil: true` if the feature actually requires it** — each enabled buffer consumes tile memory bandwidth on every flush.
- **Prefer `preserveDrawingBuffer: false`** (the default) — `true` forces a framebuffer copy on every frame on most tile-based drivers.

## Performance Rules (CRITICAL)

### 1. Loop Performance

```javascript
// ✅ DO: Use for/while loops
for (let i = 0; i < items.length; i++) {
  process(items[i]);
}

// ❌ NEVER: Use array methods in hot paths
items.forEach(process); // NO
items.map(transform); // NO
items.filter(check); // NO
```

### 2. Comparison Operations

```javascript
// ✅ DO: Direct comparisons
if (value === null) return
if (type === 2) continue
if (buffer.length === 0) return

// ❌ NEVER: Truthy/falsy checks
if (value) return      // NO
if (!items.length)     // NO
if (buffer)           // NO
```

### 3. Object Creation & Reuse

```typescript
// ✅ DO: Reuse class instances and buffers
class Element {
  x = 0;
  y = 0;
  w = 0;
  h = 0;
  private _dirty = false;
}

// Reuse buffers
let vertexBuffer = new Float32Array(maxQuads * floatsPerQuad);
let vertexOffset = 0;

// ❌ NEVER: Create objects in loops
for (let i = 0; i < count; i++) {
  const obj = { x: i, y: i }; // NO - creates GC pressure
}
```

### 4. Property Access Optimization

```javascript
// ✅ DO: Extract frequently accessed properties
const texture = element.texture;
const w = texture.width;
const h = texture.height;

// ✅ DO: Use bracket notation for dynamic access
const value = element[propertyName];

// ❌ AVOID: Repeated deep property access
element.texture.width; // OK once
element.texture.width; // Wasteful if repeated
```

### 5. Early Returns & Flat Code

```javascript
// ✅ DO: Error checks first, early returns
function processElement(el) {
  if (el === null) return;
  if (el._destroyed === true) return;
  if (el._isRenderable === false) return;

  // Main logic here - flat, no nesting
  const x = el.x;
  const y = el.y;
  // ...
}

// ❌ NEVER: Deep nesting (max 3 levels)
if (condition) {
  if (other) {
    if (another) {
      if (deep) {
        // NO - too deep
        // ...
      }
    }
  }
}
```

## Data Structures & Memory

### Typed Arrays for Performance

```javascript
// ✅ DO: Use typed arrays for batching
const vertexBuffer = new Float32Array(maxElements * floatsPerElement);
const indexBuffer = new Uint16Array(maxElements * 6);

// ✅ DO: Use numbers for flags/enums
const RENDER_TYPE_RECT = 0;
const RENDER_TYPE_TEXTURE = 1;
const RENDER_TYPE_TEXT = 2;
```

### Bit Operations

```javascript
// ✅ DO: Use bitwise operations where applicable
const type = element._renderType | 0; // Force integer
const z = element.zIndex | 0;
const id = ++counter | 0;

// Use bit flags for state
const DIRTY_TRANSFORM = 1;
const DIRTY_COLOR = 2;
const DIRTY_TEXTURE = 4;
element._dirtyFlags |= DIRTY_TRANSFORM;
```

### Buffer Management

```javascript
// ✅ DO: Pre-allocate, reuse buffers
let buffer = new Float32Array(maxQuads * floatsPerQuad);
let offset = 0;

function addQuad(x, y, w, h) {
  if (offset + floatsPerQuad > buffer.length) {
    flush();
    offset = 0;
  }

  buffer[offset++] = x;
  buffer[offset++] = y;
  // ... continue
}

function flush() {
  if (offset === 0) return;
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, buffer.subarray(0, offset));
  offset = 0;
}
```

## Code Patterns

### Class-Based Pattern

```typescript
// ✅ DO: Use TypeScript classes for structure
class Element {
  id: number;
  x = 0;
  y = 0;
  w = 0;
  h = 0;
  children: Element[] = [];
  private _dirty = false;
  private _destroyed = false;

  constructor() {
    this.id = generateId();
  }

  addChild(child: Element): void {
    this.children.push(child);
    this._dirty = true;
  }

  removeChild(child: Element): void {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      this._dirty = true;
    }
  }

  dirty(): void {
    this._dirty = true;
  }
}
```

### Utility/Singleton Pattern

```typescript
// ✅ DO: Use arrow functions for utilities and singletons
export const TextureManager = (() => {
  const cache = new Map<string, Texture>();

  return {
    getTexture: (url: string): Texture | undefined => {
      return cache.get(url);
    },

    addTexture: (url: string, texture: Texture): void => {
      cache.set(url, texture);
    },

    clear: (): void => {
      cache.clear();
    },
  };
})();
```

## Testing Requirements

### Unit Tests (REQUIRED)

All new code MUST include unit tests. Use Vitest as the testing framework.

```typescript
// ✅ DO: Write unit tests for new classes and utilities
describe('Element', () => {
  it('should add child and mark as dirty', () => {
    const parent = new Element();
    const child = new Element();

    parent.addChild(child);

    expect(parent.children.length).toBe(1);
    expect(parent.children[0]).toBe(child);
    expect(parent._dirty).toBe(true);
  });

  it('should remove child correctly', () => {
    const parent = new Element();
    const child = new Element();

    parent.addChild(child);
    parent.removeChild(child);

    expect(parent.children.length).toBe(0);
  });
});
```

**Testing Guidelines:**

- Test public APIs and behavior, not implementation details
- Test edge cases: null, undefined, 0, empty arrays
- Test state changes and side effects
- Keep tests fast - avoid setTimeout, mock expensive operations
- Use explicit comparisons in assertions (toBe, toEqual, not toBeTruthy)
- Run tests with `pnpm test` before committing

### Visual Regression Tests (Rendering Features)

For significant rendering features (shaders, effects, layout changes), add visual regression tests.

```typescript
// ✅ DO: Add visual regression tests for rendering features
// Located in examples/tests/
import type { ExampleSettings } from '../common/ExampleSettings.js';

export async function automation(settings: ExampleSettings) {
  await test(settings);
  await settings.snapshot(); // Captures snapshot for comparison
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  const node = renderer.createNode({
    x: 20,
    y: 20,
    w: 200,
    h: 200,
    color: 0xff0000ff,
    shader: renderer.createShader('RoundedRectangle'),
    parent: testRoot,
  });
}
```

**When to add visual tests:**

- New shader effects
- Layout algorithm changes
- Clipping or masking features
- Text rendering modifications
- Color space or blending changes
- Any visual feature users will see

**Visual test workflow:**

1. Add test file in `examples/tests/` (e.g., `shader-my-feature.ts`)
2. Export `automation` function that calls `settings.snapshot()`
3. Run `pnpm test:visual --capture` to generate snapshot
4. Manually verify output in `visual-regression/certified-snapshots/`
5. Commit certified snapshot with your code
6. CI will fail if future changes break rendering

## What to NEVER Do

1. **Never use map/filter/forEach in hot paths** - Use for/while loops
2. **Never do truthy/falsy checks** - Use explicit comparisons
3. **Never nest more than 3 levels deep** - Use early returns
4. **Never create objects in render loops** - Pre-allocate and reuse
5. **Never use function.bind() in hot paths** - Use arrow functions or class methods
6. **Never use spread operators in performance code** - Use Object.assign or direct assignment
7. **Never validate inputs** - Caller's responsibility
8. **Never use try/catch in hot paths** - Check conditions first
9. **Never use delete operator** - Set to null/undefined instead
10. **Never use JSDoc** - Use TypeScript types instead

## Code Review Checklist

Before submitting code, verify:

- [ ] TypeScript types properly defined
- [ ] Classes used for structured components
- [ ] Arrow functions used for utilities/singletons
- [ ] No map/filter/forEach in performance paths
- [ ] All comparisons are explicit (===, !==)
- [ ] Early returns implemented
- [ ] No nesting beyond 3 levels
- [ ] Objects reused, not recreated
- [ ] Typed arrays used for numeric data
- [ ] Buffers pre-allocated and reused
- [ ] No safety checks or validation
- [ ] Property access optimized
- [ ] Bit operations used where applicable
- [ ] Unit tests added for new code
- [ ] Visual regression tests added for rendering features
- [ ] All tests passing (`pnpm test`)
- [ ] No `if`, `else`, or `?:` in fragment shaders — use `step()`/`mix()`/`clamp()` arithmetic
- [ ] All non-void GLSL functions have a `return` on every code path
- [ ] No `discard` in fragment shaders
- [ ] No sampler array indexed by a varying or non-constant expression
- [ ] Varying count does not exceed 8 vec4-equivalents per shader
- [ ] No `gl.getError()`, `readPixels`, or FBO switches in hot paths

## Common Patterns to Follow

Look at these files for reference patterns:

- Core classes - Class-based component structure
- Shader modules - Utility/singleton pattern
- Texture management - Resource pooling and caching

Remember: This is a rendering engine for constrained environments. Every microsecond counts. When in doubt, optimize for performance over everything else.

## Code Review Instructions

When performing a code review on a pull request, enforce the following:

### Flag as required changes

- Any `forEach`, `map`, `filter`, `reduce`, or `find` calls in files under `src/core/` or in any render/update loop
- Object literals (`{}`) created inside loops or functions called per-frame
- Truthy/falsy checks on values that should use explicit `=== null`, `=== 0`, `=== false` etc.
- Nesting depth beyond 3 levels — request flattening via early returns
- Use of `delete` operator — request setting to `null` or `undefined` instead
- JSDoc comments added to TypeScript code — request conversion to TypeScript types
- `try/catch` inside hot paths — request pre-condition guards instead
- Any `if`, `else`, or ternary `?:` operator in a **fragment shader** — request replacement with `step()`/`mix()`/`clamp()` arithmetic equivalents
- Any non-void GLSL function that can exit without a `return` statement — request a final unconditional `return` to eliminate undefined behavior
- `discard` in a fragment shader — request replacement with a `mix()` to `vec4(0.0)` or alpha-zero result
- A sampler array indexed by a varying or any non-compile-time-constant expression — request a compile-time-unrolled `if/else` chain or a shader restructure
- Varying count exceeding 8 vec4-equivalents in a single shader program — request packing or removal of varyings
- `gl.getError()`, `readPixels`, or framebuffer object switches inside a render or update loop

### Flag as missing test coverage

- New `.ts` source files in `src/` without a corresponding `.test.ts` file
- Bug fixes that don't include a regression test covering the fixed case
- Any changes to shader code, rendering pipeline, layout logic, text rendering, animation, or visual output without an updated or new test in `examples/tests/`

### Do NOT flag

- Lack of input validation — zero safety checks is intentional policy
- Terse variable names in tight loops
- Direct typed array buffer manipulation
- Missing error handling in internal utilities
