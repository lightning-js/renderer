import { SpecialElementId } from './SpecialElementId.js';
import { type IRenderDriver } from './IRenderDriver.js';
import type { RenderProps } from '../renderProperties.js';
import { MainNode } from './MainNode.js';
import { NodeBufferStruct } from '../core/NodeBufferStruct.js';
import type { PrimitiveProps } from './Primitive.js';

export interface Settings {
  width?: number;
  height?: number;
}

export class RendererMain {
  root: MainNode;
  private canvas: HTMLCanvasElement;
  private settings: Required<Settings>;
  readonly driver: IRenderDriver;
  /**
   * @remarks
   * Starts at (SpecialElementId.Root + 1) because:
   * - 0 cannot be used because ThreadX's MultiElementWrapper does not support mutations to 0 right now.
   * - 1 is reserved to mean "no parent"
   * - 2 is reserved to mean "root application primitive"
   */
  private nextId = SpecialElementId.Root + 1;
  private primitives: Map<number, MainNode> = new Map();

  constructor(
    settings: Settings,
    target: string | HTMLElement,
    driver: IRenderDriver,
  ) {
    const resolvedSettings: Required<Settings> = {
      width: settings.width || 1920,
      height: settings.height || 1080,
    };
    this.settings = resolvedSettings;
    this.driver = driver;

    const canvas = document.createElement('canvas');
    this.canvas = canvas;
    canvas.width = resolvedSettings.width;
    canvas.height = resolvedSettings.height;

    let targetEl: HTMLElement | null;
    if (typeof target === 'string') {
      targetEl = document.getElementById(target);
    } else {
      targetEl = target;
    }

    if (!targetEl) {
      throw new Error('Could not find target element');
    }

    // TODO: Get the properties for the root primiative from settings or someway where
    // they are guaranteed to be in sync with the renderer worker
    const bufferStruct = new NodeBufferStruct();
    this.root = new MainNode(bufferStruct);
    this.primitives.set(SpecialElementId.Root, this.root);

    // Hook up the driver's callbacks
    driver.onCreatePrimitive = (primitive) => {
      this.primitives.set(primitive.id, primitive);
    };

    driver.onDestroyPrimitive = (primitive) => {
      this.primitives.delete(primitive.id);
    };

    targetEl.appendChild(canvas);
  }

  async init(): Promise<void> {
    await this.driver.init(this.canvas);
  }

  createPrimitive(props: Partial<PrimitiveProps>, parent?: MainNode): MainNode {
    const id = this.nextId++;
    const bufferStruct = new NodeBufferStruct();
    bufferStruct.x = props.x || 0;
    bufferStruct.y = props.y || 0;
    bufferStruct.w = props.w || 0;
    bufferStruct.h = props.h || 0;
    bufferStruct.parentId = parent ? parent.id : SpecialElementId.Root;
    bufferStruct.color = props.color || 0xffffffff;

    const primitive = new MainNode(bufferStruct);
    this.driver.createPrimitiveRaw(primitive);
    return primitive;
  }

  getPrimitiveById(id: number): MainNode | null {
    return this.primitives.get(id) || null;
  }
}
