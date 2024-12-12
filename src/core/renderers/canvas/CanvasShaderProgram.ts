import type { CoreShaderConfig } from '../CoreShaderNode.js';
import type { CoreShaderProgram } from '../CoreShaderProgram.js';
import type { CanvasCoreRenderer } from './CanvasCoreRenderer.js';

export type CanvasShaderConfig<T = Record<string, unknown>> =
  CoreShaderConfig<T> & CanvasShaderProgram;

export interface CanvasShaderProgram {
  render: (ctx: CanvasRenderingContext2D, drawContent: () => void) => void;
  /**
   * Set this to true when using ctx functions that scale, clip, rotate, etc..
   */
  saveAndRestore?: boolean;
}

export class CanvasShaderProgram implements CoreShaderProgram {
  attach: undefined;
  detach: undefined;

  constructor(
    readonly renderer: CanvasCoreRenderer,
    config: CanvasShaderConfig,
  ) {
    this.render = config.render;
  }
}
