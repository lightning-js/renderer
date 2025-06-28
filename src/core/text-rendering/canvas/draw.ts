/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2025 Comcast Cable Communications Management, LLC.
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

import { getRgbaString } from '../../lib/utils.js';
import { calcHeight, measureText } from './Utils.js';
import type { RenderInfo } from './calculateRenderInfo.js';
import type { Settings } from './Settings.js';
import type { LineType } from './calculateRenderInfo.js';

const MAX_TEXTURE_DIMENSION = 4096;

export const draw = ({
  canvas,
  context,
  renderInfo,
  settings,
  linesOverride,
}: {
  canvas: OffscreenCanvas | HTMLCanvasElement;
  context: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
  renderInfo: RenderInfo;
  settings: Settings;
  linesOverride?: { lines: string[]; lineWidths: number[] };
}) => {
  const precision = settings.precision;
  const lines = linesOverride?.lines || renderInfo.lines;
  const lineWidths = linesOverride?.lineWidths || renderInfo.lineWidths;
  const height = linesOverride
    ? calcHeight(
        settings.textBaseline,
        renderInfo.fontSize,
        renderInfo.lineHeight,
        linesOverride.lines.length,
        settings.offsetY === null ? null : settings.offsetY * precision,
      )
    : renderInfo.height;

  // Add extra margin to prevent issue with clipped text when scaling.
  canvas.width = Math.min(
    Math.ceil(renderInfo.width + settings.textRenderIssueMargin),
    MAX_TEXTURE_DIMENSION,
  );
  canvas.height = Math.min(Math.ceil(height), MAX_TEXTURE_DIMENSION);

  // Canvas context has been reset.
  context.font = `${settings.fontStyle} ${renderInfo.fontSize}px ${settings.fontFamily}`;
  context.textBaseline = settings.textBaseline;

  if (renderInfo.fontSize >= 128) {
    context.globalAlpha = 0.01;
    context.fillRect(0, 0, 0.01, 0.01);
    context.globalAlpha = 1.0;
  }

  if (renderInfo.cutSx || renderInfo.cutSy) {
    context.translate(-renderInfo.cutSx, -renderInfo.cutSy);
  }

  let linePositionX: number;
  let linePositionY: number;
  const drawLines: LineType[] = [];
  const metrics = renderInfo.metrics;
  const ascenderPx = metrics
    ? metrics.ascender * renderInfo.fontSize
    : renderInfo.fontSize;
  const bareLineHeightPx = metrics
    ? (metrics.ascender - metrics.descender) * renderInfo.fontSize
    : renderInfo.fontSize;

  for (let i = 0, n = lines.length; i < n; i++) {
    linePositionX = i === 0 ? renderInfo.textIndent : 0;
    linePositionY = i * renderInfo.lineHeight + ascenderPx;
    if (settings.verticalAlign == 'middle') {
      linePositionY += (renderInfo.lineHeight - bareLineHeightPx) / 2;
    } else if (settings.verticalAlign == 'bottom') {
      linePositionY += renderInfo.lineHeight - bareLineHeightPx;
    }
    if (settings.textAlign === 'right') {
      linePositionX += renderInfo.innerWidth - lineWidths[i]!;
    } else if (settings.textAlign === 'center') {
      linePositionX += (renderInfo.innerWidth - lineWidths[i]!) / 2;
    }
    linePositionX += renderInfo.paddingLeft;
    drawLines.push({
      text: lines[i]!,
      x: linePositionX,
      y: linePositionY,
      w: lineWidths[i]!,
    });
  }

  // Highlight
  if (settings.highlight) {
    const color = settings.highlightColor;
    const hlHeight =
      settings.highlightHeight * precision || renderInfo.fontSize * 1.5;
    const offset = settings.highlightOffset * precision;
    const hlPaddingLeft =
      settings.highlightPaddingLeft !== null
        ? settings.highlightPaddingLeft * precision
        : renderInfo.paddingLeft;
    const hlPaddingRight =
      settings.highlightPaddingRight !== null
        ? settings.highlightPaddingRight * precision
        : renderInfo.paddingRight;
    context.fillStyle = getRgbaString(color);
    for (let i = 0; i < drawLines.length; i++) {
      const drawLine = drawLines[i]!;
      context.fillRect(
        drawLine.x - hlPaddingLeft,
        drawLine.y - renderInfo.offsetY + offset,
        drawLine.w + hlPaddingRight + hlPaddingLeft,
        hlHeight,
      );
    }
  }

  // Text shadow
  let prevShadowSettings: null | [string, number, number, number] = null;
  if (settings.shadow) {
    prevShadowSettings = [
      context.shadowColor,
      context.shadowOffsetX,
      context.shadowOffsetY,
      context.shadowBlur,
    ];
    context.shadowColor = getRgbaString(settings.shadowColor);
    context.shadowOffsetX = settings.shadowOffsetX * precision;
    context.shadowOffsetY = settings.shadowOffsetY * precision;
    context.shadowBlur = settings.shadowBlur * precision;
  }

  context.fillStyle = getRgbaString(settings.textColor);
  for (let i = 0, n = drawLines.length; i < n; i++) {
    const drawLine = drawLines[i]!;
    if (renderInfo.letterSpacing === 0) {
      context.fillText(drawLine.text, drawLine.x, drawLine.y);
    } else {
      const textSplit = drawLine.text.split('');
      let x = drawLine.x;
      for (let i = 0, j = textSplit.length; i < j; i++) {
        context.fillText(textSplit[i]!, x, drawLine.y);
        x += measureText(context, textSplit[i]!, renderInfo.letterSpacing);
      }
    }
  }

  if (prevShadowSettings) {
    context.shadowColor = prevShadowSettings[0];
    context.shadowOffsetX = prevShadowSettings[1];
    context.shadowOffsetY = prevShadowSettings[2];
    context.shadowBlur = prevShadowSettings[3];
  }

  if (renderInfo.cutSx || renderInfo.cutSy) {
    context.translate(renderInfo.cutSx, renderInfo.cutSy);
  }
};
