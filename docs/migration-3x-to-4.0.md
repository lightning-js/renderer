# Migration Guide 3.x to 4.0

This guide documents breaking changes introduced in version 4.0.

## Breaking Changes

### 1) Animation exports removed from package root

The following root exports were removed from `@lightningjs/renderer`:

- `IAnimationController`
- `AnimationSettings`
- `AnimationManager`

Use the `@lightningjs/renderer/animation` subpath instead.

Before:

```ts
import type {
  IAnimationController,
  AnimationSettings,
  AnimationManager,
} from '@lightningjs/renderer';
```

After:

```ts
import type {
  IAnimationController,
  AnimationSettings,
  AnimationManager,
} from '@lightningjs/renderer/animation';
```

Why this is breaking:

- Existing root imports fail at compile time once those symbols are no longer exported from the package root.

### 2) AnimationManager no longer available in core package.

We removed the AnimationManager from the main loop, this allows developers to implement an animation library of their choice. See [ANIMATION.md](./ANIMATION.md) to learn how to do this.

### 3) Node.animate removed.

Since the animation manager is removed from the core package this also means that the animate function on the CoreNode is removed. Below you'll find ways how to animate important values. We'll use the AnimationManager used in [ANIMATION.md](./ANIMATION.md)

Node animations.

before:

```ts
Node.animate(
  {
    x: 20,
    //othervalues
  },
  {
    duration: 200,
  },
).start();
```

after:

```ts
animationManager
  .animate(
    node,
    {
      x: 20,
    },
    {
      duration: 200,
    },
  )
  .start();
```

Shader animations:

before:

```ts
Node.animate(
  {
    shaderProps: {
      radius: 300,
    },
  },
  {
    duration: 200,
  },
).start();
```

after:

```ts
animationManager
  .animate(
    node.shader.props,
    {
      x: 20,
    },
    {
      duration: 200,
    },
  )
  .start();
```
