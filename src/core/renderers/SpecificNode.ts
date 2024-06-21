import type { SpecificShaderRef } from '../../main-api/Renderer.js';
import type { CoreNode, CoreNodeWritableProps } from '../CoreNode.js';
import type { ShaderMap } from '../CoreShaderManager.js';
import type { ExtractProps } from '../CoreTextureManager.js';

// @ts-expect-error Allow the "incorrect" overriding of the shader properties
export interface SpecificNode<S extends keyof ShaderMap = 'DefaultShader'>
  extends CoreNode {
  shaderProps: ExtractProps<ShaderMap[S]>;
  shader: SpecificShaderRef<S>;
}

// @ts-expect-error Allow the "incorrect" overriding of the shader properties
export interface SpecificNodeWritableProps<
  S extends keyof ShaderMap = 'DefaultShader',
> extends CoreNodeWritableProps {
  shader: SpecificShaderRef<S>;
}
