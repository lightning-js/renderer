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
  onKeyPress?(key: string): boolean;
  focus?(): void;
  blur?(): void;
  handleKeyEvent?(key: string): boolean;
}

/**
 * Properties for creating a regular Node or TextNode
 */
export interface INodeProps extends Partial<CoreNodeProps> {
  // Node can have any CoreNodeProps
  // If it has a 'text' property, it will be created as a TextNode
  text?: string;
}

/**
 * Properties for creating a TextNode specifically
 */
export interface ITextNodeProps extends Partial<CoreTextNodeProps> {
  text: string; // Required for text nodes
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
 */
export interface ITemplate {
  [key: string]:
    | INodeProps // lowercase = Node/TextNode properties
    | ComponentClass // Capital case = Component (no props)
    | ComponentWithProps // Component with properties
    | ITemplate; // Nested template
}

/**
 * Union type for all possible template values
 */
export type TemplateValue =
  | INodeProps
  | ComponentClass
  | ComponentWithProps
  | ITemplate;

/**
 * Type guard utilities for template processing
 */
export interface TemplateTypeGuards {
  isComponentClass(value: unknown): value is ComponentClass;
  isComponentWithProps(value: unknown): value is ComponentWithProps;
  isNodeProps(value: unknown): value is INodeProps;
  isNestedTemplate(value: unknown): value is ITemplate;
  hasTextProperty(props: unknown): props is ITextNodeProps;
  isCapitalCase(str: string): boolean;
}
