/*
 * Copyright 2023 Comcast Cable Communications Management, LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CoreNode } from '../../CoreNode.js';
import type { Stage } from '../../Stage.js';
import type { QuadOptions } from '../CoreRenderer.js';
import { CoreShaderNode, type CoreShaderType } from '../CoreShaderNode.js';
import type { CanvasRenderer } from './CanvasRenderer.js';

export type CanvasShaderType<
  T extends object = Record<string, unknown>,
  C extends object = Record<string, unknown>,
> = CoreShaderType<T> & {
  render: (
    this: CanvasShaderNode<T, C>,
    ctx: CanvasRenderingContext2D,
    quad: QuadOptions,
    renderContext: () => void,
  ) => void;
  update?: (this: CanvasShaderNode<T, C>, node: CoreNode) => void;
  /**
   * Set this to true when using ctx functions that scale, clip, rotate, etc..
   */
  saveAndRestore?: boolean;
};

export class CanvasShaderNode<
  Props extends object = Record<string, unknown>,
  Computed extends object = Record<string, unknown>,
> extends CoreShaderNode<Props> {
  private updater: ((node: CoreNode, props?: Props) => void) | undefined =
    undefined;
  private valueKey: string = '';
  computed: Partial<Computed> = {};
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

        const computed = this.stage.shManager.getShaderValues(
          this.valueKey,
        ) as Record<string, unknown>;
        if (computed !== undefined) {
          this.computed = computed as Computed;
        }
        this.computed = {};
        this.updater!(this.node as CoreNode);
        this.stage.shManager.setShaderValues(this.valueKey, this.computed);
      };
    }
  }

  toColorString(rgba: number) {
    return (this.stage.renderer as CanvasRenderer).getParsedColor(rgba, true);
  }
}
