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

import type {
  INode,
  INodeProps,
  ITextNode,
  RendererMain,
} from '@lightningjs/renderer';
import { Component } from './Component.js';

const MARGIN = 20;
const BAR_WIDTH = 20;
const BAR_HEIGHT = 300;
const INFO_TEXT_SIZE = 20;
const INFO_TEXT_LINEHEIGHT = INFO_TEXT_SIZE * 1.2;

function bytesToMb(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(2);
}

export interface MemMonitorProps extends Partial<INodeProps> {
  interval?: number;
}

export class MemMonitor extends Component {
  // private memTextNode: ITextNode;
  private bar: INode;
  private renderableMemBar: INode;
  private baseMemBar: INode;
  private memUsedBar: INode;
  private criticalText: ITextNode;
  private criticalTick: INode;
  private targetText: ITextNode;
  private targetTick: INode;
  private criticalInfoText: ITextNode;
  private targetInfoText: ITextNode;
  private baseInfoText: ITextNode;
  private memUsedText: ITextNode;
  private renderableMemUsedText: ITextNode;
  private cacheInfoText: ITextNode;
  private intervalHandle: NodeJS.Timeout | null = null;
  private _interval = 0;

  constructor(renderer: RendererMain, props: MemMonitorProps) {
    super(renderer, props);

    this.interval = props.interval || 500;
    this.node.color = 0xffffffaa;
    this.node.width = 400;
    this.node.height = BAR_HEIGHT + MARGIN * 2;

    this.bar = renderer.createNode({
      x: this.node.width - BAR_WIDTH - MARGIN,
      y: MARGIN,
      width: BAR_WIDTH,
      height: BAR_HEIGHT,
      parent: this.node,
      color: 0x00000000,
    });

    this.baseMemBar = renderer.createNode({
      x: 0,
      y: 0,
      width: BAR_WIDTH,
      height: 0,
      parent: this.bar,
      color: 0x808080ff,
    });

    this.memUsedBar = renderer.createNode({
      x: 0,
      y: 0,
      width: BAR_WIDTH,
      height: 0,
      parent: this.bar,
      color: 0x0000ffff,
    });

    this.renderableMemBar = renderer.createNode({
      x: 0,
      y: 0,
      width: BAR_WIDTH,
      height: 0,
      parent: this.bar,
      color: 0xff00ffff,
    });

    // Bar Frame
    renderer.createNode({
      width: BAR_WIDTH,
      height: BAR_HEIGHT,
      color: 0x00000000,
      shader: renderer.createShader('Border', {
        width: 4,
        color: 0x000000cc,
      }),
      parent: this.bar,
    });

    this.criticalText = renderer.createTextNode({
      x: -15,
      y: 0,
      text: 'Critical',
      fontFamily: 'Ubuntu',
      parent: this.bar,
      fontSize: 20,
      color: 0xff0000ff,
      mountX: 1,
      mountY: 0.5,
    });

    this.criticalTick = renderer.createNode({
      x: BAR_WIDTH / 2,
      y: 0,
      width: BAR_WIDTH * 2,
      height: 2,
      parent: this.bar,
      color: 0xff0000ff,
      mount: 0.5,
    });

    this.targetText = renderer.createTextNode({
      x: -15,
      y: 0,
      text: 'Target',
      fontFamily: 'Ubuntu',
      parent: this.bar,
      fontSize: 20,
      color: 0x000000ff,
      mountX: 1,
      mountY: 0.5,
    });

    this.targetTick = renderer.createNode({
      x: BAR_WIDTH / 2,
      y: 0,
      width: BAR_WIDTH * 2,
      height: 2,
      parent: this.bar,
      color: 0x000000ff,
      mount: 0.5,
    });

    const numLines = 11;
    const infoTextY =
      this.node.height - MARGIN - INFO_TEXT_LINEHEIGHT * numLines;

    this.criticalInfoText = renderer.createTextNode({
      x: MARGIN,
      y: infoTextY,
      text: '',
      fontFamily: 'Ubuntu',
      parent: this.node,
      fontSize: INFO_TEXT_SIZE,
      lineHeight: INFO_TEXT_LINEHEIGHT,
      color: 0xff0000ff,
    });

    this.targetInfoText = renderer.createTextNode({
      x: MARGIN,
      y: infoTextY + INFO_TEXT_LINEHEIGHT,
      text: '',
      fontFamily: 'Ubuntu',
      parent: this.node,
      fontSize: INFO_TEXT_SIZE,
      lineHeight: INFO_TEXT_LINEHEIGHT,
      color: 0x000000ff,
    });

    this.baseInfoText = renderer.createTextNode({
      x: MARGIN,
      y: infoTextY + INFO_TEXT_LINEHEIGHT * 2,
      text: 'Base:',
      fontFamily: 'Ubuntu',
      parent: this.node,
      fontSize: INFO_TEXT_SIZE,
      lineHeight: INFO_TEXT_LINEHEIGHT,
      color: 0x000000ff,
    });

    this.memUsedText = renderer.createTextNode({
      x: MARGIN,
      y: infoTextY + INFO_TEXT_LINEHEIGHT * 3,
      text: '',
      fontFamily: 'Ubuntu',
      parent: this.node,
      fontSize: INFO_TEXT_SIZE,
      lineHeight: INFO_TEXT_LINEHEIGHT,
      color: 0x0000ffff,
    });

    this.renderableMemUsedText = renderer.createTextNode({
      x: MARGIN,
      y: infoTextY + INFO_TEXT_LINEHEIGHT * 6,
      text: '',
      fontFamily: 'Ubuntu',
      parent: this.node,
      fontSize: INFO_TEXT_SIZE,
      lineHeight: INFO_TEXT_LINEHEIGHT,
      color: 0xff00ffff,
    });

    this.cacheInfoText = renderer.createTextNode({
      x: MARGIN,
      y: infoTextY + INFO_TEXT_LINEHEIGHT * 9,
      text: '',
      fontFamily: 'Ubuntu',
      parent: this.node,
      fontSize: INFO_TEXT_SIZE,
      lineHeight: INFO_TEXT_LINEHEIGHT,
      color: 0x000000ff,
    });

    const payload = this.renderer.stage.txMemManager.getMemoryInfo();
    const { criticalThreshold, targetThreshold } = payload;
    const targetFraction = targetThreshold / criticalThreshold;
    this.targetTick.y = BAR_HEIGHT - BAR_HEIGHT * targetFraction;
    this.targetText.y = this.targetTick.y;
    this.targetInfoText.text = `Target: ${bytesToMb(targetThreshold)} mb (${(
      targetFraction * 100
    ).toFixed(1)}%)`;
    this.criticalInfoText.text = `Critical: ${bytesToMb(criticalThreshold)} mb`;

    this.update();
  }

  update() {
    const payload = this.renderer.stage.txMemManager.getMemoryInfo();
    const {
      criticalThreshold,
      memUsed,
      renderableMemUsed,
      baselineMemoryAllocation,
    } = payload;
    const baseUsedFraction = baselineMemoryAllocation / criticalThreshold;
    const renderableMemoryFraction = Math.max(
      renderableMemUsed / criticalThreshold - baseUsedFraction,
      0,
    );
    const memUsedFraction = Math.max(
      memUsed / criticalThreshold - baseUsedFraction,
      0,
    );

    this.baseMemBar.height = BAR_HEIGHT * baseUsedFraction;
    this.baseMemBar.y = BAR_HEIGHT - this.baseMemBar.height;
    this.memUsedBar.height = BAR_HEIGHT * memUsedFraction;
    this.memUsedBar.y =
      BAR_HEIGHT - this.memUsedBar.height - this.baseMemBar.height;
    this.renderableMemBar.height = BAR_HEIGHT * renderableMemoryFraction;
    this.renderableMemBar.y =
      BAR_HEIGHT - this.renderableMemBar.height - this.baseMemBar.height;

    this.memUsedText.text = `
Memory Used
- Size: ${bytesToMb(memUsed)} mb (${(memUsedFraction * 100).toFixed(1)}%)
- Count: ${payload.loadedTextures}
`.trim();
    this.renderableMemUsedText.text = `
Renderable Loaded
- ${bytesToMb(renderableMemUsed)} mb (${(
      renderableMemoryFraction * 100
    ).toFixed(1)}%)
- Count: ${payload.renderableTexturesLoaded}
`.trim();
    this.cacheInfoText.text = `Cache Size: ${this.renderer.stage.txManager.keyCache.size}`;
    this.baseInfoText.text = `Base: ${bytesToMb(baselineMemoryAllocation)} mb`;
  }

  get interval() {
    return this._interval;
  }

  set interval(interval) {
    this._interval = interval;
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }
    this.intervalHandle = setInterval(() => {
      this.update();
    }, this._interval);
  }
}
