import type { NodeStruct, NodeStructWritableProps } from '../NodeStruct.js';
import { SharedNode } from '../SharedNode.js';
import { ThreadX } from '@lightningjs/threadx';
import type { IRenderableNode } from '../../../core/IRenderableNode.js';
import type { Stage } from '../../../core/stage.js';
import { mat4, vec3 } from '../../../core/lib/glm/index.js';
import { assertTruthy } from '../../../utils.js';
import type { CoreTexture } from '../../../core/renderers/CoreTexture.js';
import { commonRenderNode } from '../../common/RenderNodeCommon.js';
import type { CoreRenderer } from '../../../core/renderers/CoreRenderer.js';
import type { IAnimationController } from '../../../core/IAnimationController.js';
import type { INodeAnimatableProps } from '../../../core/INode.js';
import { CoreAnimation } from '../../../core/animations/CoreAnimation.js';
import { CoreAnimationController } from '../../../core/animations/CoreAnimationController.js';

export class ThreadXRendererNode extends SharedNode implements IRenderableNode {
  private _localMatrix = mat4.create();
  private _worldMatrix = mat4.create();

  texture: CoreTexture | null;

  private animationControllers = new Map<number, IAnimationController>();

  constructor(private stage: Stage, sharedNodeStruct: NodeStruct) {
    super(sharedNodeStruct);
    this.texture = this.stage
      .getRenderer()
      .textureManager.getWhitePixelTexture();
    this.onPropertyChange('parentId', this.parentId, undefined);
    this.onPropertyChange('src', this.src, undefined);
    this.updateTranslate();
    // TOOD: Make sure event listeners are removed when the node is destroyed.
    this.on(
      'createAnimation',
      (target: ThreadXRendererNode, { id, props, duration }) => {
        const animation = new CoreAnimation(
          this,
          props as Partial<INodeAnimatableProps>,
          duration as number,
        );
        animation.on('finished', () => {
          this.emit('animationFinished', { id: id as number });
        });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const controller = new CoreAnimationController(
          this.stage.getAnimationManager(),
          animation,
        );
        this.animationControllers.set(id as number, controller);
      },
    );
    this.on('destroyAnimation', (target: ThreadXRendererNode, { id }) => {
      this.animationControllers.delete(id as number);
    });
    this.on('startAnimation', (target: ThreadXRendererNode, { id }) => {
      this.animationControllers.get(id as number)?.start();
    });
    this.on('stopAnimation', (target: ThreadXRendererNode, { id }) => {
      this.animationControllers.get(id as number)?.stop();
    });
    this.on('pauseAnimation', (target: ThreadXRendererNode, { id }) => {
      this.animationControllers.get(id as number)?.pause();
    });
  }

  override animate(
    props: Partial<INodeAnimatableProps>,
    duration: number,
  ): IAnimationController {
    throw new Error('Method not implemented.');
  }

  override onPropertyChange(
    propName: keyof NodeStructWritableProps,
    value: unknown,
    oldValue: unknown,
  ): void {
    if (propName === 'parentId') {
      const parent = ThreadX.instance.getSharedObjectById(value as number);
      assertTruthy(parent instanceof ThreadXRendererNode || parent === null);
      this.parent = parent;
      return;
    } else if (propName === 'zIndex' || propName === 'text') {
      return;
    } else if (propName === 'x' || propName === 'y') {
      this.updateTranslate();
      return;
    } else if (propName === 'src') {
      if (value !== oldValue) {
        this.loadImage(value as string).catch(console.error);
      }
      return;
    }
    // switch (propName) {
    //   case "src":
    //     this._loadImage(value as string).catch(console.error);
    //     break;
    // }
  }

  getTranslate(): vec3.Vec3 {
    return mat4.getTranslation(vec3.create(), this._worldMatrix);
  }

  override get children(): ThreadXRendererNode[] {
    return super.children as ThreadXRendererNode[];
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

  _onParentChange(parent: ThreadXRendererNode) {
    this.updateWorldMatrix(parent._worldMatrix);
  }

  updateTranslate() {
    mat4.fromTranslation(this._localMatrix, vec3.fromValues(this.x, this.y, 1));
    if (this.parent) {
      this.updateWorldMatrix((this.parent as ThreadXRendererNode)._worldMatrix);
    }
  }

  private async loadImage(imageUrl: string): Promise<void> {
    const txManager = this.stage.getRenderer().textureManager;
    this.texture =
      (await txManager.getImageTexture(imageUrl)) ||
      txManager.getWhitePixelTexture();
    this.emit('imageLoaded', { src: imageUrl });
  }

  update(delta: number): void {
    // TODO: implement
  }

  renderQuads(renderer: CoreRenderer): void {
    commonRenderNode(this, renderer);
  }
}
