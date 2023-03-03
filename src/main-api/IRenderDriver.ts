import type { RenderProps } from '../renderProperties.js';
import { Primitive } from './Primitive.js';

export interface IRenderDriver {
  init(canvas: HTMLCanvasElement): Promise<void>;
  createPrimitiveRaw(primitive: Primitive): void;
  mutatePrimitiveRaw(
    primitive: Primitive,
    mutations: Partial<RenderProps>,
  ): void;
  destroyPrimitiveRaw(primitive: Primitive): void;

  onCreatePrimitive(primitive: Primitive): void;
  onDestroyPrimitive(primitive: Primitive): void;
}
