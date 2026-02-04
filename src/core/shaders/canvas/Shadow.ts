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

import type { CanvasShaderType } from '../../renderers/canvas/CanvasShaderNode.js';
import type { Vec4 } from '../../renderers/webgl/internal/ShaderUtils.js';
import {
  ShadowTemplate,
  type ShadowProps,
} from '../templates/ShadowTemplate.js';
import { shadow } from './utils/render.js';

export interface ComputedShadowValues {
  shadowColor: string;
  shadowRadius: Vec4;
}

export const Shadow: CanvasShaderType<ShadowProps, ComputedShadowValues> = {
  props: ShadowTemplate.props,
  update() {
    this.computed.shadowColor = this.toColorString(this.props!['color']);
    const blur = this.props!['blur'];
    this.computed.shadowRadius = [blur, blur, blur, blur];
  },
  render(ctx, node, renderContext) {
    const { tx, ty } = node.globalTransform!;
    const { w, h } = node.props;
    shadow(
      ctx,
      tx,
      ty,
      w,
      h,
      this.computed.shadowColor!,
      this.props!['projection'],
      this.computed.shadowRadius!,
      this.stage.pixelRatio,
    );
    renderContext();
  },
};
