import type { NodeStruct, NodeStructWritableProps } from '../NodeStruct.js';
import { SharedNode } from '../SharedNode.js';
import { ThreadX } from '../../../__threadx/ThreadX.js';
import { assertTruthy } from '../../../__threadx/utils.js';
import type { IRenderableNode } from '../../../core/IRenderableNode.js';
import type { Stage } from '../../../core/stage.js';
import { createWhitePixelTexture } from '../../../core/gpu/webgl/texture.js';
import { mat4, vec3 } from '../../../core/lib/glm/index.js';

export class RendererNode extends SharedNode implements IRenderableNode {
  private _localMatrix = mat4.create();
  private _worldMatrix = mat4.create();

  constructor(private stage: Stage, sharedNodeStruct: NodeStruct) {
    super(sharedNodeStruct);

    this.stage
      .ready()
      .then(() => {
        const gl = this.stage.getGlContext();
        assertTruthy(gl);
        const texture = createWhitePixelTexture(gl);
        assertTruthy(texture);
        this.texture = texture;
      })
      .catch(console.error);
    this.onPropertyChange('parentId', this.parentId);
    this.updateTranslate();
  }

  override onPropertyChange(
    propName: keyof NodeStructWritableProps,
    value: unknown,
  ): void {
    if (propName === 'parentId') {
      const parent = ThreadX.instance.getSharedObjectById(value as number);
      assertTruthy(parent instanceof RendererNode || parent === null);
      this.parent = parent;
      return;
    } else if (propName === 'zIndex' || propName === 'text') {
      return;
    }
    // switch (propName) {
    //   case "src":
    //     this._loadImage(value as string).catch(console.error);
    //     break;
    // }
  }

  texture: WebGLTexture | null = null;

  getTranslate(): vec3.Vec3 {
    return mat4.getTranslation(vec3.create(), this._worldMatrix);
  }

  override get children(): RendererNode[] {
    return super.children as RendererNode[];
  }

  updateWorldMatrix(pwMatrix: any) {
    if (pwMatrix) {
      // if parent world matrix is provided
      // we multiply times local matrix
      mat4.multiply(this._worldMatrix, pwMatrix, this._localMatrix);
    } else {
      mat4.copy(this._worldMatrix, this._localMatrix);
    }

    const world = this._worldMatrix;

    this.children.forEach((c) => {
      const rendererNode = c;
      rendererNode.updateWorldMatrix(world);
    });
  }

  _onParentChange(parent: RendererNode) {
    this.updateWorldMatrix(parent._worldMatrix);
  }

  updateTranslate() {
    mat4.fromTranslation(this._localMatrix, vec3.fromValues(this.x, this.y, 1));
    if (this.parent) {
      this.updateWorldMatrix((this.parent as RendererNode)._worldMatrix);
    }
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
