import type { QuadOptions } from '../CoreRenderer.js';
import type { CoreShaderConfig } from '../CoreShaderNode.js';
import type { CoreShaderProgram } from '../CoreShaderProgram.js';
import type { CanvasCoreRenderer } from './CanvasCoreRenderer.js';

export type CanvasShaderConfig<T = Record<string, unknown>> =
  CoreShaderConfig<T> & {
    render: (
      ctx: CanvasRenderingContext2D,
      quad: QuadOptions,
      props: Record<string, unknown>,
      renderContext: () => void,
    ) => void;
    /**
     * Set this to true when using ctx functions that scale, clip, rotate, etc..
     */
    saveAndRestore?: boolean;
  };

export class CanvasShaderProgram implements CoreShaderProgram {
  attach: undefined;
  detach: undefined;

  saveAndRestore: boolean;
  render: CanvasShaderConfig['render'];

  constructor(
    readonly renderer: CanvasCoreRenderer,
    config: CanvasShaderConfig,
  ) {
    this.saveAndRestore = config.saveAndRestore || false;
    this.render = config.render;
  }
}
