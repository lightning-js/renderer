import type { IEventEmitter } from '@lightningjs/threadx';
import type { IAnimationController } from './IAnimationController.js';

export interface INodeWritableProps {
  x: number;
  y: number;
  w: number;
  h: number;
  alpha: number;
  color: number;
  parent: INode | null;
  zIndex: number;
  text: string;
  src: string;
}

export type INodeAnimatableProps = {
  [Key in keyof INodeWritableProps as INodeWritableProps[Key] extends number
    ? Key
    : never]: number;
};

export interface INodeEvents {
  [s: string]: (target: INode, data: any) => void;
}

export interface INode extends INodeWritableProps, IEventEmitter<INodeEvents> {
  typeId: number; // TODO: Remove since this is ThreadX specific?
  id: number;
  readonly children: INode[];

  animate(
    props: Partial<INodeAnimatableProps>,
    duration: number,
  ): IAnimationController;

  destroy(): void;
  flush(): void;
}
