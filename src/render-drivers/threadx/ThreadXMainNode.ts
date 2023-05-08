import type { NodeStruct } from './NodeStruct.js';
import { SharedNode } from './SharedNode.js';

export class ThreadXMainNode extends SharedNode {
  constructor(sharedNodeStruct: NodeStruct) {
    super(sharedNodeStruct);
  }

  get props() {
    return this.curProps;
  }
}
