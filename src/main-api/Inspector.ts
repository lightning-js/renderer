import {
  CoreNode,
  type CoreNodeAnimateProps,
  type CoreNodeProps,
} from '../core/CoreNode.js';
import { type RendererMainSettings } from './Renderer.js';
import type { AnimationSettings } from '../core/animations/CoreAnimation.js';
import type { IAnimationController } from '../common/IAnimationController.js';
import { isProductionEnvironment } from '../utils.js';
import type { CoreTextNode, CoreTextNodeProps } from '../core/CoreTextNode.js';

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
  fontWeight: () => 'font-weight',
  fontStretch: () => 'font-stretch',
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
  private height = 1080;
  private width = 1920;
  private scaleX = 1;
  private scaleY = 1;

  constructor(canvas: HTMLCanvasElement, settings: RendererMainSettings) {
    if (isProductionEnvironment()) return;

    if (!settings) {
      throw new Error('settings is required');
    }

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
    const mutationObserver = new MutationObserver(
      this.setRootPosition.bind(this),
    );
    mutationObserver.observe(canvas, {
      attributes: true,
      childList: false,
      subtree: false,
    });

    // Create a ResizeObserver to watch for changes in the element's size
    const resizeObserver = new ResizeObserver(this.setRootPosition.bind(this));
    resizeObserver.observe(canvas);

    //listen for changes on window
    window.addEventListener('resize', this.setRootPosition.bind(this));

    console.warn('Inspector is enabled, this will impact performance');
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
    });

    const originalAnimate = node.animate;
    Object.defineProperty(node, 'animate', {
      value: (
        props: CoreNodeAnimateProps,
        settings: AnimationSettings,
      ): IAnimationController => {
        const animationController = originalAnimate.call(node, props, settings);

        const originalStart =
          animationController.start.bind(animationController);
        animationController.start = () => {
          this.animateNode(div, props, settings);

          return originalStart();
        };

        return animationController;
      },
    });

    return node;
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
          const width = props.width;

          if (mount) {
            value = `${parseInt(value) - width * mount}px`;
          }
        } else if (property === 'y') {
          const mount = props.mountY;
          const height = props.height;

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
      width,
      height,
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
        div.style.top = `${y - height * mountY}px`;
        div.style.left = `${x - width * mountX}px`;
        div.style.width = `${width}px`;
        div.style.height = `${height}px`;
        div.style.opacity = `${alpha}`;
        div.style.rotate = `${rotation}rad`;
        div.style.scale = `${scale}`;
        div.style.color = convertColorToRgba(color);
      }, duration);
    }

    setTimeout(animate, delay);
  }
}
