import type { NodeBufferStruct } from '../core/NodeBufferStruct.js';
import { SharedNode } from '../core/SharedNode.js';

export class MainNode extends SharedNode {
  constructor(sharedNodeStruct: NodeBufferStruct) {
    super(sharedNodeStruct);
  }

  get props() {
    return this.curProps;
  }
}
