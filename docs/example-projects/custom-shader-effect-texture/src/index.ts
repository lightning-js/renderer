import { RendererMain } from '@lightningjs/renderer';
import { MyCustomEffect } from './MyCustomEffect.js';
import { MyCustomShader } from './MyCustomShader.js';
import { MyCustomTexture } from './MyCustomTexture.js';
import robotImg from './assets/robot.png';

(async () => {
  const renderer = new RendererMain(
    {
      appWidth: 1920,
      appHeight: 1080,
      boundsMargin: [100, 100, 100, 100],
      clearColor: 0x000000ff,
      fpsUpdateInterval: 1000,
      enableContextSpy: false,
      enableInspector: false,
      renderMode: 'webgl',
    },
    'app',
  );

  renderer.stage.shManager.registerShaderType('MyCustomShader', MyCustomShader);
  renderer.stage.shManager.registerEffectType('MyCustomEffect', MyCustomEffect);
  renderer.stage.txManager.registerTextureType(
    'MyCustomTexture',
    MyCustomTexture,
  );

  const distortedBot = renderer.createNode({
    width: 300,
    height: 300,
    src: robotImg,
    parent: renderer.root,
    shader: renderer.createShader('MyCustomShader', {
      normalized: true,
      topLeft: { x: 0.5, y: 0 },
      topRight: { x: 0.500001, y: 0 },
      bottomRight: { x: 1, y: 1 },
      bottomLeft: { x: 0, y: 1 },
    }),
  });

  const greyRobot = renderer.createNode({
    x: 300,
    width: 300,
    height: 300,
    parent: renderer.root,
    shader: renderer.createDynamicShader([
      renderer.createEffect(
        'MyCustomEffect',
        {
          amount: 1.0,
        },
        'custom',
      ),
    ]),
    src: robotImg,
  });

  const pacman = renderer.createNode({
    x: 600,
    width: 300,
    height: 300,
    texture: renderer.createTexture('MyCustomTexture', {
      percent: 5,
      width: 300,
      height: 300,
    }),
    parent: renderer.root,
  });
})().catch(console.error);
