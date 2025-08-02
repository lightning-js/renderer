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
import { Node } from './Node.js';
import { TextNode } from './TextNode.js';
import { handleKeyEvent, type IFocusContainer } from './lib/keyEventHandler.js';
import type {
  ITemplate,
  INodeProps,
  ComponentClass,
  ComponentWithProps,
  TemplateValue,
  IComponent,
} from './template/types.js';

/**
 * Component class that extends CoreNode with template processing and component lifecycle
 *
 * @remarks
 * This is the core Component class for the NAF (Not A Framework) application framework.
 * It provides:
 * - Template-driven UI development with JSON-based templates
 * - Component lifecycle management (init, mount, unmount, destroy)
 * - Focus management and key event handling
 * - Automatic differentiation between Nodes, TextNodes, and Components
 * - Lightning 2 familiar tag() syntax for child finding
 * - Zero abstraction layer over CoreNode functionality
 *
 * Template Structure:
 * - Capital case keys (e.g., Button, Menu) = Component references
 * - Lower case keys (e.g., bg, title) = CoreNode/CoreTextNode
 * - Automatic text node detection based on 'text' property presence
 * - All Lightning 3 properties transparently passed through
 */
export abstract class Component
  extends CoreNode
  implements IComponent, IFocusContainer
{
  /**
   * The template definition for this component
   * Override this property in subclasses to define the component structure
   */
  abstract template: ITemplate;

  /**
   * Cache for tag lookups to improve performance
   */
  private _tagCache = new Map<
    string,
    Node | CoreNode | TextNode | Component | null
  >();

  /**
   * Indicates whether this component currently has focus
   */
  private _hasFocus = false;

  /**
   * Indicates whether the component has been initialized
   */
  private _initialized = false;

  /**
   * Indicates whether the component has been mounted
   */
  private _mounted = false;

  constructor(stage: Stage, props: CoreNodeProps) {
    super(stage, props);
    this.setupComponentLifecycle();
  }

  /**
   * Gets whether this component currently has focus
   */
  get hasFocus(): boolean {
    return this._hasFocus;
  }

  /**
   * Gets whether the component has been initialized
   */
  get initialized(): boolean {
    return this._initialized;
  }

  /**
   * Gets whether the component has been mounted
   */
  get mounted(): boolean {
    return this._mounted;
  }

  /**
   * Component initialization lifecycle hook
   * Called once when the component is first created
   * Override this method to implement custom initialization logic
   */
  init(): void {
    // Default implementation - can be overridden by subclasses
    // This is where you can set up initial state, process dynamic templates, etc.
  }

  /**
   * Component mount lifecycle hook
   * Called when the component is added to the render tree
   * Override this method to implement custom mount logic
   */
  onMount(): void {
    // Default implementation - can be overridden by subclasses
    // This is where you can start animations, timers, event listeners, etc.
  }

  /**
   * Component unmount lifecycle hook
   * Called when the component is removed from the render tree
   * Override this method to implement custom unmount logic
   */
  onUnmount(): void {
    // Default implementation - can be overridden by subclasses
    // This is where you should clean up animations, timers, event listeners, etc.
  }

  /**
   * Component destroy lifecycle hook
   * Called when the component is being destroyed
   * Override this method to implement custom cleanup logic
   */
  onDestroy(): void {
    // Default implementation - can be overridden by subclasses
    // This is where you should clean up any remaining resources
  }

  /**
   * Called when this component receives focus
   * Override this method to implement custom focus behavior
   */
  onFocus(): void {
    // Default implementation - can be overridden by subclasses
    this._hasFocus = true;
  }

  /**
   * Called when this component loses focus
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
   * Lightning 2 familiar syntax for finding children by tag/name
   * Searches through children to find a node with matching key
   *
   * @param name - The tag/key name to search for
   * @returns The found node or null if not found
   */
  tag(name: string): Node | CoreNode | TextNode | Component | null {
    // Host paths on top
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
   * Sets focus to this component
   * This will trigger onFocus() event
   */
  focus(): void {
    // TODO: Integrate with focus manager when implemented in Phase 3
    if (!this._hasFocus) {
      this._hasFocus = true;
      this.onFocus();
    }
  }

  /**
   * Removes focus from this component
   * This will trigger onBlur() event
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
   *
   * @param key - The key that was pressed
   * @returns true if handled, false to continue propagation
   */
  handleKeyEvent(key: string): boolean {
    return handleKeyEvent(this, key);
  }

  /**
   * Processes the template and creates child nodes
   * This is called automatically during component initialization
   */
  private processTemplate(): void {
    const template = this.template;
    if (!template) {
      return;
    }

    // Host paths on top
    const children = this.children;
    const templateEntries = Object.entries(template);
    const entryCount = templateEntries.length;

    // Process each entry in the template
    for (let i = 0; i < entryCount; i++) {
      const entry = templateEntries[i];
      if (!entry) continue;

      const key = entry[0];
      const value = entry[1] as TemplateValue;
      const child = this.createChildFromTemplate(key, value);
      if (!child) continue;

      children.push(child);
      // Store tag reference for Lightning 2 compatibility
      child['tag'] = key;
    }
  }

  /**
   * Creates a child node from a template entry
   *
   * @param key - The template key (used as tag name)
   * @param value - The template value (properties, component class, or nested template)
   * @returns The created child node or null
   */
  private createChildFromTemplate(
    key: string,
    value: TemplateValue,
  ): CoreNode | null {
    // Host paths on top
    const stage = this.stage;

    // Check if it's a Component class (Capital case key)
    if (typeof value === 'function' && this.isCapitalCase(key)) {
      const ComponentClass = value as ComponentClass;
      const coreNode = stage.createNode({});
      return new ComponentClass(stage, coreNode.props) as unknown as CoreNode;
    }

    // Check if it's a Component with props
    if (this.isComponentWithProps(value) && this.isCapitalCase(key)) {
      const type = value.type;
      const props = value.props || {};
      const coreNode = stage.createNode(props);
      return new type(stage, coreNode.props) as unknown as CoreNode;
    }

    // Check if it's node properties
    if (this.isNodeProps(value)) {
      // Check for text property (TextNode)
      if (this.hasTextProperty(value)) {
        // TextNode creation not yet implemented - requires text renderer integration
        return null;
      }

      // Create regular Node
      const coreNode = stage.createNode(value);
      return new Node(stage, coreNode.props);
    }

    // Check if it's a nested template
    if (this.isNestedTemplate(value)) {
      const NestedComponent = class extends Component {
        template = value as ITemplate;
      };
      const coreNode = stage.createNode({});
      return new NestedComponent(stage, coreNode.props);
    }

    return null;
  }

  /**
   * Sets up component lifecycle management
   */
  private setupComponentLifecycle(): void {
    // Initialize the component
    if (!this._initialized) {
      this._initialized = true;
      this.init();
      this.processTemplate();
    }

    // Listen for mount/unmount events from CoreNode
    this.on('loaded', () => {
      if (!this._mounted) {
        this._mounted = true;
        this.onMount();
      }
    });

    this.on('unloaded', () => {
      if (this._mounted) {
        this._mounted = false;
        this.onUnmount();
      }
    });

    // Clear tag cache when children change
    this.on('childAdded', () => this.clearTagCache());
    this.on('childRemoved', () => this.clearTagCache());
  }

  /**
   * Clears the tag cache
   */
  private clearTagCache(): void {
    this._tagCache.clear();
  }

  /**
   * Searches for a child node by tag name
   *
   * @param name - The tag name to search for
   * @returns The found node or null
   */
  private findChildByTag(
    name: string,
  ): Node | CoreNode | TextNode | Component | null {
    const children = this.children;
    const childCount = children.length;

    for (let i = 0; i < childCount; i++) {
      const child = children[i];
      if (!child) continue;

      // Check if this child has a matching tag property
      if (child['tag'] === name) {
        return child as Node | CoreNode | TextNode | Component;
      }
    }

    return null;
  }

  /**
   * Finds the first child that has focus
   *
   * @returns The focused child node or null
   */
  findFocusedChild(): CoreNode | null {
    const children = this.children;
    const childCount = children.length;

    for (let i = 0; i < childCount; i++) {
      const child = children[i];
      if (!child) continue;

      if (child['hasFocus']) {
        return child;
      }
    }

    return null;
  }

  /**
   * Checks if a string starts with a capital letter
   */
  private isCapitalCase(str: string): boolean {
    const firstChar = str.charAt(0);
    return firstChar === firstChar.toUpperCase();
  }

  /**
   * Type guard for ComponentWithProps
   */
  private isComponentWithProps(value: unknown): value is ComponentWithProps {
    return (
      value !== null &&
      typeof value === 'object' &&
      'type' in value &&
      typeof (value as { type: unknown }).type === 'function'
    );
  }

  /**
   * Type guard for INodeProps
   */
  private isNodeProps(value: unknown): value is INodeProps {
    return (
      value !== null &&
      typeof value === 'object' &&
      !this.isComponentWithProps(value) &&
      !Array.isArray(value)
    );
  }

  /**
   * Checks if the props object has a text property (indicating TextNode)
   */
  private hasTextProperty(props: unknown): boolean {
    return props !== null && typeof props === 'object' && 'text' in props;
  }

  /**
   * Type guard for nested template
   */
  private isNestedTemplate(value: unknown): value is ITemplate {
    return (
      value !== null &&
      typeof value === 'object' &&
      !this.isNodeProps(value) &&
      !this.isComponentWithProps(value)
    );
  }

  /**
   * Override destroy to clean up resources
   */
  override destroy(): void {
    if (this._mounted) {
      this.onUnmount();
      this._mounted = false;
    }

    this.onDestroy();
    this.clearTagCache();
    super.destroy();
  }
}
