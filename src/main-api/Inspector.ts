import type {
  INode,
  INodeWritableProps,
  ITextNode,
  ITextNodeWritableProps,
} from './INode.js';
import type { ICoreDriver } from './ICoreDriver.js';
import { type RendererMainSettings } from './RendererMain.js';

const stylePropertyMap: { [key: string]: string } = {
  alpha: 'opacity',
  x: 'left',
  y: 'top',
  width: 'width',
  height: 'height',
  color: 'backgroundColor',
  src: 'backgroundImage',
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
    this.root.style.zIndex = '65535';

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
        if (property === 'parent' && value === null) {
          this.destroyNode(node);
        }

        this.updateNodeProperty(div, property, value);
        return Reflect.set(target, property, value);
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
    value: any,
  ) {
    // dont do anything with falsey values
    if (!value) {
      return;
    }

    if (property === 'parent') {
      const parentId = value.id;

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
      div.innerHTML = value;
      return;
    }

    if (property === 'clipping') {
      div.style.overflow = value ? 'hidden' : 'visible';
      return;
    }

    if (property === 'rotation') {
      div.style.transform = `rotate(${value}rad)`;
      return;
    }

    if (
      property === 'scale' ||
      property === 'scaleX' ||
      property === 'scaleY'
    ) {
      div.style.transform = `${property}(${value})`;
      return;
    }

    // TODO handle texture
    // TODO handle shader
    // TODO animations (whoa!)

    // CSS mappable attribute
    if (stylePropertyMap[property]) {
      div.style.setProperty(
        String(stylePropertyMap[property]),
        value.toString(),
      );
      return;
    }

    // DOM properties
    if (domPropertyMap[property]) {
      div.setAttribute(String(stylePropertyMap[property]), value.toString());
      return;
    }

    // all else can be mapped to data-attributes
    div.setAttribute(`data-${property}`, value);
  }
}
