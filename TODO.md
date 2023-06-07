# Abstraction

- [x] Remove need for Stage.ready promise
  - Nodes need to wait for this before getting textures which is clunky
  - [x] Improve how the root node is created for both Main/ThreadX driver modes
- [x] Add cacheKey to CoreTexture for easier debugging
- [ ] Finish decoupling WebGL from Core
  - [x] Move platform.ts / texture.ts / renderer.ts logic into abstraction
- [ ] Port and remaining logic to the abstraction from the following files an
      then delete them - renderer.ts - platform.ts - gpu/webgl/\*
- [x] Move addQuad logic for rendering nodes into the nodes themselves.
- [x] Improve the interface that decides whether the render op can handle a new
      addition.
- [x] Get batched rendering working again
- [x] Move abstraction files to a better place
- [x] Decouple the core rendering node implementation as a new `CoreNode` class
  - `CoreNode` is a single implementation of a node in the "Core" of the
    renderer. Previously we implemented this individually in `MainOnlyNode` and
    `ThreadXRendererNode`. But that led to some limitations and duplication of
    code.
- [ ] Add support for `null` texture
  - `null` texture should just be interpreted as the white pixel texture
- [ ] Create mechanism that transforms Scene Graph into a flat array of nodes
      ordered by their layering.
- [ ] Implement RTT

# Animations

- [x] Numeric properties
- [x] Duration
- [x] Start / Stop
- [x] Pause / Resume
- [x] waitUntilStopped
- [x] Animation state
- [ ] Fix issue where you have to use a setTimeout() before starting animations with the ThreadX Driver
- [ ] Repeat

# Bugs

- [x] Fix issue where if the same image URL is used immediately twice the image doesn't appear

# Textures

- [x] Create texture abstraction at two levels:
  - A `Texture` abstract base that contains a method for loading arbitrary pixel
    data (in the form of ImageBitmap to start).
    - This base and its concrete implementations are coupled only to pure Web
      APIs fetching, and loading image data. Not to any specific canvas context.
  - A `CoreContextTexture` abstract base whose concrete implementations wrap
    context native texture data.
    - The concrete implementations of this base are coupled to a specific
      canvas context (i.e. WebGL, Canvas2D or WebGPU)
    - This class is constrcted with a `Texture` which is used to load itself
      when needed.
- [x] Texture Manager: When `Texture` instances are garbage collected, their
      corresponding `CoreContextTextures` are garbage collected
- [x] Texture Manager: Ability to register Texture types
- [x] Texture Manager: Load textures based on Texture type name and properties
- [x] INode: Allow textures to be specified by a descriptor type
- [ ] Texture Manager: Garbage Collection
  - Implement system that keeps track of `CoreContextTexture` usage and allows
    for unused textures to be garbage collected when a memory threshold is hit
- [ ] Texture: Allow textures to be marked as "permanent" so that they are never
      garbage collected.
- [ ] Resolve "GL_INVALID_OPERATION: The texture is a non-power-of-two texture." warning

# Tech Debt

- [ ] Refactor: Replace the use of Proxy() in ThreadXRendererNode with something nicer.
- [ ] Refactor: Extract EventEmitter code (found in MainOnlyNode / CoreAnimation) into its own mixin
      with unit tests [help wanted]
- [ ] Tests: Frame-by-frame tests for Animations
- [ ] Tests: Unit tests for animations
- [ ] Look through TODO comments
- [ ] Make "Stage" into a class

- SharedObjects that don't share data??

# Future

- [ ] Layout Engine / Flex Box / Grid / ???
