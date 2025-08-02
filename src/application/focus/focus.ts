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

import type { Node } from '../Node.js';
import type { Component } from '../Component.js';
import type { TextNode } from '../TextNode.js';
import { EventEmitter } from '../../common/EventEmitter.js';

/**
 * Focusable element types with key handlers
 */
export type FocusableElement = Node | Component | TextNode;

/**
 * Key event handler result
 */
export interface IKeyEventResult {
  /** Whether the key event was handled */
  handled: boolean;
  /** Whether to prevent default browser behavior */
  preventDefault?: boolean;
  /** Whether to stop propagation to parent elements */
  stopPropagation?: boolean;
}

/**
 * Focus manager events
 */
export type FocusManagerEvent = 'focusChanged' | 'keyEvent' | 'focusLost';

/**
 * Focus manager event data
 */
export interface IFocusManagerEventData {
  focusChanged: {
    from: FocusableElement | null;
    to: FocusableElement | null;
  };
  keyEvent: {
    key: string;
    element: FocusableElement | null;
    handled: boolean;
  };
  focusLost: {
    element: FocusableElement;
  };
}

/**
 * High-Performance Focus System (Phase 3)
 *
 * @remarks
 * This is Lightning 3's custom focus system since the renderer has no built-in
 * focus management. It provides:
 * - Global key event capture and routing
 * - Focus tree management and navigation
 * - TV remote control optimization with default keymap
 * - Automatic focus management for route changes
 *
 * Performance optimizations:
 * - Hot paths for key routing
 * - Efficient focus tree traversal
 * - Minimal memory allocation during navigation
 * - Cached focus chains for rapid lookup
 */
export class Focus extends EventEmitter {
  /**
   * Currently focused element
   */
  private _focusedElement: FocusableElement | null = null;

  /**
   * Focus chain cache for performance
   */
  private _focusChain: FocusableElement[] = [];

  /**
   * Key event listeners
   */
  private _keyEventListeners = new Map<string, EventListener>();

  /**
   * Whether the focus manager is active
   */
  private _isActive = false;

  /**
   * Root element for focus management (usually the Application)
   */
  private _rootElement: FocusableElement | null = null;

  /**
   * Default TV keymap with D-pad, Enter, Back, Menu
   */
  private readonly _defaultKeyMap = new Map<string, string>([
    // D-pad navigation
    ['ArrowUp', 'up'],
    ['ArrowDown', 'down'],
    ['ArrowLeft', 'left'],
    ['ArrowRight', 'right'],

    // Action keys
    ['Enter', 'enter'],
    [' ', 'enter'], // Spacebar as enter

    // Back navigation
    ['Escape', 'back'],
    ['Backspace', 'back'],

    // Menu
    ['ContextMenu', 'menu'],
    ['F1', 'menu'], // Alternative menu key

    // Additional TV remote keys
    ['Home', 'home'],
    ['End', 'end'],
    ['PageUp', 'pageup'],
    ['PageDown', 'pagedown'],
  ]);

  /**
   * Gets the currently focused element
   */
  get focusedElement(): FocusableElement | null {
    return this._focusedElement;
  }

  /**
   * Gets whether the focus manager is active
   */
  get isActive(): boolean {
    return this._isActive;
  }

  /**
   * Initialize the focus manager with a root element
   */
  initialize(rootElement: FocusableElement): void {
    this._rootElement = rootElement;
    this.setupKeyListeners();
    this._isActive = true;

    // Set initial focus to root
    this.setFocus(rootElement);
  }

  /**
   * Shutdown the focus manager and cleanup
   */
  shutdown(): void {
    this.removeKeyListeners();
    this.clearFocus();
    this._rootElement = null;
    this._isActive = false;
    this.removeAllListeners();
  }

  /**
   * Set focus to a specific element
   */
  setFocus(element: FocusableElement | null): boolean {
    // Early return if same element
    if (element === this._focusedElement) {
      return true;
    }

    const previousElement = this._focusedElement;

    // Blur previous element
    if (previousElement) {
      this.blurElement(previousElement);
    }

    // Focus new element
    this._focusedElement = element;
    if (element) {
      this.focusElement(element);
      this.updateFocusChain();
    }

    // Emit focus changed event
    this.emit('focusChanged', {
      from: previousElement,
      to: element,
    });

    return true;
  }

  /**
   * Clear current focus
   */
  clearFocus(): void {
    if (this._focusedElement) {
      this.blurElement(this._focusedElement);
      this._focusedElement = null;
      this._focusChain = [];
    }
  }

  /**
   * Handle key events from the global listener
   */
  private handleKeyEvent = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;

    // Hot path - early return if not active
    if (!this._isActive || !this._focusedElement) {
      return;
    }

    const key = this.normalizeKey(keyboardEvent.key);
    let handled = false;
    let preventDefault = false;
    let stopPropagation = false;

    try {
      // Route key to focused element
      const result = this.routeKeyToElement(this._focusedElement, key);
      handled = result.handled;
      preventDefault = result.preventDefault || false;
      stopPropagation = result.stopPropagation || false;
    } catch (error) {
      console.error('Error handling key event:', error);
    }

    // Emit key event
    this.emit('keyEvent', {
      key,
      element: this._focusedElement,
      handled,
    });

    // Control event propagation
    if (preventDefault) {
      keyboardEvent.preventDefault();
    }
    if (stopPropagation) {
      keyboardEvent.stopPropagation();
    }
  };

  /**
   * Route key event to specific element with bubbling
   */
  private routeKeyToElement(
    element: FocusableElement,
    key: string,
  ): IKeyEventResult {
    // Hot path - try specific key utility methods first
    const handled = this.tryUtilityKeyMethods(element, key);
    if (handled) {
      return { handled: true, preventDefault: true };
    }

    // Try element's generic onKeyPress method
    if (typeof element.onKeyPress === 'function') {
      try {
        const keyHandled = element.onKeyPress(key);
        if (keyHandled) {
          return { handled: true, preventDefault: true };
        }
      } catch (error) {
        console.error('Error in element onKeyPress:', error);
      }
    }

    // Bubble up to parent if not handled
    const parent = this.getParentElement(element);
    if (parent && parent !== element) {
      return this.routeKeyToElement(parent, key);
    }

    return { handled: false };
  }

  /**
   * Key to method name mapping for utility functions
   */
  private readonly _keyMethodMap = new Map<string, string>([
    ['up', 'onUp'],
    ['down', 'onDown'],
    ['left', 'onLeft'],
    ['right', 'onRight'],
    ['enter', 'onEnter'],
    ['back', 'onBack'],
  ]);

  /**
   * Try specific utility key methods on the element
   */
  private tryUtilityKeyMethods(
    element: FocusableElement,
    key: string,
  ): boolean {
    try {
      const methodName = this._keyMethodMap.get(key);
      if (methodName && methodName in element) {
        const method = (element as unknown as Record<string, unknown>)[
          methodName
        ];
        if (typeof method === 'function') {
          const result = (method as () => boolean)();
          return Boolean(result);
        }
      }
      return false;
    } catch (error) {
      console.error(`Error in element ${key} handler:`, error);
      return false;
    }
  }

  /**
   * Setup global key event listeners
   */
  private setupKeyListeners(): void {
    if (typeof window !== 'undefined') {
      // Use capture phase for global key handling
      window.addEventListener('keydown', this.handleKeyEvent, {
        capture: true,
      });

      // Prevent default behavior for navigation keys
      const preventDefaultHandler = (event: Event) => {
        const keyboardEvent = event as KeyboardEvent;
        if (
          this._isActive &&
          this.isNavigationKey(this.normalizeKey(keyboardEvent.key))
        ) {
          keyboardEvent.preventDefault();
        }
      };

      window.addEventListener('keypress', preventDefaultHandler, {
        capture: true,
      });
      this._keyEventListeners.set('keydown', this.handleKeyEvent);
      this._keyEventListeners.set('keypress', preventDefaultHandler);
    }
  }

  /**
   * Remove global key event listeners
   */
  private removeKeyListeners(): void {
    if (typeof window !== 'undefined') {
      this._keyEventListeners.forEach((handler, event) => {
        window.removeEventListener(event, handler, { capture: true });
      });
      this._keyEventListeners.clear();
    }
  }

  /**
   * Focus an element (call its onFocus method)
   */
  private focusElement(element: FocusableElement): void {
    try {
      if (typeof element.onFocus === 'function') {
        element.onFocus();
      }
      // Set internal focus state if available
      if ('_hasFocus' in element) {
        (element as unknown as { _hasFocus: boolean })._hasFocus = true;
      }
    } catch (error) {
      console.error('Error focusing element:', error);
    }
  }

  /**
   * Blur an element (call its onBlur method)
   */
  private blurElement(element: FocusableElement): void {
    try {
      if (typeof element.onBlur === 'function') {
        element.onBlur();
      }
      // Set internal focus state if available
      if ('_hasFocus' in element) {
        (element as unknown as { _hasFocus: boolean })._hasFocus = false;
      }
    } catch (error) {
      console.error('Error blurring element:', error);
    }
  }

  /**
   * Update the focus chain for performance
   */
  private updateFocusChain(): void {
    this._focusChain = [];
    let current = this._focusedElement;

    while (current) {
      this._focusChain.unshift(current);
      current = this.getParentElement(current);

      // Prevent infinite loops
      if (this._focusChain.length > 100) {
        break;
      }
    }
  }

  /**
   * Get parent element for focus bubbling
   */
  private getParentElement(element: FocusableElement): FocusableElement | null {
    // Try to get parent through various means
    if ('parent' in element && element.parent) {
      return element.parent as FocusableElement;
    }

    if ('parentNode' in element && element.parentNode) {
      return element.parentNode as FocusableElement;
    }

    return null;
  }

  /**
   * Normalize key names for consistent handling
   */
  private normalizeKey(key: string): string {
    return this._defaultKeyMap.get(key) || key.toLowerCase();
  }

  /**
   * Check if key is a navigation key
   */
  private isNavigationKey(key: string): boolean {
    return ['up', 'down', 'left', 'right'].includes(key);
  }
}
