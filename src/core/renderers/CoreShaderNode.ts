import { deepClone } from '../../utils.js';
import { UpdateType, type CoreNode } from '../CoreNode.js';
import type { Stage } from '../Stage.js';

export interface AdvShaderProp<T = any, Props = Record<string, unknown>> {
  /**
   * default value
   */
  default: T;
  resolve?: (this: AdvShaderProp<T, Props>, value: T, props: Props) => T;
  transform?: (start: T, end: T, progress: number) => T;
}

export type AdvancedShaderProp<T = any, Props = Record<string, unknown>> =
  | (AdvShaderProp<T, Props> & {
      set: (value: T, props: Props) => void;
      get: (props: Props) => T;
    })
  | (AdvShaderProp<T, Props> & { set?: never; get?: never });

export type ShaderProp<T, Props> = T | AdvancedShaderProp<T, Props>;

export type ShaderProps<Props> = {
  [K in keyof Props]: ShaderProp<Props[K], Props>;
};

export function isAdvancedShaderProp(obj: any): obj is AdvancedShaderProp {
  return obj !== null && typeof obj === 'object' && obj.default !== undefined;
}

export function resolveShaderProps(
  props: Record<string, unknown>,
  propsConfig: ShaderProps<Record<string, unknown>>,
) {
  for (const key in propsConfig) {
    if (!isAdvancedShaderProp(propsConfig[key]) && props[key] === undefined) {
      props[key] = propsConfig[key];
      continue;
    }

    const pConfig = propsConfig[key]! as AdvancedShaderProp;
    const hasValue = props[key] !== undefined;

    if (pConfig.resolve !== undefined) {
      props[key] = pConfig.resolve!(props[key], props);
      continue;
    }
    if (hasValue && pConfig.set !== undefined) {
      pConfig.set(props[key], props);
      continue;
    }
    if (hasValue) {
      continue;
    }

    if (props[key] === undefined && pConfig.get === undefined) {
      props[key] = deepClone(pConfig.default);
      continue;
    }
    props[key] = pConfig.get!(props);
  }
}

/**
 * CoreShaderType is a template for ShaderTypes the renderer.
 * You could view a ShaderType as a configuration object that contains methods,
 * and values that you can use to alter the way a node is drawn by the Renderer.
 */
export interface CoreShaderType<Props extends object = any> {
  /**
   * Values you use to draw the Shader
   */
  props?: ShaderProps<Props>;
  /**
   * used for making a cache key to check for reusability, currently only used for webgl ShaderTypes but might be needed for other types of renderer
   */
  getCacheMarkers?: (props: Props) => string;
  /**
   * timer that updates every loop, by default uses the stage elapsed time If you want to do a special calculation you can define a function.
   * When you calculate your own value you can use the Stage timing values deltaTime, lastFrameTime, and currentFrameTime;
   */
  time?: boolean | ((stage: Stage) => number);
}

/**
 * CoreShaderNode is a base class that manages the shader prop values.
 * When a prop is being updated the CoreShaderNode will notify either the associated CoreNode,
 * or the Stage that there has been a change and a new render of the scene.
 */
export class CoreShaderNode<Props extends object = Record<string, unknown>> {
  readonly stage: Stage;
  readonly shaderType: CoreShaderType<Props>;
  protected propsConfig: ShaderProps<Props> | undefined;
  readonly resolvedProps: Props | undefined = undefined;
  protected definedProps: Props | undefined = undefined;
  protected node: CoreNode | null = null;
  readonly time: CoreShaderType['time'] = undefined;
  update: (() => void) | undefined = undefined;
  protected _valueKeyCache = '';
  protected _valueKeyDirty = true;
  protected _lastW = 0;
  protected _lastH = 0;

  constructor(
    readonly shaderKey: string,
    type: CoreShaderType<Props>,
    stage: Stage,
    props?: Props,
  ) {
    this.stage = stage;
    this.shaderType = type;
    this.time = type.time;

    if (props !== undefined) {
      /**
       * props are already resolved by shadermanager
       */
      this.resolvedProps = props;
      this.defineProps(props);
    }
  }

  private defineProps(props: Props) {
    const definedProps = {};
    for (const key in props) {
      const propConfig = this.shaderType.props![key];
      const isAdvancedProp = isAdvancedShaderProp(propConfig);

      Object.defineProperty(definedProps, key, {
        get: () => {
          return this.resolvedProps![key as keyof Props];
        },
        set: (value) => {
          // this.resolvedProps![key as keyof Props] = value;
          if (isAdvancedProp === true && propConfig.resolve !== undefined) {
            this.resolvedProps![key] = propConfig.resolve(
              value,
              this.resolvedProps as Record<string, unknown>,
            );
          } else if (isAdvancedProp === true && propConfig.set !== undefined) {
            propConfig.set(
              value,
              this.resolvedProps as Record<string, unknown>,
            );
          } else {
            this.resolvedProps![key] = value;
          }
          this._valueKeyDirty = true;

          if (this.update !== undefined && this.node !== null) {
            this.node.setUpdateType(UpdateType.RecalcUniforms);
          } else {
            this.stage.requestRender();
          }
        },
      });
    }
    this.definedProps = definedProps as Props;
  }

  attachNode(node: CoreNode) {
    this.node = node;
  }

  createValueKey() {
    if (
      this._valueKeyDirty === false &&
      this.node !== null &&
      this.node.w === this._lastW &&
      this.node.h === this._lastH
    ) {
      return this._valueKeyCache;
    }

    let valueKey = '';
    for (const key in this.resolvedProps) {
      valueKey += `${key}:${this.resolvedProps[key]!};`;
    }
    valueKey += `node-width:${this.node!.w}`;
    valueKey += `node-height:${this.node!.h}`;

    this._valueKeyCache = valueKey;
    this._valueKeyDirty = false;
    this._lastW = this.node!.w;
    this._lastH = this.node!.h;

    return valueKey;
  }

  get props(): Props | undefined {
    return this.definedProps;
  }

  set props(props: Props | undefined) {
    if (props === undefined) {
      return;
    }
    for (const key in props) {
      this.props![key] = props[key];
    }
  }
}
