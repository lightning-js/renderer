# Animation

The renderer allows you to bring your own animation library. This page will teach you how to attach an Animation library to the renderer.

Don't know what library to use? The animation manager used in 3.2 and versions below is easily attached. In fact it will be used as example on this page.

## Attach your Animation Library

Renderer AnimationManager:

```ts
import { RendererMain } from '@lightningjs/renderer';
import { AnimationManager } from '@lightningjs/renderer/animation';

const renderer = new RendererMain(settings, 'app');
const animationManager = new AnimationManager(renderer.stage);

renderer.on('frameTick', (target: RendererMain, payload: FrameTickPayload) => {
  // Update the animation manager with the delta time
  animationManager.update(payload.delta);
});
```

or for example Animejs:

```ts
import { RendererMain } from '@lightningjs/renderer';
import { engine } from 'animejs';

const renderer = new RendererMain(settings, 'app');
//Turn this off so the engine does not trigger the update more than the frameTicks come through
engine.useDefaultMainLoop = false;

renderer.on('frameTick', (target: RendererMain, payload: FrameTickPayload) => {
  engine.update();
});
```

## Animating CoreNode and Shader

You can animate the CoreNode and its shader by using these values:

**CoreNode**

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

**Shader Props**

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

## Animation aware texture processing

On the `Stage` there is a unified animation reference counter that throttles texture uploads during animations to preserve the frame budget on embedded devices.

For the AnimationManager from `@lightningjs/renderer/animation` this has already been built in. Below you'll find an example on how to implement this using `AnimeJS`

```ts
import { animate, createTimeline } from 'animejs';

animate(node, {
  x: 30,
  duration: 300,
  onBegin: () => renderer.registerAnimation(),
  onComplete: () => renderer.unregisterAnimation(),
});

//or

createTimeline({
  onBegin: () => renderer.registerAnimation(),
  onComplete: () => renderer.unregisterAnimation(),
});
```
