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

import { CoreTextNode } from '../core/CoreTextNode.js';
import type { CoreTextNodeProps } from '../core/CoreTextNode.js';
import type { Stage } from '../core/Stage.js';
import type { TextRenderer } from '../core/text-rendering/renderers/TextRenderer.js';
import {
  handleKeyEvent,
  type IKeyEventHandler,
} from './lib/keyEventHandler.js';

/**
 * Enhanced TextNode class that extends CoreTextNode with focus and key routing capabilities
 */
export class TextNode extends CoreTextNode implements IKeyEventHandler {
  private _hasFocus = false;

  constructor(
    stage: Stage,
    props: CoreTextNodeProps,
    textRenderer: TextRenderer,
  ) {
    super(stage, props, textRenderer);
  }

  get hasFocus(): boolean {
    return this._hasFocus;
  }

  onFocus(): void {
    this._hasFocus = true;
  }

  onBlur(): void {
    this._hasFocus = false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onKeyPress(_key: string): boolean {
    return false;
  }

  /**
   * Handle up key press - override for custom up behavior
   * @returns true if handled, false to bubble
   */
  onUp(): boolean {
    return false;
  }

  /**
   * Handle down key press - override for custom down behavior
   * @returns true if handled, false to bubble
   */
  onDown(): boolean {
    return false;
  }

  /**
   * Handle left key press - override for custom left behavior
   * @returns true if handled, false to bubble
   */
  onLeft(): boolean {
    return false;
  }

  /**
   * Handle right key press - override for custom right behavior
   * @returns true if handled, false to bubble
   */
  onRight(): boolean {
    return false;
  }

  /**
   * Handle enter key press - override for custom enter behavior
   * @returns true if handled, false to bubble
   */
  onEnter(): boolean {
    return false;
  }

  /**
   * Handle back key press - override for custom back behavior
   * @returns true if handled, false to bubble
   */
  onBack(): boolean {
    return false;
  }

  focus(): void {
    if (!this._hasFocus) {
      this._hasFocus = true;
      this.onFocus();
    }
  }

  blur(): void {
    if (this._hasFocus) {
      this._hasFocus = false;
      this.onBlur();
    }
  }

  handleKeyEvent(key: string): boolean {
    return handleKeyEvent(this, key);
  }

  override destroy(): void {
    this.blur();
    super.destroy();
  }
}
