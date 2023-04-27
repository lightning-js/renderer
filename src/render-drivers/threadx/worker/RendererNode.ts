import type { NodeStruct, NodeStructWritableProps } from '../NodeStruct.js';
import { SharedNode } from '../SharedNode.js';
import type { Node } from '../../../core/node.js';

export class RendererNode extends SharedNode {
  legacyNode: Node;

  constructor(sharedNodeStruct: NodeStruct, legacyNode: Node) {
    super(sharedNodeStruct);
    this.legacyNode = legacyNode;
  }

  override onPropertyChange(
    propName: keyof NodeStructWritableProps,
    value: unknown,
  ): void {
    if (propName === 'parentId') {
      return;
    } else if (propName === 'zIndex' || propName === 'text') {
      return;
    }
    this.legacyNode[propName] = value as never;
    // switch (propName) {
    //   case "src":
    //     this._loadImage(value as string).catch(console.error);
    //     break;
    // }
  }

  // public imageBitmap: ImageBitmap | null = null;

  // private async _loadImage(imageURL: string): Promise<void> {
  //   // Load image from src url
  //   const response = await fetch(imageURL);

  //   // Once the file has been fetched, we'll convert it to a `Blob`
  //   const blob = await response.blob();

  //   const imageBitmap = await createImageBitmap(blob, {
  //     premultiplyAlpha: 'none',
  //     colorSpaceConversion: 'none',
  //   });
  //   this.imageBitmap = imageBitmap;
  //   this.emit('imageLoaded', { src: imageURL });
  // }
}
