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

import type { CoreNodeProps } from '../../core/CoreNode.js';
import type { CoreTextNodeProps } from '../../core/CoreTextNode.js';

// Forward declaration to avoid circular imports
// This represents any component that extends CoreNode with application capabilities
export interface IComponent extends CoreNodeProps {
  // Components should have these basic capabilities
  hasFocus?: boolean;
  init?(): void;
  onMount?(): void;
  onUnmount?(): void;
  onDestroy?(): void;
  onFocus?(): void;
  onBlur?(): void;
  focus?(): void;
  blur?(): void;

  // Key event handling
  onKeyPress?(key: string): boolean;

  // Key utility methods
  onUp?(): boolean;
  onDown?(): boolean;
  onLeft?(): boolean;
  onRight?(): boolean;
  onEnter?(): boolean;
  onBack?(): boolean;
}

/**
 * Properties for creating a regular Node or TextNode
 */
export interface INodeProps extends Partial<CoreTextNodeProps> {
  // Node can have any CoreNodeProps
  // If it has a 'text' property, it will be created as a TextNode
  text?: string;
  children?: ITemplate; // NEW: Support for nested children
}

/**
 * Properties for creating a TextNode specifically
 */
export interface ITextNodeProps extends Partial<CoreTextNodeProps> {
  text: string; // Required for text nodes
  children?: ITemplate; // NEW: Support for nested children
}

/**
 * Type for Component constructor
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ComponentClass = new (...args: any[]) => IComponent;

/**
 * Component with properties that will be applied to the CoreNode
 */
export interface ComponentWithProps {
  type: ComponentClass;
  props?: Partial<CoreNodeProps>;
  children?: ITemplate; // NEW: Support for nested children
}

/**
 * Node/Element with properties and optional nested children
 */
export interface NodeWithChildren extends INodeProps {
  children: ITemplate; // Required nested children
}

/**
 * Template definition interface
 *
 * @remarks
 * Template structure:
 * - Capital case keys (e.g., Button, Menu) = Component references
 * - Lower case keys (e.g., bg, title) = CoreNode/CoreTextNode properties
 * - Automatic text node detection based on 'text' property presence
 * - All Lightning 3 properties transparently passed through
 * - Components and Nodes can have nested children via 'children' property
 *
 * Template Examples:
 * ```typescript
 * template = {
 *   // Simple node
 *   bg: { width: 100, height: 50, color: 0xff0000 },
 *
 *   // Text node
 *   title: { text: 'Hello', fontSize: 24 },
 *
 *   // Component without props
 *   SimpleButton: ButtonComponent,
 *
 *   // Component with props
 *   ConfiguredButton: {
 *     type: ButtonComponent,
 *     props: { x: 100, y: 50 }
 *   },
 *
 *   // Component with props AND children
 *   ComplexMenu: {
 *     type: MenuComponent,
 *     props: { width: 400, height: 300 },
 *     children: {
 *       header: { width: 400, height: 50, color: 0x666666 },
 *       title: { text: 'Menu Title', fontSize: 24 }
 *     }
 *   },
 *
 *   // Node with children (creates container node)
 *   container: {
 *     width: 200,
 *     height: 100,
 *     children: {
 *       item1: { width: 50, height: 50, color: 0x00ff00 },
 *       item2: { width: 50, height: 50, color: 0x0000ff }
 *     }
 *   }
 * }
 * ```
 */
export interface ITemplate {
  [key: string]:
    | INodeProps // lowercase = Node/TextNode properties (may include children)
    | ComponentClass // Capital case = Component (no props)
    | ComponentWithProps // Component with properties (may include children)
    | NodeWithChildren // Node/Element with required children
    | ITemplate; // Pure nested template (backward compatibility)
}

/**
 * Union type for all possible template values
 */
export type TemplateValue =
  | INodeProps
  | ComponentClass
  | ComponentWithProps
  | NodeWithChildren
  | ITemplate;

/**
 * Type guard utilities for template processing
 */
export interface TemplateTypeGuards {
  isComponentClass(value: unknown): value is ComponentClass;
  isComponentWithProps(value: unknown): value is ComponentWithProps;
  isNodeProps(value: unknown): value is INodeProps;
  isNodeWithChildren(value: unknown): value is NodeWithChildren;
  isNestedTemplate(value: unknown): value is ITemplate;
  hasTextProperty(props: unknown): props is ITextNodeProps;
  hasChildrenProperty(props: unknown): boolean;
  isCapitalCase(str: string): boolean;
}
