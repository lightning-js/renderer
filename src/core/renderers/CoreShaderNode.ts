import { UpdateType, type CoreNode } from '../CoreNode.js';
import type { Stage } from '../Stage.js';
import type { CoreShaderProgram } from './CoreShaderProgram.js';

export interface AdvShaderProp<T = any, Props = Record<string, unknown>> {
  default: T;
  resolve?: (this: AdvShaderProp<T, Props>, value: T, props: Props) => T;
  transform?: (start: T, end: T, progress: number) => T;
}

export type ShaderProp<T, Props> = T | AdvShaderProp<T, Props>;

export type ShaderProps<Props> = {
  [K in keyof Props]: ShaderProp<Props[K], Props>;
};

export type ExtractShaderProps<Props> = {
  [K in keyof Props]: Props[K] extends { default: infer D } ? D : Props[K];
};
export type PartialShaderProps<Props> = Partial<ExtractShaderProps<Props>>;

export function isAdvancedShaderProp(obj: any): obj is AdvShaderProp {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    typeof obj.default === 'undefined'
  );
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
    if (
      props[key] !== undefined &&
      (propsConfig[key] as AdvShaderProp).resolve !== undefined
    ) {
      props[key] = (propsConfig[key] as AdvShaderProp).resolve!(
        props[key],
        props,
      );
      continue;
    }
    if (props[key] === undefined) {
      props[key] = (propsConfig[key] as AdvShaderProp).default;
    }
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

export interface BaseShaderNode<
  Props extends object = Record<string, unknown>,
> {
  program: CoreShaderProgram;
  getResolvedProps: () => Props | undefined;
  attachNode: (node: CoreNode) => void;
  update?: () => void;
  props?: Props;
}

export class CoreShaderNode<Props extends object = Record<string, unknown>>
  implements BaseShaderNode<Props>
{
  readonly stage: Stage;
  readonly program: CoreShaderProgram;
  private propsConfig: ShaderProps<Props> | undefined;
  private resolvedProps: Props | undefined = undefined;
  private definedProps: Props | undefined = undefined;
  protected node: CoreNode | null = null;
  update: (() => void) | undefined = undefined;

  constructor(
    config: CoreShaderType<Props>,
    program: CoreShaderProgram,
    stage: Stage,
    props?: Props,
  ) {
    this.stage = stage;
    this.program = program;
    this.propsConfig = config.props;

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
    }
    resolveShaderProps(props as Record<string, unknown>, this.propsConfig!);
    this.resolvedProps = props;
    this.defineProps(props!);
  }
}
