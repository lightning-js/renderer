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

/**
 * Lightning 3 Application Framework (NAF Integration)
 *
 * @remarks
 * This module exports the high-level application framework components
 * that extend Lightning 3's core rendering capabilities with focus
 * management, key event handling, and component lifecycle management.
 *
 * Key Features:
 * - Enhanced Node class with focus and key routing capabilities
 * - TextNode class for text rendering with focus capabilities
 * - Component class with template-driven UI development
 * - Lightning 2 familiar tag() syntax for child finding
 * - Zero abstraction layer over Lightning 3 core functionality
 *
 * @module Application
 */

export { Node } from './Node.js';
export { TextNode } from './TextNode.js';
export { Component } from './Component.js';
export { Application, type IApplicationConfig } from './Application.js';
export {
  handleKeyEvent,
  type IKeyEventHandler,
  type IFocusContainer,
} from './lib/keyEventHandler.js';

// Router exports (Phase 2)
export {
  Router,
  type IRoute,
  type IRouteMatch,
  type INavigationOptions,
  type RouterEvent,
  type RouterEventHandler,
} from './router/index.js';

// Template types for component development
export type {
  ITemplate,
  INodeProps,
  ITextNodeProps,
  ComponentClass,
  ComponentWithProps,
  TemplateValue,
  TemplateTypeGuards,
  IComponent,
} from './template/types.js';
