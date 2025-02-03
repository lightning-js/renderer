import { type Stage } from '@lightningjs/renderer';

export async function installShaders(stage: Stage, renderMode: string) {
  let shaders;
  if (renderMode === 'webgl') {
    shaders = await import('@lightningjs/renderer/webgl/shaders');
  } else if (renderMode === 'canvas') {
    shaders = await import('@lightningjs/renderer/canvas/shaders');
  }
  stage.shManager.registerShaderType('Rounded', shaders.Rounded);
  stage.shManager.registerShaderType(
    'RoundedWithBorder',
    shaders.RoundedWithBorder,
  );
  stage.shManager.registerShaderType(
    'RoundedWithShadow',
    shaders.RoundedWithShadow,
  );
  stage.shManager.registerShaderType(
    'RoundedWithBorderAndShadow',
    shaders.RoundedWithBorderAndShadow,
  );
  stage.shManager.registerShaderType('Border', shaders.Border);
  stage.shManager.registerShaderType('Shadow', shaders.Shadow);
  stage.shManager.registerShaderType('HolePunch', shaders.HolePunch);
  stage.shManager.registerShaderType('RadialGradient', shaders.RadialGradient);
  stage.shManager.registerShaderType('LinearGradient', shaders.LinearGradient);
}
