import type { RenderProps } from '../renderProperties.js';
import type { MainNode } from './MainNode.js';

export interface IRenderDriver {
  init(canvas: HTMLCanvasElement): Promise<void>;
  createPrimitiveRaw(primitive: MainNode): void;
  mutatePrimitiveRaw(
    primitive: MainNode,
    mutations: Partial<RenderProps>,
  ): void;
  destroyPrimitiveRaw(primitive: MainNode): void;

  onCreatePrimitive(primitive: MainNode): void;
  onDestroyPrimitive(primitive: MainNode): void;
}
