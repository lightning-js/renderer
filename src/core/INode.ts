import type { IEventEmitter } from '../__threadx/IEventEmitter.js';

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

export interface INodeEvents {
  [s: string]: (target: INode, data: any) => void;
}

export interface INode extends INodeWritableProps, IEventEmitter<INodeEvents> {
  typeId: number; // TODO: Remove since this is ThreadX specific?
  id: number;
  readonly children: INode[];

  flush(): void;
}
