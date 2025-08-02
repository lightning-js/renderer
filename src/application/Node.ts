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

import { CoreNode } from '../core/CoreNode.js';
import type { CoreNodeProps } from '../core/CoreNode.js';
import type { Stage } from '../core/Stage.js';

/**
 * Enhanced Node class that extends CoreNode with focus and key routing capabilities
 *
 * @remarks
 * This class provides the foundation for the NAF (Not A Framework) application
 * framework integration into Lightning 3. It adds focus management and key
 * event handling capabilities while maintaining full compatibility with the
 * core Lightning 3 renderer.
 *
 * Key features:
 * - Focus management (onFocus/onBlur lifecycle)
 * - Key event handling with propagation control
 * - Lightning 2 familiar tag() syntax for child finding
 * - Zero abstraction layer over CoreNode functionality
 * - Optimized for TV application performance
 */
export class Node extends CoreNode {
  /**
   * Indicates whether this node currently has focus
   * Note: Lightning 3 has no built-in focus system, so we implement our own
   */
  private _hasFocus = false;

  /**
   * Cache for tag lookups to improve performance
   */
  private _tagCache = new Map<string, Node | CoreNode | null>();

  constructor(stage: Stage, props: CoreNodeProps) {
    super(stage, props);
    this.setupFocusHandling();
  }

  /**
   * Gets whether this node currently has focus
   */
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

    // Search through children for matching tag
    const child = this.findChildByTag(name);

    // Cache the result (including null results to avoid repeated searches)
    tagCache.set(name, child);

    return child;
  }

  /**
   * Called when this node receives focus
   * Override this method to implement custom focus behavior
   */
  onFocus(): void {
    // Default implementation - can be overridden by subclasses
    this._hasFocus = true;
  }

  /**
   * Called when this node loses focus
   * Override this method to implement custom blur behavior
   */
  onBlur(): void {
    // Default implementation - can be overridden by subclasses
    this._hasFocus = false;
  }

  /**
   * Handles key press events
   *
   * @param _key - The key that was pressed (unused in base implementation)
   * @returns true if the key was handled (stops propagation), false to propagate to parent
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onKeyPress(_key: string): boolean {
    // Default implementation - can be overridden by subclasses
    // Return false to propagate the key event to parent
    return false;
  }

  /**
   * Sets focus to this node
   * This will trigger onFocus() and onBlur() events as appropriate
   */
  focus(): void {
    // TODO: Integrate with focus manager when implemented in Phase 3
    if (!this._hasFocus) {
      this._hasFocus = true;
      this.onFocus();
    }
  }

  /**
   * Removes focus from this node
   */
  blur(): void {
    // TODO: Integrate with focus manager when implemented in Phase 3
    if (this._hasFocus) {
      this._hasFocus = false;
      this.onBlur();
    }
  }

  /**
   * Handles key events and routing
   * This method is called by the focus manager (to be implemented in Phase 3)
   *
   * @param key - The key that was pressed
   * @returns true if handled, false to continue propagation
   */
  handleKeyEvent(key: string): boolean {
    // Early return if no focus
    if (!this._hasFocus) {
      return false;
    }

    // Call the onKeyPress handler
    const handled = this.onKeyPress(key);
    if (handled) {
      return true;
    }

    // Try focused child
    const focusedChild = this.findFocusedChild();
    if (focusedChild && typeof focusedChild['handleKeyEvent'] === 'function') {
      try {
        return focusedChild['handleKeyEvent'](key);
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * Clears the tag cache
   * Should be called when children are added/removed to maintain cache validity
   */
  private clearTagCache(): void {
    this._tagCache.clear();
  }

  /**
   * Setup focus handling for this node
   */
  private setupFocusHandling(): void {
    // Listen for child changes to clear tag cache
    this.on('childAdded', () => this.clearTagCache());
    this.on('childRemoved', () => this.clearTagCache());
  }

  /**
   * Searches for a child node by tag name recursively
   *
   * @param name - The tag name to search for
   * @param node - The node to search in (defaults to this)
   * @returns The found node or null
   */
  private findChildByTag(
    name: string,
    node: CoreNode = this,
  ): Node | CoreNode | null {
    // Hot paths on top
    const children = node.children;
    const childCount = children.length;

    // Check direct children first
    for (let i = 0; i < childCount; i++) {
      const child = children[i];
      if (!child) continue;

      // Check if this child has a matching tag property
      if (child['tag'] === name || child['name'] === name) {
        return child;
      }
    }

    // Search recursively in children
    for (let i = 0; i < childCount; i++) {
      const child = children[i];
      if (!child) continue;

      const found = this.findChildByTag(name, child);
      if (found) {
        return found;
      }
    }

    return null;
  }

  /**
   * Finds the first child that has focus
   *
   * @returns The focused child node or null
   */
  private findFocusedChild(): Node | null {
    const children = this.children;
    const childCount = children.length;

    for (let i = 0; i < childCount; i++) {
      const child = children[i];
      if (!child) continue;

      if (child instanceof Node && child.hasFocus) {
        return child;
      }
    }

    return null;
  }

  /**
   * Override destroy to clean up resources
   */
  override destroy(): void {
    this.clearTagCache();
    super.destroy();
  }
}
