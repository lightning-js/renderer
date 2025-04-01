import { getRgbaString } from '../../../../lib/utils.js';
import {
  calcHeight,
  measureText
} from './utils.js';
import { parseRenderInfo } from './renderInfo.js';
import type { CoreTextNodeProps } from '../../../../CoreTextNodeCanvas.js';

const MAX_TEXTURE_DIMENSION = 2048;

export const draw = (
  props: CoreTextNodeProps,
  precision: number,
  canvas: HTMLCanvasElement,
  linesOverride?: { lines: string[]; lineWidths: number[] },
) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const context = canvas.getContext('2d')!;

  // get RenderInfo values
  const { renderInfo, settings } = parseRenderInfo(props, precision, context);

  // Allow lines to be overriden for partial rendering.
  const lines = linesOverride?.lines || renderInfo.lines;
  const lineWidths = linesOverride?.lineWidths || renderInfo.lineWidths;
  const height = linesOverride
    ? calcHeight(
        renderInfo.textBaseline,
        renderInfo.fontSize,
        renderInfo.lineHeight,
        linesOverride.lines.length
      )
    : renderInfo.height;

  // Add extra margin to prevent issue with clipped text when scaling.
  canvas.width = Math.min(
    Math.ceil(renderInfo.width + settings.textRenderIssueMargin),
    MAX_TEXTURE_DIMENSION,
  );
  canvas.height = Math.min(Math.ceil(height), MAX_TEXTURE_DIMENSION);

  // Canvas context has been reset.
  // @todo do we need this? also done at renderinfo?
  // this.setFontProperties();

  if (renderInfo.fontSize >= 128) {
    // WpeWebKit bug: must force compositing because cairo-traps-compositor will not work with text first.
    context.globalAlpha = 0.01;
    context.fillRect(0, 0, 0.01, 0.01);
    context.globalAlpha = 1.0;
  }

  if (renderInfo.cutSx || renderInfo.cutSy) {
    context.translate(-renderInfo.cutSx, -renderInfo.cutSy);
  }

  let linePositionX;
  let linePositionY;

  const drawLines = [];

  const { metrics } = renderInfo;

  /**
   * Ascender (in pixels)
   */
  const ascenderPx = metrics
    ? metrics.ascender * renderInfo.fontSize
    : renderInfo.fontSize;

  /**
   * Bare line height is the distance between the ascender and descender of the font.
   * without the line gap metric.
   */
  const bareLineHeightPx =
    (metrics.ascender - metrics.descender) * renderInfo.fontSize;

  // Draw lines line by line.
  for (let i = 0, n = lines.length; i < n; i++) {
    linePositionX = i === 0 ? renderInfo.textIndent : 0;

    // By default, text is aligned to top
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

  // Highlight.
  if (settings.highlight) {
    const color = settings.highlightColor;

    const hlHeight = settings.highlightHeight * precision || renderInfo.fontSize * 1.5;
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

  // Text shadow.
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
        x += measureText(textSplit[i]!, renderInfo.letterSpacing, context);
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
}


