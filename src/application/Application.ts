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

import { RendererMain } from '../main-api/Renderer.js';
import type { RendererMainSettings } from '../main-api/Renderer.js';
import type { INode } from '../main-api/INode.js';
import { CoreNode, type CoreNodeProps } from '../core/CoreNode.js';
import { Component } from './Component.js';
import type { ITemplate } from './template/types.js';
import { Router, type IRoute, type IRouteMatch } from './router/index.js';

/**
 * Application configuration options
 */
export interface IApplicationConfig {
  routes: IRoute[];
  initialRoute?: string;
  settings?: Partial<RendererMainSettings>;
  target?: string | HTMLElement;
}

/**
 * Main Application class for NAF (Not A Framework)
 *
 * @remarks
 * This is the entry point for NAF applications. It provides:
 * - Renderer initialization and management
 * - Top-level template and component management
 * - Router configuration and navigation (Phase 2)
 * - Application lifecycle management
 * - Focus management coordination
 *
 * The Application class extends Component to provide a template-driven
 * root container while managing the overall application state.
 */
export class Application extends Component {
  /**
   * The Lightning 3 renderer instance
   */
  readonly renderer: RendererMain;

  /**
   * Reference to the renderer root node
   */
  readonly root: INode;

  /**
   * Application router instance (Phase 2)
   */
  readonly router: Router;

  /**
   * Current active route match
   */
  private _currentMatch: IRouteMatch | null = null;

  /**
   * Application template - can be overridden in subclasses
   */
  template: ITemplate = {
    // Default empty template - subclasses should override
  };

  constructor(config: IApplicationConfig) {
    // Initialize renderer first
    const rendererSettings: Partial<RendererMainSettings> = {
      appWidth: 1920,
      appHeight: 1080,
      ...config.settings,
    };

    const renderer = new RendererMain(rendererSettings, config.target || 'app');

    // Call Component constructor with stage and a root node props
    const rootProps: CoreNodeProps = {
      x: 0,
      y: 0,
      width: renderer.settings.appWidth,
      height: renderer.settings.appHeight,
    } as CoreNodeProps;

    super(renderer.stage, rootProps);

    // Store renderer references
    this.renderer = renderer;
    this.root = renderer.root;

    // Initialize router (Phase 2)
    this.router = new Router();

    // Set up application
    this.setupApplication(config.routes, config.initialRoute);
  }

  /**
   * Gets the current active route
   */
  get currentRoute(): IRoute | null {
    return this.router.currentRoute;
  }

  /**
   * Gets the current route match
   */
  get currentMatch(): IRouteMatch | null {
    return this.router.currentMatch;
  }

  /**
   * Initializes the application
   */
  private setupApplication(routes: IRoute[], initialRoute?: string): void {
    // Initialize router with routes (Phase 2)
    this.router.initialize(routes);

    // Set up router event handlers
    this.setupRouterEvents();

    // Navigate to initial route if specified
    if (initialRoute) {
      this.router.navigate(initialRoute);
    }

    // Set initial focus to application root
    this.focus();
  }

  /**
   * Set up router event handlers (Phase 2)
   */
  private setupRouterEvents(): void {
    this.router.on('routeChanged', (event) => {
      this.handleRouteChange(event.from || null, event.to || null);
    });

    this.router.on('navigationError', (event) => {
      console.error('Navigation error:', event.error);
    });
  }

  /**
   * Handle route changes (Phase 2)
   */
  private handleRouteChange(
    from: IRouteMatch | null,
    to: IRouteMatch | null,
  ): void {
    // Unmount previous route
    if (from) {
      this.unmountCurrentRoute();
    }

    // Update current match
    this._currentMatch = to;

    // Mount new route
    if (to) {
      this.mountCurrentRoute();
    }
  }

  /**
   * Mount the current route component (Phase 2)
   */
  private mountCurrentRoute(): void {
    if (!this._currentMatch) {
      return;
    }

    const RouteComponent = this._currentMatch.route.component;

    // Create route component as child
    const routeComponent = new RouteComponent(this.stage, {
      x: 0,
      y: 0,
      width: this.renderer.settings.appWidth,
      height: this.renderer.settings.appHeight,
    } as CoreNodeProps);

    // Add route component as child
    this.children.push(routeComponent as unknown as CoreNode);

    // Store tag reference for Lightning 2 compatibility
    (routeComponent as unknown as { tag: string }).tag = '_route';

    // Focus the route component if it has focus method
    if (routeComponent.focus) {
      routeComponent.focus();
    }
  }

  /**
   * Unmount the current route component (Phase 2)
   */
  private unmountCurrentRoute(): void {
    const routeComponent = this.tag('_route');
    if (
      routeComponent &&
      'destroy' in routeComponent &&
      typeof routeComponent.destroy === 'function'
    ) {
      routeComponent.destroy();
    }
  }

  /**
   * Start the application and begin rendering
   */
  start(): void {
    // Application is already ready when constructed
    console.log('NAF Application started');
  }

  /**
   * Stop the application and cleanup
   */
  stop(): void {
    // Unmount current route
    if (this._currentMatch) {
      this.unmountCurrentRoute();
    }

    console.log('NAF Application stopped');
  }

  /**
   * Override onKeyPress to handle application-level keys (Phase 2 Enhanced)
   *
   * @remarks
   * For most navigation, developers should use this.router directly.
   * This method only handles system-level keys like Back/Home.
   */
  override onKeyPress(key: string): boolean {
    // Handle application-level keys (back, home, etc.)
    switch (key) {
      case 'Escape':
      case 'Back':
        // Use router's go back functionality
        if (this.router.canGoBack) {
          this.router.goBack();
          return true;
        }
        break;

      case 'Home':
        // Navigate to home route - use navigateByName for home
        if (!this.router.navigateByName('home')) {
          this.router.navigate('/');
        }
        return true;
    }

    return false;
  }

  /**
   * Override destroy to properly cleanup application
   */
  override destroy(): void {
    this.stop();
    super.destroy();
  }
}
