import type { NodeStruct, NodeStructWritableProps } from './NodeStruct.js';
import { SharedObject } from '../../__threadx/SharedObject.js';
import type { INode } from '../../core/INode.js';

export class SharedNode
  extends SharedObject<NodeStructWritableProps, NodeStruct>
  implements INode
{
  /**
   * Must have lock on sharedNode before calling constructor!
   *
   * @param sharedNodeStruct
   */
  constructor(sharedNodeStruct: NodeStruct) {
    super(sharedNodeStruct, {
      x: sharedNodeStruct.x,
      y: sharedNodeStruct.y,
      w: sharedNodeStruct.w,
      h: sharedNodeStruct.h,
      color: sharedNodeStruct.color,
      parentId: sharedNodeStruct.parentId,
      zIndex: sharedNodeStruct.zIndex,
      text: sharedNodeStruct.text,
      src: sharedNodeStruct.src,
    });
  }

  private _parent: INode | null = null;

  get parent(): INode | null {
    return this._parent;
  }

  set parent(value: INode | null) {
    this._parent = value;
    this.parentId = value?.id ?? 0;
  }

  // Declare getters and setters for all properties that are automatically
  // generated on this class.
  declare x: number;
  declare y: number;
  declare w: number;
  declare h: number;
  declare color: number;
  private declare parentId: number;
  declare zIndex: number;
  declare text: string;
  declare src: string;
}
