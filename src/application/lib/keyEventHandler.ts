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

import type { CoreNode } from '../../core/CoreNode.js';

/**
 * Interface for objects that can handle key events
 */
export interface IKeyEventHandler {
  readonly hasFocus: boolean;
  onKeyPress(key: string): boolean;
}

/**
 * Interface for objects that can find focused children
 */
export interface IFocusContainer extends IKeyEventHandler {
  findFocusedChild?(): CoreNode | null;
}

/**
 * Unified key event handler implementation
 * Handles the common pattern of: check focus → onKeyPress → delegate to focused child → bubble to parent
 *
 * @param handler - The object that handles key events
 * @param key - The key that was pressed
 * @returns true if handled, false to continue propagation
 */
export const handleKeyEvent = (
  handler: IFocusContainer,
  key: string,
): boolean => {
  // Early return if no focus - hot path optimization
  if (!handler.hasFocus) {
    return false;
  }

  // Handle key press first
  const handled = handler.onKeyPress(key);
  if (handled) {
    return true;
  }

  // Try focused child if container supports it
  if (handler.findFocusedChild) {
    const focusedChild = handler.findFocusedChild();
    if (focusedChild && 'handleKeyEvent' in focusedChild) {
      const childHandler = (
        focusedChild as unknown as { handleKeyEvent: (key: string) => boolean }
      ).handleKeyEvent;
      if (typeof childHandler === 'function') {
        const childHandled = childHandler(key);
        if (childHandled) {
          return true;
        }
      }
    }
  }

  // Bubble to parent if not handled locally or by focused child
  const parent = (handler as unknown as { parent: CoreNode | null }).parent;
  if (parent && 'handleKeyEvent' in parent) {
    const parentHandler = (
      parent as unknown as { handleKeyEvent: (key: string) => boolean }
    ).handleKeyEvent;
    if (typeof parentHandler === 'function') {
      return parentHandler(key);
    }
  }

  return false;
};
