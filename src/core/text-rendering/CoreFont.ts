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
import type { CoreTextNode } from '../CoreTextNode.js';
import type {
  FontMetrics,
  NormalizedFontMetrics,
  TextRenderer,
} from './TextRenderer.js';
import { UpdateType } from '../CoreNode.js';
import { EventEmitter } from '../../common/EventEmitter.js';

export enum FontState {
  Created,
  Loading,
  Loaded,
  Failed,
}

export interface CoreFontProps {
  family: string;
  metrics?: FontMetrics;
}

/**
 * EventEmiter only intended to communicated with FontManager
 */
export abstract class CoreFont extends EventEmitter {
  protected waitingNodes?: Record<number, CoreTextNode> = Object.create(
    null,
  ) as Record<number, CoreTextNode>;
  protected normalizedMetrics?: Record<number, NormalizedFontMetrics> =
    Object.create(null) as Record<number, NormalizedFontMetrics>;

  public textRenderer: TextRenderer;
  public state: FontState;
  public family: string;
  public metrics?: FontMetrics;

  constructor(textRenderer: TextRenderer, props: CoreFontProps) {
    super();
    this.family = props.family;
    this.state = FontState.Created;
    this.textRenderer = textRenderer;
  }

  protected onLoaded() {
    const waitingNodes = this.waitingNodes;
    for (let key in waitingNodes) {
      waitingNodes[key]!.setUpdateType(UpdateType.Local);
      delete waitingNodes[key];
    }
    this.state = FontState.Loaded;
  }

  public waiting(node: CoreTextNode) {
    this.waitingNodes![node.id] = node;
  }

  public stopWaiting(node: CoreTextNode) {
    if (this.waitingNodes![node.id]) {
      delete this.waitingNodes![node.id];
    }
  }

  public destroy() {
    delete this.waitingNodes;
    delete this.normalizedMetrics;
    delete this.metrics;
  }

  abstract type: string;
  abstract load(): void;
  abstract measureText(text: string, letterSpacing: number): number;
  abstract getMetrics(fontSize: number): NormalizedFontMetrics;
}
