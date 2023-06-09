import type { NodeStruct, NodeStructWritableProps } from './NodeStruct.js';
import { SharedObject } from '@lightningjs/threadx';

export class SharedNode extends SharedObject<
  NodeStructWritableProps,
  NodeStruct
> {
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
      alpha: sharedNodeStruct.alpha,
      color: sharedNodeStruct.color,
      parentId: sharedNodeStruct.parentId,
      zIndex: sharedNodeStruct.zIndex,
      text: sharedNodeStruct.text,
    });
  }

  // Declare getters and setters for all properties that are automatically
  // generated on this class.
  declare x: number;
  declare y: number;
  declare w: number;
  declare h: number;
  declare alpha: number;
  declare color: number;
  protected declare parentId: number;
  declare zIndex: number;
  declare text: string;
}
