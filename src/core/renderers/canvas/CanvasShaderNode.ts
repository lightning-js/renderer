import type { CoreNode } from '../../CoreNode.js';
import type { Stage } from '../../Stage.js';
import type { QuadOptions } from '../CoreRenderer.js';
import { CoreShaderNode, type CoreShaderType } from '../CoreShaderNode.js';
import type { CanvasRenderer } from './CanvasRenderer.js';

export type CanvasShaderType<T extends object = Record<string, unknown>> =
  CoreShaderType<T> & {
    render: (
      this: CanvasShaderNode<T>,
      ctx: CanvasRenderingContext2D,
      quad: QuadOptions,
      renderContext: () => void,
    ) => void;
    update?: (this: CanvasShaderNode<T>, node: CoreNode) => void;
    /**
     * Set this to true when using ctx functions that scale, clip, rotate, etc..
     */
    saveAndRestore?: boolean;
  };

export class CanvasShaderNode<
  Props extends object = Record<string, unknown>,
> extends CoreShaderNode<Props> {
  private updater: ((node: CoreNode, props?: Props) => void) | undefined =
    undefined;
  private valueKey: string = '';
  precomputed: Record<string, unknown> = {};
  applySNR: boolean;
  render: CanvasShaderType<Props>['render'];

  constructor(
    shaderKey: string,
    config: CanvasShaderType<Props>,
    stage: Stage,
    props?: Props,
  ) {
    super(shaderKey, config, stage, props);
    this.applySNR = config.saveAndRestore || false;
    this.render = config.render;
    if (config.update !== undefined) {
      this.updater = config.update!;
      if (this.props === undefined) {
        this.updater!(this.node as CoreNode, this.props);
        return;
      }

      this.update = () => {
        const prevKey = this.valueKey;
        this.valueKey = '';
        for (const key in this.resolvedProps) {
          this.valueKey += `${key}:${this.resolvedProps[key]!};`;
        }

        if (prevKey === this.valueKey) {
          return;
        }

        if (prevKey.length > 0) {
          this.stage.shManager.mutateShaderValueUsage(prevKey, -1);
        }

        const precomputed = this.stage.shManager.getShaderValues(
          this.valueKey,
        ) as Record<string, unknown>;
        if (precomputed !== undefined) {
          this.precomputed = precomputed;
        }
        this.precomputed = {};
        this.updater!(this.node as CoreNode);
        this.stage.shManager.setShaderValues(this.valueKey, this.precomputed);
      };
    }
  }

  toColorString(rgba: number) {
    return (this.stage.renderer as CanvasRenderer).getParsedColor(rgba, true);
  }
}
