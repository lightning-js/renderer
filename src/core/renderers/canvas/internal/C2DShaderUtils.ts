/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast Cable Communications Management, LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the License);
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
 */

import type { QuadOptions } from '../../CoreRenderer.js';
import type { BorderEffectProps } from '../../webgl/shaders/effects/BorderEffect.js';
import type { RadiusEffectProps } from '../../webgl/shaders/effects/RadiusEffect.js';
import type { EffectDescUnion } from '../../webgl/shaders/effects/ShaderEffect.js';
import {
  ROUNDED_RECTANGLE_SHADER_TYPE,
  UnsupportedShader,
} from '../shaders/UnsupportedShader.js';
import { formatRgba, parseColorRgba } from './ColorUtils.js';

type Direction = 'Top' | 'Right' | 'Bottom' | 'Left';

/**
 * Extract `RoundedRectangle` shader radius to apply as a clipping
 */
export function getRadius(quad: QuadOptions): RadiusEffectProps['radius'] {
  if (quad.shader instanceof UnsupportedShader) {
    const shType = quad.shader.shType;
    if (shType === ROUNDED_RECTANGLE_SHADER_TYPE) {
      return (quad.shaderProps?.radius as number) ?? 0;
    } else if (shType === 'DynamicShader') {
      const effects = quad.shaderProps?.effects as
        | EffectDescUnion[]
        | undefined;

      if (effects) {
        const effect = effects.find((effect: EffectDescUnion) => {
          return effect.type === 'radius' && effect?.props?.radius;
        });

        return (effect && effect.type === 'radius' && effect.props.radius) || 0;
      }
    }
  }
  return 0;
}

/**
 * Extract `RoundedRectangle` shader radius to apply as a clipping */
export function getBorder(
  quad: QuadOptions,
  direction: '' | Direction = '',
): BorderEffectProps | undefined {
  if (quad.shader instanceof UnsupportedShader) {
    const shType = quad.shader.shType;
    if (shType === 'DynamicShader') {
      const effects = quad.shaderProps?.effects as
        | EffectDescUnion[]
        | undefined;

      if (effects && effects.length) {
        const effect = effects.find((effect: EffectDescUnion) => {
          return (
            effect.type === `border${direction}` &&
            effect.props &&
            effect.props.width
          );
        });

        return effect && effect.props;
      }
    }
  }

  return undefined;
}

export function strokeLine(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  lineWidth = 0,
  color: number | undefined,
  direction: Direction,
) {
  if (!lineWidth) {
    return;
  }

  let sx,
    sy = 0;
  let ex,
    ey = 0;

  switch (direction) {
    case 'Top':
      sx = x;
      sy = y;
      ex = width + x;
      ey = y;
      break;
    case 'Right':
      sx = x + width;
      sy = y;
      ex = x + width;
      ey = y + height;
      break;
    case 'Bottom':
      sx = x;
      sy = y + height;
      ex = x + width;
      ey = y + height;
      break;
    case 'Left':
      sx = x;
      sy = y;
      ex = x;
      ey = y + height;
      break;
  }
  ctx.beginPath();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = formatRgba(parseColorRgba(color ?? 0));
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.stroke();
}
