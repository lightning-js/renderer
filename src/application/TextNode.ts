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
import { CoreNode } from '../core/CoreNode.js';
import type { CoreTextNodeProps } from '../core/CoreTextNode.js';
import type { Stage } from '../core/Stage.js';
import type { TextRenderer } from '../core/text-rendering/renderers/TextRenderer.js';
import { Node } from './Node.js';

/**
 * Enhanced TextNode class that extends CoreTextNode with focus and key routing capabilities
 *
 * @remarks
 * This class provides the foundation for the L3 application
 * It adds focus management and key event handling capabilities while maintaining full compatibility
 * with the core Lightning 3 text rendering.
 *
 * Key features:
 * - Focus management (onFocus/onBlur lifecycle)
 * - Key event handling with propagation control
 * - Lightning 2 familiar tag() syntax for child finding
 * - Zero abstraction layer over CoreTextNode functionality
 * - Optimized for TV application performance
 */
export class TextNode extends CoreTextNode {
  /**
   * Indicates whether this text node currently has focus
   */
  private _hasFocus = false;

  /**
   * Cache for tag lookups to improve performance
   */
  private _tagCache = new Map<string, Node | CoreNode | null>();

  constructor(
    stage: Stage,
    props: CoreTextNodeProps,
    textRenderer: TextRenderer,
  ) {
    super(stage, props, textRenderer);
    this.setupFocusHandling();
  }

  get hasFocus(): boolean {
    return this._hasFocus;
  }

  /**
   * Lightning 2 familiar syntax for finding children by tag/name
   * Searches through children to find a node with matching key
   *
   * @param name - The tag/key name to search for
   * @returns The found node or null if not found
   */
  tag(name: string): Node | CoreNode | null {
    // Hot paths on top
    const tagCache = this._tagCache;
    const children = this.children;

    // Check cache first for performance
    if (tagCache.has(name)) {
      const cached = tagCache.get(name);
      if (cached && children.includes(cached)) {
        return cached;
      }
      // Remove stale cache entry
      tagCache.delete(name);
    }

    // Search through children for matching tag - inlined for performance
    const childCount = children.length;
    let foundChild: Node | CoreNode | null = null;

    for (let i = 0; i < childCount; i++) {
      const child = children[i];
      if (!child) continue;

      // Check if this child has a matching tag property
      if (child['tag'] === name || child['name'] === name) {
        foundChild = child;
        break;
      }
    }

    // Cache the result (including null results to avoid repeated searches)
    tagCache.set(name, foundChild);

    return foundChild;
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

  /**
   * Clears the tag cache
   * Should be called when children are added/removed to maintain cache validity
   */
  private clearTagCache(): void {
    this._tagCache.clear();
  }

  /**
   * Setup focus handling for this text node
   */
  private setupFocusHandling(): void {
    // Listen for child changes to clear tag cache
    this.on('childAdded', () => this.clearTagCache());
    this.on('childRemoved', () => this.clearTagCache());
  }

  override destroy(): void {
    this.blur();
    this.clearTagCache();
    super.destroy();
  }
}
