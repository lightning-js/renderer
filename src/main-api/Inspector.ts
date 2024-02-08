import type {
  INode,
  INodeAnimatableProps,
  INodeWritableProps,
  ITextNode,
  ITextNodeWritableProps,
} from './INode.js';
import type { ICoreDriver } from './ICoreDriver.js';
import { type RendererMainSettings } from './RendererMain.js';
import type { AnimationSettings } from '../core/animations/CoreAnimation.js';
import type { IAnimationController } from '../common/IAnimationController.js';

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
  [key: string]: (value: string | number | boolean) => string | StyleResponse;
} = {
  alpha: () => 'opacity',
  x: () => 'left',
  y: () => 'top',
  width: () => 'width',
  height: () => 'height',
  zIndex: () => 'zIndex',
  fontFamily: () => 'font-family',
  fontSize: () => 'font-size',
  fontStyle: () => 'font-style',
  fontWeight: () => 'font-weight',
  fontStretch: () => 'font-stretch',
  lineHeight: () => 'line-height',
  letterSpacing: () => 'letter-spacing',
  textAlign: () => 'text-align',
  overflowSuffix: () => 'overflow-suffix',
  maxLines: () => 'max-lines',
  contain: () => 'contain',
  verticalAlign: () => 'vertical-align',
  clipping: (v) => {
    return { prop: 'overflow', value: v ? 'hidden' : 'visible' };
  },
  rotation: (v) => {
    return { prop: 'transform', value: `rotate(${v}rad)` };
  },
  scale: (v) => {
    return { prop: 'transform', value: `scale(${v})` };
  },
  scaleX: (v) => {
    return { prop: 'transform', value: `scaleX(${v})` };
  },
  scaleY: (v) => {
    return { prop: 'transform', value: `scaleY(${v})` };
  },
  src: (v) => {
    return { prop: 'background-image', value: `url(${v})` };
  },
  color: (v) => {
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
  id: 'id',
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

export class Inspector {
  private root: HTMLElement;

  constructor(canvas: HTMLCanvasElement, settings: RendererMainSettings) {
    if (!settings) {
      throw new Error('settings is required');
    }

    // calc dimensions based on the devicePixelRatio
    const height = Math.ceil(
      settings.appHeight ?? 1080 / (settings.deviceLogicalPixelRatio ?? 1),
    );

    const width = Math.ceil(
      settings.appWidth ?? 1900 / (settings.deviceLogicalPixelRatio ?? 1),
    );

    this.root = document.createElement('div');
    this.root.id = 'root';
    this.root.style.left = '0';
    this.root.style.top = '0';
    this.root.style.width = `${width}px`;
    this.root.style.height = `${height}px`;
    this.root.style.position = 'absolute';
    this.root.style.transformOrigin = '0 0 0';
    this.root.style.transform = `scale(${
      settings.deviceLogicalPixelRatio ?? 1
    },${settings.deviceLogicalPixelRatio ?? 1})`;
    this.root.style.overflow = 'hidden';
    this.root.style.zIndex = '-65535';

    document.body.appendChild(this.root);

    console.warn('Inspector is enabled, this will impact performance');
  }

  createDiv(
    node: INode | ITextNode,
    properties: INodeWritableProps | ITextNodeWritableProps,
  ): HTMLElement {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.id = node.id.toString();

    // set initial properties
    for (const key in properties) {
      this.updateNodeProperty(
        div,
        // really typescript? really?
        key as keyof (INodeWritableProps & ITextNodeWritableProps),
        (properties as INodeWritableProps & ITextNodeWritableProps)[
          key as keyof (INodeWritableProps & ITextNodeWritableProps)
        ],
      );
    }

    return div;
  }

  createNode(driver: ICoreDriver, properties: INodeWritableProps): INode {
    const node = driver.createNode(properties);
    const div = this.createDiv(node, properties);
    return this.createProxy(node, div);
  }

  createTextNode(
    driver: ICoreDriver,
    properties: ITextNodeWritableProps,
  ): ITextNode {
    const node = driver.createTextNode(properties);
    const div = this.createDiv(node, properties);
    return this.createProxy(node, div) as ITextNode;
  }

  createProxy(node: INode | ITextNode, div: HTMLElement): INode | ITextNode {
    return new Proxy(node, {
      set: (target, property: keyof INodeWritableProps, value) => {
        this.updateNodeProperty(div, property, value);
        return Reflect.set(target, property, value);
      },
      get: (target, property: keyof INode, receiver: any): any => {
        if (property === 'destroy') {
          this.destroyNode(target);
        }

        if (property === 'animate') {
          return (props: INodeAnimatableProps, settings: AnimationSettings) => {
            const anim = target.animate(props, settings);

            // Trap the animate start function so we can update the inspector accordingly
            return new Proxy(anim, {
              get: (target, property: keyof IAnimationController, receiver) => {
                if (property === 'start') {
                  this.animateNode(div, node, props, settings);
                }

                return Reflect.get(target, property, receiver);
              },
            });
          };
        }

        return Reflect.get(target, property, receiver);
      },
    });
  }

  destroyNode(node: INode | ITextNode) {
    const div = document.getElementById(node.id.toString());
    div?.remove();
  }

  updateNodeProperty(
    div: HTMLElement,
    property: keyof INodeWritableProps | keyof ITextNodeWritableProps,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any,
  ) {
    if (!value) {
      return;
    }

    /**
     * Special case for parent property
     */
    if (property === 'parent') {
      const parentId: number = (value as INode).id;

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
      return;
    }

    // special case for color gradients (normal colors are handled by the stylePropertyMap)
    // FIXME the renderer seems to return the same number for all colors
    // if (gradientColorPropertyMap.includes(property as string)) {
    //   const color = convertColorToRgba(value as number);
    //   div.setAttribute(`data-${property}`, color);
    //   return;
    // }

    // CSS mappable attribute
    if (stylePropertyMap[property]) {
      const mappedStyleResponse = stylePropertyMap[property]?.(value);

      if (typeof mappedStyleResponse === 'string') {
        div.style.setProperty(mappedStyleResponse, String(value));
      } else if (typeof mappedStyleResponse === 'object') {
        div.style.setProperty(
          mappedStyleResponse.prop,
          mappedStyleResponse.value,
        );
      }

      return;
    }

    // DOM properties
    if (domPropertyMap[property]) {
      div.setAttribute(String(stylePropertyMap[property]), String(value));
      return;
    }
  }

  // simple animation handler
  animateNode(
    div: HTMLElement,
    node: INode,
    props: INodeAnimatableProps,
    settings: AnimationSettings,
  ) {
    console.log('animateNode', props, settings);

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
    } = props;

    // ignoring loops and repeats for now, as that might be a bit too much for the inspector
    function animate() {
      setTimeout(() => {
        div.style.top = `${y}px`;
        div.style.left = `${x}px`;
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
