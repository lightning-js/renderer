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

const stylePropertyMap: { [key: string]: string } = {
  alpha: 'opacity',
  x: 'left',
  y: 'top',
  width: 'width',
  height: 'height',
  color: 'background-color',
  src: 'background-image',
  zIndex: 'zIndex',
  fontFamily: 'font-family',
  fontSize: 'font-size',
  fontStyle: 'font-style',
  fontWeight: 'font-weight',
  fontStretch: 'font-stretch',
  lineHeight: 'line-height',
  letterSpacing: 'letter-spacing',
  textAlign: 'text-align',
  overflowSuffix: 'overflow-suffix',
  maxLines: 'max-lines',
  contain: 'contain',
  verticalAlign: 'vertical-align',
};

const domPropertyMap: { [key: string]: string } = {
  id: 'id',
};

const colorPropertyList = [
  'color',
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
    // create div but take the dimensions of the canvas element

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

    return new Proxy(node, {
      set: (target, property: keyof INodeWritableProps, value) => {
        this.updateNodeProperty(div, property, value);
        return Reflect.set(target, property, value);
      },
      get: (target: INode, property: keyof INode, receiver: any): any => {
        if (property === 'destroy') {
          this.destroyNode(target);
        }

        if (property === 'animate') {
          // this.animateNode();
        }

        return Reflect.get(target, property, receiver);
      },
    });
  }

  createTextNode(
    driver: ICoreDriver,
    properties: ITextNodeWritableProps,
  ): ITextNode {
    const node = driver.createTextNode(properties);
    const div = this.createDiv(node, properties);

    return new Proxy(node, {
      set: (target, property: keyof INodeWritableProps, value) => {
        if (property === 'parent' && value === null) {
          this.destroyNode(node);
        }

        this.updateNodeProperty(div, property, value);
        return Reflect.set(target, property, value);
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

    if (property === 'text') {
      div.innerHTML = String(value);
      return;
    }

    if (property === 'clipping') {
      div.style.overflow = value ? 'hidden' : 'visible';
      return;
    }

    if (property === 'rotation') {
      div.style.transform = `rotate(${value as string}rad)`;
      return;
    }

    if (
      property === 'scale' ||
      property === 'scaleX' ||
      property === 'scaleY'
    ) {
      div.style.transform = `${property}(${value as string})`;
      return;
    }

    if (property === 'src') {
      div.style.backgroundImage = `url(${value as string})`;
      return;
    }

    // check colors
    if (colorPropertyList.includes(property as string)) {
      const color = value as number;

      // convert 0xRRGGBBAA to rgba
      const a = (color & 0xff) / 255; // alpha
      const b = (color >> 8) & 0xff; // blue channel
      const g = (color >> 16) & 0xff; // green channel
      const r = (color >> 24) & 0xff; // red channel

      div.style.setProperty(
        stylePropertyMap[property as string] as string,
        `rgba(${r},${g},${b},${a})`,
      );
      return;
    }

    // CSS mappable attribute
    if (stylePropertyMap[property]) {
      div.style.setProperty(
        stylePropertyMap[property] as string,
        String(value),
      );
      return;
    }

    // DOM properties
    if (domPropertyMap[property]) {
      div.setAttribute(String(stylePropertyMap[property]), String(value));
      return;
    }

    // all else can be mapped to data-attributes
    // div.setAttribute(`data-${property}`, String(value));
  }
}
