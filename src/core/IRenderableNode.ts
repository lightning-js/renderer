import type { INode } from './INode.js';

export interface IRenderableNode extends INode {
  // TOOD: Replace this with a more generic way to store image data
  imageBitmap?: ImageBitmap | null;
}
