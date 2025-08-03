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
import { Focus } from './focus/index.js';

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
   * Focus system instance (Phase 3)
   */
  readonly focusSystem: Focus;

  /**
   * Current active route match
   */
  private _currentMatch: IRouteMatch | null = null;

  /**
   * Cache for keepInMemory route components
   */
  private _routeComponentCache = new Map<string, Component>();

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
      parent: renderer.root, // Set parent to renderer root
    } as CoreNodeProps;

    super(renderer.stage, rootProps);

    // Store renderer references
    this.renderer = renderer;
    this.root = renderer.root;

    // Initialize router (Phase 2)
    this.router = new Router();

    // Initialize focus system (Phase 3)
    this.focusSystem = new Focus();

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

    // Initialize focus system with this application as root (Phase 3)
    this.focusSystem.initialize(this);

    // Set up router event handlers
    this.setupRouterEvents();

    // Navigate to initial route if specified
    if (initialRoute) {
      this.router.navigate(initialRoute);
    }
  }

  /**
   * Set up router event handlers (Phase 2)
   */
  private setupRouterEvents(): void {
    this.router.on('routeChanged', (target, data) => {
      const routeData = data as {
        from?: IRouteMatch | null;
        to?: IRouteMatch | null;
      };
      this.handleRouteChange(routeData.from || null, routeData.to || null);
    });

    this.router.on('navigationError', (target, data) => {
      const errorData = data as { error?: Error };
      console.error('Navigation error:', errorData.error);
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

    const route = this._currentMatch.route;
    const routePath = route.path;

    // Check if component is cached
    let routeComponent = this._routeComponentCache.get(routePath);

    if (!routeComponent) {
      // Create new route component
      const RouteComponent = route.component;
      routeComponent = new RouteComponent(this.stage, {
        x: 0,
        y: 0,
        width: this.renderer.settings.appWidth,
        height: this.renderer.settings.appHeight,
      } as CoreNodeProps) as Component;

      // Store tag reference for Lightning 2 compatibility
      (routeComponent as unknown as { tag: string }).tag = '_route';

      // Cache component if keepInMemory is enabled
      if (route.keepInMemory === true) {
        this._routeComponentCache.set(routePath, routeComponent);
      }
    }

    // Add route component to the application root
    routeComponent.parent = this;

    // Automatically set focus to the new route component (Phase 3)
    this.focusSystem.setFocus(routeComponent);
  }

  /**
   * Unmount the current route component (Phase 2)
   */
  private unmountCurrentRoute(): void {
    const routeComponent = this.tag('_route') as Component | null;
    if (!routeComponent) {
      return;
    }

    // Check if current route should be kept in memory
    const currentRoute = this._currentMatch?.route;
    const shouldKeepInMemory = currentRoute?.keepInMemory === true;

    if (shouldKeepInMemory) {
      // Just remove from render tree, don't destroy
      routeComponent.parent = null;
    } else {
      routeComponent.destroy();
    }
  }

  /**
   * Start the application and begin rendering
   */
  start(): void {
    // Application is already ready when constructed
    console.log('Application started');
  }

  /**
   * Stop the application and cleanup
   */
  stop(): void {
    // Shutdown focus system (Phase 3)
    this.focusSystem.shutdown();

    // Destroy all nodes in the render tree
    this.root.destroy();

    // Destroy all cached route components
    for (const [, component] of this._routeComponentCache) {
      if ('destroy' in component && typeof component.destroy === 'function') {
        component.destroy();
      }
    }
    this._routeComponentCache.clear();

    console.log('Application stopped');
  }

  /**
   * Override destroy to properly cleanup application
   */
  override destroy(): void {
    this.stop();
    super.destroy();
  }
}
