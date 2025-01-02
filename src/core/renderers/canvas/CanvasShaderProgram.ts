import type { QuadOptions } from '../CoreRenderer.js';
import type { CoreShaderType } from '../CoreShaderNode.js';
import type { CoreShaderProgram } from '../CoreShaderProgram.js';
import type { CanvasCoreRenderer } from './CanvasCoreRenderer.js';

export type CanvasShaderType<T extends object = Record<string, unknown>> =
  CoreShaderType<T> & {
    render: (
      ctx: CanvasRenderingContext2D,
      quad: QuadOptions,
      props: Record<string, unknown> | undefined,
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
  render: CanvasShaderType['render'];

  constructor(readonly renderer: CanvasCoreRenderer, config: CanvasShaderType) {
    this.saveAndRestore = config.saveAndRestore || false;
    this.render = config.render;
  }
}
