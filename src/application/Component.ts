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
import type { CoreTextNodeProps } from '../core/CoreTextNode.js';
import type { Stage } from '../core/Stage.js';
import type { TrProps } from '../core/text-rendering/renderers/TextRenderer.js';
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

  /**
   * Lightning 2 familiar syntax for finding children by tag/name
   * Searches through children to find a node with matching key
   *
   * @param name - The tag/key name to search for
   * @returns The found node or null if not found
   */
  tag(name: string): Node | CoreNode | TextNode | Component | null {
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
    let foundChild: Node | CoreNode | TextNode | Component | null = null;

    for (let i = 0; i < childCount; i++) {
      const child = children[i];
      if (!child) continue;

      // Check if this child has a matching tag property
      if (child['tag'] === name) {
        foundChild = child as Node | CoreNode | TextNode | Component;
        break;
      }
    }

    // Cache the result (including null results to avoid repeated searches)
    tagCache.set(name, foundChild);

    return foundChild;
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

    // Hot paths on top
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
    // Hot paths on top
    const stage = this.stage;

    // Handle Component class directly (without props)
    if (typeof value === 'function' && this.isCapitalCase(key)) {
      const ComponentClass = value as ComponentClass;
      const defaultProps = stage.resolveNodeDefaults({});
      const componentInstance = new ComponentClass(
        stage,
        defaultProps,
      ) as unknown as CoreNode;

      // Add directly to children array for performance
      this.children.push(componentInstance);

      return componentInstance;
    }

    // Handle Component with props and optional children
    if (this.isComponentWithProps(value) && this.isCapitalCase(key)) {
      const type = value.type;
      const props = stage.resolveNodeDefaults(value.props || {});
      const children = value.children;

      // Create the component instance directly
      const componentInstance = new type(stage, props) as Component;

      // Add directly to children array for performance
      this.children.push(componentInstance);

      // If component has nested children, process them
      if (children && typeof children === 'object') {
        this.processNestedChildren(componentInstance, children);
      }

      return componentInstance as unknown as CoreNode;
    }

    // Check if it's node properties (with or without children)
    if (this.isNodeProps(value)) {
      const children = value.children;
      let createdNode: CoreNode;

      // Check for text property (TextNode)
      if (this.hasTextProperty(value)) {
        const resolvedTextProperties = stage.resolveTextNodeDefaults(
          value as TrProps,
        );
        const resolvedTextRenderer = stage.resolveTextRenderer(
          resolvedTextProperties,
        );

        if (!resolvedTextRenderer) {
          throw new Error(
            `No compatible text renderer found for ${resolvedTextProperties.fontFamily}`,
          );
        }

        createdNode = new TextNode(
          stage,
          resolvedTextProperties as CoreTextNodeProps,
          resolvedTextRenderer,
        );
      } else {
        // Create regular Node
        const resolvedDefaults = stage.resolveNodeDefaults(
          value as CoreNodeProps,
        );
        createdNode = new Node(stage, resolvedDefaults);
      }

      // Add directly to children array for performance
      this.children.push(createdNode);

      // Process nested children if they exist
      if (children && typeof children === 'object') {
        this.processNestedChildren(createdNode, children);
      }

      return createdNode;
    }

    return null;
  }

  /**
   * Process nested children for a parent node (Component or Node)
   */
  private processNestedChildren(
    parentNode: CoreNode,
    nestedTemplate: ITemplate,
  ): void {
    const templateEntries = Object.entries(nestedTemplate);
    const entryCount = templateEntries.length;

    for (let i = 0; i < entryCount; i++) {
      const entry = templateEntries[i];
      if (!entry) continue;

      const childKey = entry[0];
      const childValue = entry[1] as TemplateValue;
      const childNode = this.createChildFromTemplate(childKey, childValue);

      if (childNode) {
        // Store tag reference for Lightning 2 compatibility
        childNode['tag'] = childKey;
        // Add directly to parent's children array for performance
        parentNode.children.push(childNode);
      }
    }
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

    // Listen for mount event from CoreNode (when added to render tree)
    this.on('loaded', () => {
      if (!this._mounted) {
        this._mounted = true;
        this.onMount();
      }
    });

    // Listen for parent changes to detect unmount (using new CoreNode events)
    this.on('parentChanged', ({ oldParent, newParent }) => {
      // Trigger unmount when removed from render tree (parent becomes null)
      if (oldParent !== null && newParent === null && this._mounted) {
        this._mounted = false;
        this.onUnmount();
      }
    });

    // Clear tag cache when children change (using new CoreNode events)
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
