# Abstraction

- [x] Remove need for Stage.ready promise
  - Nodes need to wait for this before getting textures which is clunky
  - [x] Improve how the root node is created for both Main/ThreadX driver modes
- [x] Add cacheKey to CoreTexture for easier debugging
- [ ] Finish decoupling WebGL from Core
  - [x] Move platform.ts / texture.ts / renderer.ts logic into abstraction
- [x] Port and remaining logic to the abstraction from the following files an
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
- [x] Add support for `null` texture
  - `null` texture should just be interpreted as the white pixel texture

# Renderer Core

- [ ] Create mechanism that transforms Scene Graph into a flat array of nodes
      ordered by their layering.
- [ ] Implement RTT
- [x] Implement resolution specification + precision

# Animations

- [x] Numeric properties
- [x] Duration
- [x] Start / Stop
- [x] Pause / Resume
- [x] waitUntilStopped
- [x] Animation state
- [x] Fix issue where you have to use a setTimeout() before starting animations with the ThreadX Driver
- [ ] Repeat

# Bugs

- [x] Fix issue where if the same image URL is used immediately twice the image doesn't appear
- [ ] ThreadX(WPE): Fix wait() exception on main worker !!!
  - WPE produces a different error string than Chrome. So we don't handle the wait() operation properly.
    - WPE: "Atomics.wait cannot be called from the current thread."
    - Chrome: "Atomics.wait cannot be called in this context"

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
- [x] SubTextures
- [ ] Texture Manager: Context Texture Garbage Collection
  - Implement system that keeps track of `CoreContextTexture` usage and allows
    for unused textures to be NATIVELY garbage collected when a memory threshold is hit.
    Can iterate over the `Texture`s in the cache, retrieve the corresponding
    `CoreContextTexture` and call `free()` on it. Done. We can also check if
    the Texture is on screen and only free those in a Critical GC.
  - **Critical GC**: Garbage collection that occurs when Texture memory usage
    reaches above a Critical Threshold. It should free all native textures
    immediately and offer the App the chance to modify the render tree before
    attempting to render the next frame. This allows an App to tear down its
    UI, hopefully free up a ton of texture memory and display an error message
    that allows the user to start again from the home screen. This should
    prevent Apps from crashing.
- [ ] Texture Manager: Texture Source Garbage Collection
  - Texture Source (`Texture` class) objects are cached in two `Map`s:
    one by their Cache Key string and one by the ID of the `TextureDesc`. Since
    these caches are keyed by strings/numbers, their coressponding `Texture`
    instance is permanently bound to key in the Maps. In order to clean them up
    we need to know when the `TextureDesc` object(s) that rely on these cache
    entries are GC'd. We can use the `FinalizationRegistry` to find out when a
    `TextureDesc` instance is GC'd and then using it's `id` delete the ID cache
    entry and then finally the Cache Key cache entry when all the ID cache entries
    that correspond to the Cache Key are removed.
    There is allows us to keep a strict 1-to-1 relationship between a
    `Texture` and it's corresponding `CoreContextTexture`! And that in turn is
    a sort of automatic non-emergency garbage collection. When a `Texture` is
    garbage collected that allows coresponding `CoreContextTexture` to be freed.
    That in turn allows the native context texture to be freed.
    - `CoreContextTexture` should ONLY be kept alive by a single `Texture` instance
    - MAKE SURE to check if a `Texture` is referenced by a `SubTexture` before
      before removing its Cache Key entry. If this is not done, it could lead
      to multiple instances of a `Texture` existing for a single Cache Key
- [ ] Texture: Allow textures to be marked as "permanent" so that they are never
      garbage collected.
- [ ] Resolve "GL_INVALID_OPERATION: The texture is a non-power-of-two texture." warning
- [ ] Ability for CtxTexture to communicate width/height to the Texture
- [ ] Implement Texture Core Animations
  - Frame-by-frame animate over an array of `Texture`s. Animation handled in
    the Core. (Currently possible to do this manually via the Main thread)
- [x] SubTexture: Allow X/Y mirror flipping of the texture coordinates
- [x] Texture Manager: ID Cache Map
  - Add "ID" to `TextureDesc` and use it as a first level cache for a `Texture`
- [x] SubTexture: Make cacheable
  - Via ID Cache Map
- [ ] Texture Compression support

# Tech Debt

- [ ] Refactor: Replace the use of Proxy() in ThreadXRendererNode with something nicer.
- [ ] Refactor: Extract EventEmitter code (found in MainOnlyNode / CoreAnimation) into its own mixin
      with unit tests [help wanted]
- [ ] Tests: Frame-by-frame tests for Animations
- [ ] Tests: Unit tests for animations
- [ ] Look through TODO comments
- [x] Make "Stage" into a class
- [x] Merge "Application" into "Stage"

  - Does not seem to be any need for an Application class in the current model

- SharedObjects that don't share data??

# Future

- [ ] Layout Engine / Flex Box / Grid / ???
