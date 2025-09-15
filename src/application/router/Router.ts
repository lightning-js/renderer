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

import type { ComponentClass } from '../template/types.js';
import { EventEmitter } from '../../common/EventEmitter.js';

/**
 * Route configuration interface
 */
export interface IRoute {
  /** Route path pattern (e.g., '/', '/profile', '/settings/:id') */
  path: string;

  /** Friendly name for the route */
  name?: string;

  /** Component class to render for this route */
  component: ComponentClass;

  /** Route-specific data/metadata */
  data?: Record<string, unknown>;

  /** Whether this route requires authentication */
  requiresAuth?: boolean;

  /** Route guards (functions that return boolean for access) */
  guards?: Array<() => boolean>;

  /** Keep component in memory when navigating away (performance optimization) */
  keepInMemory?: boolean;
}

/**
 * Route match result interface
 */
export interface IRouteMatch {
  /** The matched route */
  route: IRoute;

  /** Extracted parameters from the path */
  params: Record<string, string>;

  /** Query string parameters */
  query: Record<string, string>;
}

/**
 * Navigation options interface
 */
export interface INavigationOptions {
  /** Replace current history entry instead of pushing new one */
  replace?: boolean;

  /** Data to pass to the target route */
  data?: Record<string, unknown>;

  /** Whether to skip route guards */
  skipGuards?: boolean;
}

/**
 * Router event types
 */
export type RouterEvent =
  | 'beforeNavigate'
  | 'afterNavigate'
  | 'navigationError'
  | 'routeChanged';

/**
 * Router event handler function
 */
export type RouterEventHandler = (event: {
  type: RouterEvent;
  from?: IRouteMatch | null;
  to?: IRouteMatch | null;
  error?: Error;
  data?: Record<string, unknown>;
}) => void;

/**
 * High-performance TV-optimized Router for L3 applications
 *
 * @remarks
 * This router is designed specifically for TV applications with:
 * - Hash-based routing for compatibility
 * - Parameter extraction from URLs
 * - Route guards and authentication
 * - TV remote control friendly navigation
 * - High-performance route matching
 * - Component lifecycle integration
 * - Navigation history management
 */
export class Router extends EventEmitter {
  private _routes: IRoute[] = [];
  private _currentMatch: IRouteMatch | null = null;
  private _history: string[] = [];
  private _historyIndex = -1;
  private _isNavigating = false;

  /**
   * Get the current route match
   */
  get currentMatch(): IRouteMatch | null {
    return this._currentMatch;
  }

  /**
   * Get the current route
   */
  get currentRoute(): IRoute | null {
    return this._currentMatch?.route || null;
  }

  /**
   * Get the current path
   */
  get currentPath(): string {
    if (typeof window !== 'undefined') {
      return window.location.hash.slice(1) || '/';
    }
    return '/';
  }

  /**
   * Get navigation history
   */
  get history(): readonly string[] {
    return [...this._history];
  }

  /**
   * Check if we can go back in history
   */
  get canGoBack(): boolean {
    return this._historyIndex > 0;
  }

  /**
   * Check if we can go forward in history
   */
  get canGoForward(): boolean {
    return this._historyIndex < this._history.length - 1;
  }

  /**
   * Initialize the router with routes
   */
  initialize(routes: IRoute[]): void {
    this._routes = [...routes];
    this.setupHashNavigation();

    // Navigate to current hash or default route
    const currentPath = this.currentPath;
    this.navigate(currentPath, { replace: true });
  }

  /**
   * Add a route to the router
   */
  addRoute(route: IRoute): void {
    this._routes.push(route);
  }

  /**
   * Remove a route from the router
   */
  removeRoute(path: string): boolean {
    const routeCount = this._routes.length;
    for (let i = 0; i < routeCount; i++) {
      if (this._routes[i]?.path === path) {
        this._routes.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  /**
   * Navigate to a specific path
   */
  navigate(path: string, options: INavigationOptions = {}): boolean {
    // Prevent concurrent navigation
    if (this._isNavigating) {
      return false;
    }

    this._isNavigating = true;

    try {
      // Find matching route
      const match = this.matchRoute(path);
      if (!match) {
        this.emit('navigationError', {
          error: new Error(`No route found for path: ${path}`),
          to: null,
        });
        return false;
      }

      // Check route guards
      if (!options.skipGuards && !this.checkRouteGuards(match.route)) {
        this.emit('navigationError', {
          error: new Error(`Route guard failed for: ${path}`),
          to: match,
        });
        return false;
      }

      // Emit before navigate event
      this.emit('beforeNavigate', {
        from: this._currentMatch,
        to: match,
        data: options.data,
      });

      // Update browser hash
      if (typeof window !== 'undefined') {
        if (options.replace) {
          window.location.replace(`#${path}`);
        } else {
          window.location.hash = path;
        }
      }

      // Update history
      this.updateHistory(path, options.replace);

      // Set current match
      const previousMatch = this._currentMatch;
      this._currentMatch = match;

      // Emit after navigate event
      this.emit('afterNavigate', {
        from: previousMatch,
        to: match,
        data: options.data,
      });

      // Emit route changed event
      this.emit('routeChanged', {
        from: previousMatch,
        to: match,
      });

      return true;
    } catch (error) {
      this.emit('navigationError', {
        error: error as Error,
        to: null,
      });
      return false;
    } finally {
      this._isNavigating = false;
    }
  }

  /**
   * Navigate to a route by name
   */
  navigateByName(
    name: string,
    params: Record<string, string> = {},
    options: INavigationOptions = {},
  ): boolean {
    const route = this.findRouteByName(name);
    if (!route) {
      return false;
    }

    const path = this.buildPath(route.path, params);
    return this.navigate(path, options);
  }

  /**
   * Go back in navigation history
   */
  goBack(): boolean {
    if (!this.canGoBack) {
      return false;
    }

    this._historyIndex--;
    const path = this._history[this._historyIndex];
    if (path) {
      return this.navigate(path, { replace: true });
    }
    return false;
  }

  /**
   * Go forward in navigation history
   */
  goForward(): boolean {
    if (!this.canGoForward) {
      return false;
    }

    this._historyIndex++;
    const path = this._history[this._historyIndex];
    if (path) {
      return this.navigate(path, { replace: true });
    }
    return false;
  }

  /**
   * Match a path against registered routes
   */
  private matchRoute(path: string): IRouteMatch | null {
    const routes = this._routes;
    const routeCount = routes.length;

    // Extract query parameters
    const [pathname, queryString] = path.split('?');
    const query = this.parseQueryString(queryString || '');
    const cleanPathname = pathname || '/';

    // Hot path: try exact matches first
    for (let i = 0; i < routeCount; i++) {
      const route = routes[i];
      if (!route) continue;

      if (route.path === cleanPathname) {
        return {
          route,
          params: {},
          query,
        };
      }
    }

    // Try pattern matches
    for (let i = 0; i < routeCount; i++) {
      const route = routes[i];
      if (!route) continue;

      const params = this.matchPattern(route.path, cleanPathname);
      if (params !== null) {
        return {
          route,
          params,
          query,
        };
      }
    }

    return null;
  }

  /**
   * Match a path pattern and extract parameters
   */
  private matchPattern(
    pattern: string,
    path: string,
  ): Record<string, string> | null {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params: Record<string, string> = {};
    const partCount = patternParts.length;

    for (let i = 0; i < partCount; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (!patternPart || !pathPart) continue;

      if (patternPart.startsWith(':')) {
        // Parameter segment
        const paramName = patternPart.slice(1);
        params[paramName] = decodeURIComponent(pathPart);
      } else if (patternPart !== pathPart) {
        // Literal segment mismatch
        return null;
      }
    }

    return params;
  }

  /**
   * Parse query string into object
   */
  private parseQueryString(queryString: string): Record<string, string> {
    const params: Record<string, string> = {};

    if (!queryString) {
      return params;
    }

    const pairs = queryString.split('&');
    const pairCount = pairs.length;

    for (let i = 0; i < pairCount; i++) {
      const pair = pairs[i];
      if (!pair) continue;

      const [key, value] = pair.split('=');
      if (key) {
        params[decodeURIComponent(key)] = decodeURIComponent(value || '');
      }
    }

    return params;
  }

  /**
   * Build path from pattern and parameters
   */
  private buildPath(pattern: string, params: Record<string, string>): string {
    let path = pattern;

    for (const key in params) {
      const value = params[key];
      if (value !== undefined) {
        path = path.replace(`:${key}`, encodeURIComponent(value));
      }
    }

    return path;
  }

  /**
   * Find route by name
   */
  private findRouteByName(name: string): IRoute | null {
    const routes = this._routes;
    const routeCount = routes.length;

    for (let i = 0; i < routeCount; i++) {
      const route = routes[i];
      if (route?.name === name) {
        return route;
      }
    }

    return null;
  }

  /**
   * Check route guards
   */
  private checkRouteGuards(route: IRoute): boolean {
    if (!route.guards) {
      return true;
    }

    const guards = route.guards;
    const guardCount = guards.length;

    for (let i = 0; i < guardCount; i++) {
      const guard = guards[i];
      if (guard && !guard()) {
        return false;
      }
    }

    return true;
  }

  /**
   * Update navigation history
   */
  private updateHistory(path: string, replace = false): void {
    if (replace) {
      if (
        this._historyIndex >= 0 &&
        this._historyIndex < this._history.length
      ) {
        this._history[this._historyIndex] = path;
      }
    } else {
      // Remove any forward history
      this._history = this._history.slice(0, this._historyIndex + 1);
      this._history.push(path);
      this._historyIndex = this._history.length - 1;
    }
  }

  /**
   * Setup hash change navigation
   */
  private setupHashNavigation(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', () => {
        const path = this.currentPath;
        if (this._currentMatch?.route.path !== path) {
          this.navigate(path, { replace: true });
        }
      });
    }
  }
}
