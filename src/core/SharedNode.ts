import type {
  NodeBufferStruct,
  NodeWrittableProps,
} from './NodeBufferStruct.js';
import { SharedObject } from '../__threadx/SharedObject.js';

export class SharedNode
  extends SharedObject<NodeWrittableProps, NodeBufferStruct>
  implements NodeWrittableProps
{
  /**
   * Must have lock on sharedNode before calling constructor!
   *
   * @param sharedNodeStruct
   */
  constructor(sharedNodeStruct: NodeBufferStruct) {
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

  // TODO: Implement parent properly
  get parent(): SharedNode | null {
    return null;
  }

  set parent(value: SharedNode | null) {
    this.parentId = value?.id ?? 0;
  }

  // Declare getters and setters for all properties that are automatically
  // generated on this class.
  declare x: number;
  declare y: number;
  declare w: number;
  declare h: number;
  declare color: number;
  declare parentId: number;
  declare zIndex: number;
  declare text: string;
  declare src: string;
}
