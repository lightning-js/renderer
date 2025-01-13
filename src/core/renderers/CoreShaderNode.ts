import { assertTruthy, deepClone } from '../../utils.js';
import { UpdateType, type CoreNode } from '../CoreNode.js';
import type { Stage } from '../Stage.js';
import type { CoreShaderProgram } from './CoreShaderProgram.js';

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

    if (hasValue && pConfig.resolve !== undefined) {
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

export interface CoreShaderType<
  Props extends object = Record<string, unknown>,
> {
  name: string;
  props?: ShaderProps<Props>;
  /**
   * used for making a cache key to check for reusability
   */
  getCacheMarkers?: (props: Props) => string;
}

export class CoreShaderNode<Props extends object = Record<string, unknown>> {
  readonly stage: Stage;
  readonly program: CoreShaderProgram;
  readonly shaderType: CoreShaderType<Props>;
  protected propsConfig: ShaderProps<Props> | undefined;
  protected resolvedProps: Props | undefined = undefined;
  protected definedProps: Props | undefined = undefined;
  protected node: CoreNode | null = null;
  update: (() => void) | undefined = undefined;

  constructor(
    readonly shaderKey: string,
    type: CoreShaderType<Props>,
    program: CoreShaderProgram,
    stage: Stage,
    props?: Props,
  ) {
    this.stage = stage;
    this.program = program;
    this.shaderType = type;

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
      Object.defineProperty(definedProps, key, {
        get: () => {
          return this.resolvedProps![key as keyof Props];
        },
        set: (value) => {
          this.resolvedProps![key as keyof Props] = value;
          if (
            isAdvancedShaderProp(this.shaderType.props![key]) &&
            this.shaderType.props![key].set !== undefined
          ) {
            this.shaderType.props![key].set(
              value,
              this.resolvedProps as Record<string, unknown>,
            );
          }
          if (this.update !== undefined) {
            this.node?.setUpdateType(UpdateType.RecalcUniforms);
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

  getResolvedProps() {
    return this.resolvedProps;
  }

  get props(): Props | undefined {
    return this.definedProps;
  }

  set props(props: Props | undefined) {
    if (props === undefined) {
      this.resolvedProps = undefined;
      this.definedProps = undefined;
      return;
    }
    for (const key in props) {
      this.props![key] = props[key];
    }
  }
}
