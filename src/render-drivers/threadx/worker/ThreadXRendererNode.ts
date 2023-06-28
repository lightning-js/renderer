import type { NodeStruct, NodeStructWritableProps } from '../NodeStruct.js';
import { SharedNode } from '../SharedNode.js';
import { ThreadX } from '@lightningjs/threadx';
import type { Stage } from '../../../core/Stage.js';
import { assertTruthy } from '../../../utils.js';
import type { IAnimationController } from '../../../core/IAnimationController.js';
import type { INodeAnimatableProps } from '../../../main-api/INode.js';
import { CoreAnimation } from '../../../core/animations/CoreAnimation.js';
import { CoreAnimationController } from '../../../core/animations/CoreAnimationController.js';
import type { Texture } from '../../../core/textures/Texture.js';
import { CoreNode } from '../../../core/CoreNode.js';
import type { TextureDesc } from '../../../main-api/RendererMain.js';

export class ThreadXRendererNode extends SharedNode {
  private coreNode: CoreNode;

  protected _parent: ThreadXRendererNode | null = null;
  protected _children: ThreadXRendererNode[] = [];
  texture: Texture | null = null;

  private animationControllers = new Map<number, IAnimationController>();

  constructor(
    private stage: Stage,
    sharedNodeStruct: NodeStruct,
    coreNode?: CoreNode,
  ) {
    super(sharedNodeStruct);
    // This Proxy makes sure properties on the coreNode that an animation
    // changes are also updated on the shared node.
    // TODO: Improve this pattern because its ugly!!!
    this.coreNode = new Proxy(
      coreNode ||
        new CoreNode(this.stage, {
          id: sharedNodeStruct.id,
        }),
      {
        set: (target, prop, value) => {
          // Only set the numeric properties on the shared node.
          if (prop !== 'parent' && prop !== 'texture' && prop !== 'shader') {
            Reflect.set(this, prop, value);
          }
          return Reflect.set(target, prop, value);
        },
      },
    );
    this.onPropertyChange('parentId', this.parentId, undefined);
    this.onPropertyChange('x', this.x, undefined);
    this.onPropertyChange('y', this.y, undefined);
    this.onPropertyChange('w', this.w, undefined);
    this.onPropertyChange('h', this.h, undefined);
    this.onPropertyChange('alpha', this.alpha, undefined);
    this.onPropertyChange('color', this.color, undefined);
    this.onPropertyChange('zIndex', this.zIndex, undefined);
    this.onPropertyChange('text', this.text, undefined);

    // TOOD: Make sure event listeners are removed when the node is destroyed.
    this.on(
      'createAnimation',
      (target: ThreadXRendererNode, { id, props, duration }) => {
        const animation = new CoreAnimation(
          this.coreNode,
          props as Partial<INodeAnimatableProps>,
          duration as number,
        );
        animation.on('finished', () => {
          this.emit('animationFinished', { id: id as number });
        });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const controller = new CoreAnimationController(
          this.stage.animationManager,
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
    this.on(
      'loadTexture',
      (target: ThreadXRendererNode, textureDesc: TextureDesc) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        this.coreNode.loadTexture(
          textureDesc.txType,
          textureDesc.props as any,
          textureDesc.options,
        );
      },
    );
    this.on('unloadTexture', (target: ThreadXRendererNode) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      this.coreNode.unloadTexture();
    });
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
    } else if (
      propName === 'x' ||
      propName === 'y' ||
      propName === 'w' ||
      propName === 'h' ||
      propName === 'alpha' ||
      propName === 'color' ||
      propName === 'zIndex'
    ) {
      this.coreNode[propName] = value as number;
    }
  }

  //#region Parent/Child Props
  get parent(): ThreadXRendererNode | null {
    return this._parent;
  }

  set parent(newParent: ThreadXRendererNode | null) {
    const oldParent = this._parent;
    this._parent = newParent;
    this.coreNode.parent = newParent?.coreNode ?? null;
    this.parentId = newParent?.id ?? 0;
    if (oldParent) {
      const index = oldParent.children.indexOf(this);
      assertTruthy(
        index !== -1,
        "ThreadXRendererNode.parent: Node not found in old parent's children!",
      );
      oldParent.children.splice(index, 1);
    }
    if (newParent) {
      newParent.children.push(this);
    }
  }

  get children(): ThreadXRendererNode[] {
    return this._children;
  }
  //#endregion Parent/Child Props
}
