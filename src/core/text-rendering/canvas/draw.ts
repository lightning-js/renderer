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
import { calcHeight, measureText } from './Utils.js';
import type { RenderInfo } from './calculateRenderInfo.js';
import type { LineType } from './calculateRenderInfo.js';
import { normalizeCanvasColor } from '../../lib/colorCache.js';

const MAX_TEXTURE_DIMENSION = 4096;

export const draw = (
  canvas: OffscreenCanvas | HTMLCanvasElement,
  context: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  renderInfo: RenderInfo,
  linesOverride?: { lines: string[]; lineWidths: number[] },
) => {
  const fontSize = renderInfo.fontSize;
  const lineHeight = renderInfo.lineHeight as number;
  const precision = renderInfo.precision;
  const lines = linesOverride?.lines || renderInfo.lines;
  const lineWidths = linesOverride?.lineWidths || renderInfo.lineWidths;
  const height =
    linesOverride !== undefined
      ? calcHeight(
          renderInfo.textBaseline,
          fontSize,
          lineHeight,
          linesOverride.lines.length,
          0,
        )
      : renderInfo.height;

  // Add extra margin to prevent issue with clipped text when scaling.
  canvas.width = Math.min(
    Math.ceil(renderInfo.width + renderInfo.textRenderIssueMargin),
    MAX_TEXTURE_DIMENSION,
  );
  canvas.height = Math.min(Math.ceil(height), MAX_TEXTURE_DIMENSION);

  // Canvas context has been reset.
  context.font = `${renderInfo.fontStyle} ${fontSize}px ${renderInfo.fontFamily}`;
  context.textBaseline = renderInfo.textBaseline;

  if (fontSize >= 128) {
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
  const ascenderPx = metrics ? metrics.ascender * fontSize : fontSize;
  const bareLineHeightPx = metrics
    ? (metrics.ascender - metrics.descender) * fontSize
    : fontSize;

  for (let i = 0, n = lines.length; i < n; i++) {
    linePositionX = i === 0 ? renderInfo.textIndent : 0;
    linePositionY = i * lineHeight + ascenderPx;
    if (renderInfo.verticalAlign == 'middle') {
      linePositionY += (lineHeight - bareLineHeightPx) / 2;
    } else if (renderInfo.verticalAlign == 'bottom') {
      linePositionY += lineHeight - bareLineHeightPx;
    }
    if (renderInfo.textAlign === 'right') {
      linePositionX += renderInfo.innerWidth - lineWidths[i]!;
    } else if (renderInfo.textAlign === 'center') {
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
  if (renderInfo.highlight) {
    const color = renderInfo.highlightColor;
    const hlHeight = renderInfo.highlightHeight * precision || fontSize * 1.5;
    const offset = renderInfo.highlightOffset * precision;
    const hlPaddingLeft =
      renderInfo.highlightPaddingLeft !== null
        ? renderInfo.highlightPaddingLeft * precision
        : renderInfo.paddingLeft;
    const hlPaddingRight =
      renderInfo.highlightPaddingRight !== null
        ? renderInfo.highlightPaddingRight * precision
        : renderInfo.paddingRight;
    context.fillStyle = normalizeCanvasColor(color);
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
  if (renderInfo.shadow) {
    prevShadowSettings = [
      context.shadowColor,
      context.shadowOffsetX,
      context.shadowOffsetY,
      context.shadowBlur,
    ];
    context.shadowColor = normalizeCanvasColor(renderInfo.shadowColor);
    context.shadowOffsetX = renderInfo.shadowOffsetX * precision;
    context.shadowOffsetY = renderInfo.shadowOffsetY * precision;
    context.shadowBlur = renderInfo.shadowBlur * precision;
  }

  context.fillStyle = normalizeCanvasColor(renderInfo.textColor);
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
