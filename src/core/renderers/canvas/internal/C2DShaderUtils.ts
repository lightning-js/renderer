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

import {
  ROUNDED_RECTANGLE_SHADER_TYPE,
  UnsupportedShader,
} from '../shaders/UnsupportedShader.js';
import { formatRgba, parseColorRgba } from './ColorUtils.js';

type Direction = 'Top' | 'Right' | 'Bottom' | 'Left';

/*
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

export function roundRect(
  this: CanvasRenderingContext2D | Path2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | DOMPointInit | (number | DOMPointInit)[],
) {
  const context = Object.getPrototypeOf(this) as Path2D;
  if (!context.roundRect) {
    const fixOverlappingCorners = (radii: {
      topLeft: number;
      topRight: number;
      bottomRight: number;
      bottomLeft: number;
    }) => {
      const maxRadius = Math.min(width / 2, height / 2);
      const totalHorizontal =
        radii.topLeft + radii.topRight + radii.bottomRight + radii.bottomLeft;

      if (totalHorizontal > width || totalHorizontal > height) {
        const scale =
          maxRadius /
          Math.max(
            radii.topLeft,
            radii.topRight,
            radii.bottomRight,
            radii.bottomLeft,
          );
        radii.topLeft *= scale;
        radii.topRight *= scale;
        radii.bottomRight *= scale;
        radii.bottomLeft *= scale;
      }
    };
    const radii =
      typeof radius === 'number'
        ? {
            topLeft: radius,
            topRight: radius,
            bottomRight: radius,
            bottomLeft: radius,
          }
        : { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0, ...radius };

    fixOverlappingCorners(radii);

    this.moveTo(x + radii.topLeft, y);
    this.lineTo(x + width - radii.topRight, y);
    this.ellipse(
      x + width - radii.topRight,
      y + radii.topRight,
      radii.topRight,
      radii.topRight,
      0,
      1.5 * Math.PI,
      2 * Math.PI,
    );
    this.lineTo(x + width, y + height - radii.bottomRight);
    this.ellipse(
      x + width - radii.bottomRight,
      y + height - radii.bottomRight,
      radii.bottomRight,
      radii.bottomRight,
      0,
      0,
      0.5 * Math.PI,
    );
    this.lineTo(x + radii.bottomLeft, y + height);
    this.ellipse(
      x + radii.bottomLeft,
      y + height - radii.bottomLeft,
      radii.bottomLeft,
      radii.bottomLeft,
      0,
      0.5 * Math.PI,
      Math.PI,
    );
    this.lineTo(x, y + radii.topLeft);
    this.ellipse(
      x + radii.topLeft,
      y + radii.topLeft,
      radii.topLeft,
      radii.topLeft,
      0,
      Math.PI,
      1.5 * Math.PI,
    );
  } else {
    this.roundRect(x, y, width, height, radius);
  }
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
*/
