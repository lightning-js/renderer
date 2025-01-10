import { type Stage } from '@lightningjs/renderer';

export async function installShaders(stage: Stage, renderMode: string) {
  const shaders = await import(`@lightningjs/renderer/webgl/shaders`);
  stage.shManager.registerShaderType(
    'RoundedRectangle',
    shaders.RoundedRectangle,
  );
  stage.shManager.registerShaderType('Border', shaders.Border);
}
