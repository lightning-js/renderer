import type { NodeStruct, NodeStructWritableProps } from './NodeStruct.js';
import { SharedObject } from '@lightningjs/threadx';
import type { INode, INodeAnimatableProps } from '../../core/INode.js';
import { assertTruthy } from '../../utils.js';
import type { IAnimationController } from '../../core/IAnimationController.js';

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
      alpha: sharedNodeStruct.alpha,
      color: sharedNodeStruct.color,
      parentId: sharedNodeStruct.parentId,
      zIndex: sharedNodeStruct.zIndex,
      text: sharedNodeStruct.text,
      src: sharedNodeStruct.src,
    });
  }

  private _parent: SharedNode | null = null;

  get parent(): SharedNode | null {
    return this._parent;
  }

  set parent(newParent: SharedNode | null) {
    const oldParent = this._parent;
    this._parent = newParent;
    this.parentId = newParent?.id ?? 0;
    if (oldParent) {
      const index = oldParent.children.indexOf(this);
      assertTruthy(
        index !== -1,
        "SharedNode.parent: Node not found in old parent's children!",
      );
      oldParent.children.splice(index, 1);
    }
    if (newParent) {
      newParent.children.push(this);
    }
  }

  protected _children: SharedNode[] = [];

  get children(): SharedNode[] {
    return this._children;
  }

  protected override onDestroy(): void {
    this.parent = null;
    super.onDestroy();
  }

  animate(
    props: Partial<INodeAnimatableProps>,
    duration: number,
  ): IAnimationController {
    throw new Error('Method not implemented.');
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
  declare src: string;
}
