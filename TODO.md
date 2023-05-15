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
- [ ] Add support for `null` texture
  - `null` texture should just be interpreted as the white pixel texture
- [ ] Create mechanism that transforms Scene Graph into a flat array of nodes
      ordered by their layering.
- [ ] Implement RTT
