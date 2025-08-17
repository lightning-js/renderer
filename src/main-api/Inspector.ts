import {
  CoreNode,
  type CoreNodeAnimateProps,
  type CoreNodeProps,
} from '../core/CoreNode.js';
import { type RendererMainSettings } from './Renderer.js';
import type { AnimationSettings } from '../core/animations/CoreAnimation.js';
import type {
  IAnimationController,
  AnimationControllerState,
} from '../common/IAnimationController.js';
import { isProductionEnvironment } from '../utils.js';
import { CoreTextNode, type CoreTextNodeProps } from '../core/CoreTextNode.js';

/**
 * Inspector Options
 *
 * Configuration options for the Inspector's performance monitoring features.
 */
export interface InspectorOptions {
  /**
   * Enable performance monitoring for setter calls
   *
   * @defaultValue true
   */
  enablePerformanceMonitoring: boolean;

  /**
   * Threshold for excessive setter calls before logging a warning
   *
   * @defaultValue 100
   */
  excessiveCallThreshold: number;

  /**
   * Time interval in milliseconds to reset the setter call counters
   *
   * @defaultValue 5000
   */
  resetInterval: number;

  /**
   * Enable animation monitoring and statistics tracking
   *
   * @defaultValue true
   */
  enableAnimationMonitoring: boolean;

  /**
   * Maximum number of animations to keep in history for statistics
   *
   * @defaultValue 1000
   */
  maxAnimationHistory: number;

  /**
   * Automatically print animation statistics every X seconds (0 to disable)
   *
   * @defaultValue 0
   */
  animationStatsInterval: number;
}

/**
 * Inspector
 *
 * The inspector is a tool that allows you to inspect the state of the renderer
 * and the nodes that are being rendered. It is a tool that is used for debugging
 * and development purposes.
 *
 * The inspector will generate a DOM tree that mirrors the state of the renderer
 */

/**
 * stylePropertyMap is a map of renderer properties that are mapped to CSS properties
 *
 * It can either return a string or an object with a prop and value property. Once a
 * property is found in the map, the value is set on the style of the div element.
 * Erik H made me do it.
 */
interface StyleResponse {
  prop: string;
  value: string;
}
const stylePropertyMap: {
  [key: string]: (
    value: string | number | boolean,
  ) => string | StyleResponse | null;
} = {
  alpha: (v) => {
    if (v === 1) {
      return null;
    }

    return { prop: 'opacity', value: `${v}` };
  },
  x: (x) => {
    return { prop: 'left', value: `${x}px` };
  },
  y: (y) => {
    return { prop: 'top', value: `${y}px` };
  },
  width: (w) => {
    if (w === 0) {
      return null;
    }

    return { prop: 'width', value: `${w}px` };
  },
  height: (h) => {
    if (h === 0) {
      return null;
    }

    return { prop: 'height', value: `${h}px` };
  },
  fontSize: (fs) => {
    if (fs === 0) {
      return null;
    }

    return { prop: 'font-size', value: `${fs}px` };
  },
  lineHeight: (lh) => {
    if (lh === 0) {
      return null;
    }

    return { prop: 'line-height', value: `${lh}px` };
  },
  zIndex: () => 'z-index',
  fontFamily: () => 'font-family',
  fontStyle: () => 'font-style',
  letterSpacing: () => 'letter-spacing',
  textAlign: () => 'text-align',
  overflowSuffix: () => 'overflow-suffix',
  maxLines: () => 'max-lines',
  contain: () => 'contain',
  verticalAlign: () => 'vertical-align',
  clipping: (v) => {
    if (v === false) {
      return null;
    }

    return { prop: 'overflow', value: v ? 'hidden' : 'visible' };
  },
  rotation: (v) => {
    if (v === 0) {
      return null;
    }

    return { prop: 'transform', value: `rotate(${v}rad)` };
  },
  scale: (v) => {
    if (v === 1) {
      return null;
    }

    return { prop: 'transform', value: `scale(${v})` };
  },
  scaleX: (v) => {
    if (v === 1) {
      return null;
    }

    return { prop: 'transform', value: `scaleX(${v})` };
  },
  scaleY: (v) => {
    if (v === 1) {
      return null;
    }

    return { prop: 'transform', value: `scaleY(${v})` };
  },
  color: (v) => {
    if (v === 0) {
      return null;
    }

    return { prop: 'color', value: convertColorToRgba(v as number) };
  },
};

const convertColorToRgba = (color: number) => {
  const a = (color & 0xff) / 255;
  const b = (color >> 8) & 0xff;
  const g = (color >> 16) & 0xff;
  const r = (color >> 24) & 0xff;
  return `rgba(${r},${g},${b},${a})`;
};

const domPropertyMap: { [key: string]: string } = {
  id: 'test-id',
};

const gradientColorPropertyMap = [
  'colorTop',
  'colorBottom',
  'colorLeft',
  'colorRight',
  'colorTl',
  'colorTr',
  'colorBl',
  'colorBr',
];

const knownProperties = new Set<string>([
  ...Object.keys(stylePropertyMap),
  ...Object.keys(domPropertyMap),
  // ...gradientColorPropertyMap,
  'src',
  'parent',
  'data',
]);

export class Inspector {
  private root: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private mutationObserver: MutationObserver = new MutationObserver(() => {});
  private resizeObserver: ResizeObserver = new ResizeObserver(() => {});
  private height = 1080;
  private width = 1920;
  private scaleX = 1;
  private scaleY = 1;

  // Performance monitoring for frequent setter calls
  private static setterCallCount = new Map<
    string,
    { count: number; lastReset: number; nodeId: number }
  >();

  // Animation monitoring structures
  private static activeAnimations = new Map<
    string,
    {
      nodeId: number;
      animationId: string;
      startTime: number;
      props: CoreNodeAnimateProps;
      settings: AnimationSettings;
      controller: IAnimationController;
      state: AnimationControllerState;
    }
  >();

  private static animationHistory: Array<{
    nodeId: number;
    animationId: string;
    startTime: number;
    endTime: number;
    duration: number;
    actualDuration: number;
    props: CoreNodeAnimateProps;
    settings: AnimationSettings;
    completionType: 'finished' | 'stopped' | 'cancelled';
  }> = [];

  // Performance monitoring settings (configured via constructor)
  private performanceSettings: InspectorOptions = {
    enablePerformanceMonitoring: true,
    excessiveCallThreshold: 100,
    resetInterval: 5000,
    enableAnimationMonitoring: true,
    maxAnimationHistory: 1000,
    animationStatsInterval: 15,
  };

  // Animation stats printing timer
  private animationStatsTimer: NodeJS.Timeout | null = null;

  constructor(canvas: HTMLCanvasElement, settings: RendererMainSettings) {
    // if (isProductionEnvironment === true) return;

    if (!settings) {
      throw new Error('settings is required');
    }

    // Initialize performance monitoring settings with defaults
    this.performanceSettings = {
      enablePerformanceMonitoring:
        settings.inspectorOptions?.enablePerformanceMonitoring ?? true,
      excessiveCallThreshold:
        settings.inspectorOptions?.excessiveCallThreshold ?? 100,
      resetInterval: settings.inspectorOptions?.resetInterval ?? 5000,
      enableAnimationMonitoring:
        settings.inspectorOptions?.enableAnimationMonitoring ?? true,
      maxAnimationHistory:
        settings.inspectorOptions?.maxAnimationHistory ?? 1000,
      animationStatsInterval:
        settings.inspectorOptions?.animationStatsInterval ?? 15,
    };

    // calc dimensions based on the devicePixelRatio
    this.height = Math.ceil(
      settings.appHeight ?? 1080 / (settings.deviceLogicalPixelRatio ?? 1),
    );

    this.width = Math.ceil(
      settings.appWidth ?? 1920 / (settings.deviceLogicalPixelRatio ?? 1),
    );

    this.scaleX = settings.deviceLogicalPixelRatio ?? 1;
    this.scaleY = settings.deviceLogicalPixelRatio ?? 1;

    this.canvas = canvas;
    this.root = document.createElement('div');
    this.setRootPosition();
    document.body.appendChild(this.root);

    //listen for changes on canvas
    this.mutationObserver = new MutationObserver(
      this.setRootPosition.bind(this),
    );
    this.mutationObserver.observe(canvas, {
      attributes: true,
      childList: false,
      subtree: false,
    });

    // Create a ResizeObserver to watch for changes in the element's size
    this.resizeObserver = new ResizeObserver(this.setRootPosition.bind(this));
    this.resizeObserver.observe(canvas);

    //listen for changes on window
    window.addEventListener('resize', this.setRootPosition.bind(this));

    // Start animation stats timer if enabled
    this.startAnimationStatsTimer();

    console.warn('Inspector is enabled, this will impact performance');
  }

  /**
   * Track setter calls for performance monitoring
   * Only active when Inspector is loaded
   */
  private trackSetterCall(nodeId: number, setterName: string): void {
    if (!this.performanceSettings.enablePerformanceMonitoring) {
      return;
    }

    const key = `${nodeId}_${setterName}`;
    const now = Date.now();
    const existing = Inspector.setterCallCount.get(key);

    if (!existing) {
      Inspector.setterCallCount.set(key, { count: 1, lastReset: now, nodeId });
      return;
    }

    // Reset counter if enough time has passed
    if (now - existing.lastReset > this.performanceSettings.resetInterval) {
      existing.count = 1;
      existing.lastReset = now;
      return;
    }

    existing.count++;

    // Log if threshold exceeded
    if (existing.count === this.performanceSettings.excessiveCallThreshold) {
      console.warn(
        `🚨 Inspector Performance Warning: Setter '${setterName}' called ${existing.count} times in ${this.performanceSettings.resetInterval}ms on node ${nodeId}`,
      );
    } else if (
      existing.count > this.performanceSettings.excessiveCallThreshold &&
      existing.count % 50 === 0
    ) {
      console.warn(
        `🚨 Inspector Performance Warning: Setter '${setterName}' called ${existing.count} times in ${this.performanceSettings.resetInterval}ms on node ${nodeId} (continuing...)`,
      );
    }
  }

  /**
   * Get current performance monitoring statistics
   */
  public static getPerformanceStats(): Array<{
    nodeId: number;
    setterName: string;
    count: number;
    timeWindow: number;
  }> {
    const stats: Array<{
      nodeId: number;
      setterName: string;
      count: number;
      timeWindow: number;
    }> = [];
    const now = Date.now();

    Inspector.setterCallCount.forEach((data, key) => {
      const parts = key.split('_');
      const nodeIdStr = parts[0];
      const setterName = parts[1];

      if (nodeIdStr && setterName) {
        const timeWindow = now - data.lastReset;

        stats.push({
          nodeId: parseInt(nodeIdStr, 10),
          setterName,
          count: data.count,
          timeWindow,
        });
      }
    });

    return stats.sort((a, b) => b.count - a.count);
  }

  /**
   * Clear performance monitoring statistics
   */
  public static clearPerformanceStats(): void {
    Inspector.setterCallCount.clear();
  }

  /**
   * Generate a unique animation ID
   */
  private static generateAnimationId(): string {
    return `anim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Wrap animation controller with monitoring capabilities
   */
  private wrapAnimationController(
    controller: IAnimationController,
    nodeId: number,
    props: CoreNodeAnimateProps,
    settings: AnimationSettings,
    div: HTMLElement,
  ): IAnimationController {
    if (!this.performanceSettings.enableAnimationMonitoring) {
      // Just add the basic DOM animation without tracking
      const originalStart = controller.start.bind(controller);
      controller.start = () => {
        this.animateNode(div, props, settings);
        return originalStart();
      };
      return controller;
    }

    const animationId = Inspector.generateAnimationId();

    // Create wrapper controller
    const wrappedController: IAnimationController = {
      start: () => {
        this.trackAnimationStart(
          animationId,
          nodeId,
          props,
          settings,
          controller,
        );
        this.animateNode(div, props, settings);
        return controller.start();
      },

      stop: () => {
        this.trackAnimationEnd(animationId, 'stopped');
        return controller.stop();
      },

      pause: () => {
        this.updateAnimationState(animationId, 'paused');
        return controller.pause();
      },

      restore: () => {
        this.trackAnimationEnd(animationId, 'cancelled');
        return controller.restore();
      },

      waitUntilStopped: () => {
        return controller.waitUntilStopped().then(() => {
          this.trackAnimationEnd(animationId, 'finished');
        });
      },

      get state() {
        return controller.state;
      },

      // Event emitter methods
      on: controller.on.bind(controller),
      off: controller.off.bind(controller),
      once: controller.once.bind(controller),
      emit: controller.emit.bind(controller),
    };

    // Track animation events
    controller.on('animating', () => {
      this.updateAnimationState(animationId, 'running');
    });

    controller.on('stopped', () => {
      this.trackAnimationEnd(animationId, 'finished');
    });

    return wrappedController;
  }

  /**
   * Track animation start
   */
  private trackAnimationStart(
    animationId: string,
    nodeId: number,
    props: CoreNodeAnimateProps,
    settings: AnimationSettings,
    controller: IAnimationController,
  ): void {
    const startTime = Date.now();

    Inspector.activeAnimations.set(animationId, {
      nodeId,
      animationId,
      startTime,
      props,
      settings,
      controller,
      state: 'scheduled',
    });
  }

  /**
   * Update animation state
   */
  private updateAnimationState(
    animationId: string,
    state: AnimationControllerState,
  ): void {
    const animation = Inspector.activeAnimations.get(animationId);
    if (animation) {
      animation.state = state;
    }
  }

  /**
   * Track animation end
   */
  private trackAnimationEnd(
    animationId: string,
    completionType: 'finished' | 'stopped' | 'cancelled',
  ): void {
    const animation = Inspector.activeAnimations.get(animationId);
    if (!animation) return;

    const endTime = Date.now();
    const actualDuration = endTime - animation.startTime;
    const expectedDuration = animation.settings.duration || 1000;

    // Move to history
    Inspector.animationHistory.unshift({
      nodeId: animation.nodeId,
      animationId: animation.animationId,
      startTime: animation.startTime,
      endTime,
      duration: expectedDuration,
      actualDuration,
      props: animation.props,
      settings: animation.settings,
      completionType,
    });

    // Limit history size for performance
    if (
      Inspector.animationHistory.length >
      this.performanceSettings.maxAnimationHistory
    ) {
      Inspector.animationHistory.splice(
        this.performanceSettings.maxAnimationHistory,
      );
    }

    // Remove from active animations
    Inspector.activeAnimations.delete(animationId);
  }

  /**
   * Get currently active animations
   */
  public static getActiveAnimations(): Array<{
    nodeId: number;
    animationId: string;
    startTime: number;
    duration: number;
    elapsedTime: number;
    props: CoreNodeAnimateProps;
    settings: AnimationSettings;
    state: AnimationControllerState;
  }> {
    const now = Date.now();
    const activeAnimations: Array<{
      nodeId: number;
      animationId: string;
      startTime: number;
      duration: number;
      elapsedTime: number;
      props: CoreNodeAnimateProps;
      settings: AnimationSettings;
      state: AnimationControllerState;
    }> = [];

    Inspector.activeAnimations.forEach((animation) => {
      activeAnimations.push({
        nodeId: animation.nodeId,
        animationId: animation.animationId,
        startTime: animation.startTime,
        duration: animation.settings.duration || 1000,
        elapsedTime: now - animation.startTime,
        props: animation.props,
        settings: animation.settings,
        state: animation.state,
      });
    });

    return activeAnimations.sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * Get animation statistics
   */
  public static getAnimationStats(): {
    totalAnimations: number;
    activeCount: number;
    averageDuration: number;
  } {
    const totalAnimations = Inspector.animationHistory.length;
    const activeCount = Inspector.activeAnimations.size;

    // Calculate average duration from finished animations only
    const finishedAnimations = Inspector.animationHistory.filter(
      (anim) => anim.completionType === 'finished',
    );

    const averageDuration =
      finishedAnimations.length > 0
        ? finishedAnimations.reduce(
            (sum, anim) => sum + anim.actualDuration,
            0,
          ) / finishedAnimations.length
        : 0;

    return {
      totalAnimations,
      activeCount,
      averageDuration,
    };
  }

  /**
   * Clear animation monitoring data
   */
  public static clearAnimationStats(): void {
    Inspector.activeAnimations.clear();
    Inspector.animationHistory.length = 0;
  }

  /**
   * Start the animation stats timer if enabled
   */
  private startAnimationStatsTimer(): void {
    console.log(
      `Starting animation stats timer with interval: ${this.performanceSettings.animationStatsInterval} seconds`,
    );

    if (this.performanceSettings.animationStatsInterval > 0) {
      this.animationStatsTimer = setInterval(() => {
        this.printAnimationStats();
      }, this.performanceSettings.animationStatsInterval * 1000);
    }
  }

  /**
   * Stop the animation stats timer
   */
  private stopAnimationStatsTimer(): void {
    if (this.animationStatsTimer) {
      clearInterval(this.animationStatsTimer);
      this.animationStatsTimer = null;
    }
  }

  /**
   * Print current animation statistics to console
   */
  private printAnimationStats(): void {
    const stats = Inspector.getAnimationStats();

    console.log(
      `🎬 Animation Stats: ${stats.activeCount} active, ${
        stats.totalAnimations
      } completed, ${Math.round(stats.averageDuration)}ms avg duration`,
    );
  }
  setRootPosition() {
    if (this.root === null || this.canvas === null) {
      return;
    }

    // get the world position of the canvas object, so we can match the inspector to it
    const rect = this.canvas.getBoundingClientRect();
    const top = document.documentElement.scrollTop + rect.top;
    const left = document.documentElement.scrollLeft + rect.left;

    this.root.id = 'root';
    this.root.style.left = `${left}px`;
    this.root.style.top = `${top}px`;
    this.root.style.width = `${this.width}px`;
    this.root.style.height = `${this.height}px`;
    this.root.style.position = 'absolute';
    this.root.style.transformOrigin = '0 0 0';
    this.root.style.transform = `scale(${this.scaleX}, ${this.scaleY})`;
    this.root.style.overflow = 'hidden';
    this.root.style.zIndex = '65534';
  }

  createDiv(
    id: number,
    properties: CoreNodeProps | CoreTextNodeProps,
  ): HTMLElement {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.id = id.toString();

    // set initial properties
    for (const key in properties) {
      this.updateNodeProperty(
        div,
        // really typescript? really?
        key as keyof CoreNodeProps,
        properties[key as keyof CoreNodeProps],
        properties,
      );
    }

    return div;
  }

  createNodes(node: CoreNode): boolean {
    if (this.root === null) {
      return false;
    }

    const div = this.root.querySelector(`[id="${node.id}"]`);
    if (div === null && node instanceof CoreTextNode) {
      this.createTextNode(node);
    } else if (div === null && node instanceof CoreNode) {
      this.createNode(node);
    }

    for (const child of node.children) {
      this.createNodes(child);
    }
    return true;
  }

  createNode(node: CoreNode): CoreNode {
    const div = this.createDiv(node.id, node.props);
    (div as HTMLElement & { node: CoreNode }).node = node;
    (node as CoreNode & { div: HTMLElement }).div = div;

    node.on('inViewport', () => div.setAttribute('state', 'inViewport'));
    node.on('inBounds', () => div.setAttribute('state', 'inBounds'));
    node.on('outOfBounds', () => div.setAttribute('state', 'outOfBounds'));

    // Monitor only relevant properties by trapping with selective assignment
    return this.createProxy(node, div);
  }

  createTextNode(node: CoreNode): CoreTextNode {
    const div = this.createDiv(node.id, node.props);
    (div as HTMLElement & { node: CoreNode }).node = node;
    (node as CoreNode & { div: HTMLElement }).div = div;

    return this.createProxy(node, div) as CoreTextNode;
  }

  createProxy(
    node: CoreNode | CoreTextNode,
    div: HTMLElement,
  ): CoreNode | CoreTextNode {
    // Define traps for each property in knownProperties
    knownProperties.forEach((property) => {
      let originalProp = Object.getOwnPropertyDescriptor(node, property);

      if (originalProp === undefined) {
        // Search the prototype chain for the property descriptor
        const proto = Object.getPrototypeOf(node) as CoreNode | CoreTextNode;
        originalProp = Object.getOwnPropertyDescriptor(proto, property);
      }

      if (originalProp === undefined) {
        return;
      }

      Object.defineProperty(node, property, {
        get() {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return originalProp?.get?.call(node);
        },
        set: (value) => {
          // Track setter call for performance monitoring
          this.trackSetterCall(node.id, property);

          originalProp?.set?.call(node, value);
          this.updateNodeProperty(
            div,
            property as keyof CoreNodeProps | keyof CoreTextNodeProps,
            value,
            node.props,
          );
        },
        configurable: true,
        enumerable: true,
      });
    });

    const originalDestroy = node.destroy;
    Object.defineProperty(node, 'destroy', {
      value: () => {
        this.destroyNode(node.id);
        originalDestroy.call(node);
      },
      configurable: true,
    });

    const originalAnimate = node.animate;
    Object.defineProperty(node, 'animate', {
      value: (
        props: CoreNodeAnimateProps,
        settings: AnimationSettings,
      ): IAnimationController => {
        const animationController = originalAnimate.call(node, props, settings);

        // Wrap animation controller with monitoring
        return this.wrapAnimationController(
          animationController,
          node.id,
          props,
          settings,
          div,
        );
      },
      configurable: true,
    });

    return node;
  }

  public destroy() {
    // Stop animation stats timer
    this.stopAnimationStatsTimer();

    // Remove DOM observers
    this.mutationObserver.disconnect();
    this.resizeObserver.disconnect();

    // Remove resize listener
    window.removeEventListener('resize', this.setRootPosition.bind(this));
    if (this.root && this.root.parentNode) {
      this.root.remove();
    }

    // Clean up animation monitoring data
    Inspector.clearAnimationStats();
  }

  destroyNode(id: number) {
    const div = document.getElementById(id.toString());
    div?.remove();
  }

  updateNodeProperty(
    div: HTMLElement,
    property: keyof CoreNodeProps | keyof CoreTextNodeProps,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any,
    props: CoreNodeProps | CoreTextNodeProps,
  ) {
    if (this.root === null || value === undefined || value === null) {
      return;
    }

    /**
     * Special case for parent property
     */
    if (property === 'parent') {
      const parentId: number = value.id;

      // only way to detect if the parent is the root node
      // if you are reading this and have a better way, please let me know
      if (parentId === 1) {
        this.root.appendChild(div);
        return;
      }

      const parent = document.getElementById(parentId.toString());
      parent?.appendChild(div);
      return;
    }

    // special case for text
    if (property === 'text') {
      div.innerHTML = String(value);

      // hide text because we can't render SDF fonts
      // it would look weird and obstruct the WebGL rendering
      div.style.visibility = 'hidden';
      return;
    }

    // special case for images
    // we're not setting any CSS properties to avoid images getting loaded twice
    // as the renderer will handle the loading of the image. Setting it to `data-src`
    if (property === 'src' && value) {
      div.setAttribute(`data-src`, String(value));
      return;
    }

    // special case for color gradients (normal colors are handled by the stylePropertyMap)
    // FIXME the renderer seems to return the same number for all colors
    // if (gradientColorPropertyMap.includes(property as string)) {
    //   const color = convertColorToRgba(value as number);
    //   div.setAttribute(`data-${property}`, color);
    //   return;
    // }

    if (property === 'rtt' && value) {
      div.setAttribute('data-rtt', String(value));
      return;
    }

    // CSS mappable attribute
    if (stylePropertyMap[property]) {
      const mappedStyleResponse = stylePropertyMap[property]?.(value);

      if (mappedStyleResponse === null) {
        return;
      }

      if (typeof mappedStyleResponse === 'string') {
        div.style.setProperty(mappedStyleResponse, String(value));
        return;
      }

      if (typeof mappedStyleResponse === 'object') {
        let value = mappedStyleResponse.value;
        if (property === 'x') {
          const mount = props.mountX;
          const width = props.w;

          if (mount) {
            value = `${parseInt(value) - width * mount}px`;
          }
        } else if (property === 'y') {
          const mount = props.mountY;
          const height = props.h;

          if (mount) {
            value = `${parseInt(value) - height * mount}px`;
          }
        }
        div.style.setProperty(mappedStyleResponse.prop, value);
      }

      return;
    }

    // DOM properties
    if (domPropertyMap[property]) {
      const domProperty = domPropertyMap[property];
      if (!domProperty) {
        return;
      }

      div.setAttribute(String(domProperty), String(value));
      return;
    }

    // custom data properties
    if (property === 'data') {
      for (const key in value) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const keyValue: unknown = value[key];
        if (keyValue === undefined) {
          div.removeAttribute(`data-${key}`);
        } else {
          div.setAttribute(`data-${key}`, String(keyValue));
        }
      }
      return;
    }
  }

  updateViewport(
    width: number,
    height: number,
    deviceLogicalPixelRatio: number,
  ) {
    this.scaleX = deviceLogicalPixelRatio ?? 1;
    this.scaleY = deviceLogicalPixelRatio ?? 1;

    this.width = width;
    this.height = height;
    this.setRootPosition();
  }

  // simple animation handler
  animateNode(
    div: HTMLElement,
    props: CoreNodeAnimateProps,
    settings: AnimationSettings,
  ) {
    const {
      duration = 1000,
      delay = 0,
      // easing = 'linear',
      // repeat = 0,
      // loop = false,
      // stopMethod = false,
    } = settings;

    const {
      x,
      y,
      w,
      h,
      alpha = 1,
      rotation = 0,
      scale = 1,
      color,
      mountX,
      mountY,
    } = props;

    // ignoring loops and repeats for now, as that might be a bit too much for the inspector
    function animate() {
      setTimeout(() => {
        div.style.top = `${y - h * mountY}px`;
        div.style.left = `${x - w * mountX}px`;
        div.style.width = `${w}px`;
        div.style.height = `${h}px`;
        div.style.opacity = `${alpha}`;
        div.style.rotate = `${rotation}rad`;
        div.style.scale = `${scale}`;
        div.style.color = convertColorToRgba(color);
      }, duration);
    }

    setTimeout(animate, delay);
  }
}
