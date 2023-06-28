import application, { type Application } from '../../core/application.js';
import { assertTruthy } from '../../utils.js';
import type { IRenderDriver } from '../../main-api/IRenderDriver.js';
import type { INode, INodeWritableProps } from '../../main-api/INode.js';
import { MainOnlyNode } from './MainOnlyNode.js';
import stage from '../../core/stage.js';
import type { RendererMain } from '../../main-api/RendererMain.js';

export class MainRenderDriver implements IRenderDriver {
  private root: MainOnlyNode | null = null;
  private app: Application | null = null;
  private rendererMain: RendererMain | null = null;

  async init(
    rendererMain: RendererMain,
    canvas: HTMLCanvasElement,
  ): Promise<void> {
    this.app = application({
      rootId: 1,
      w: 1920,
      h: 1080,
      canvas,
      debug: {
        monitorTextureCache: true,
      },
    });
    this.rendererMain = rendererMain;
    assertTruthy(this.app.root);
    const node = new MainOnlyNode(this.rendererMain, stage, this.app.root);
    this.root = node;
    node.once('beforeDestroy', this.onBeforeDestroyNode.bind(this, node));
    this.onCreateNode(node);
  }

  createNode(props: Partial<INodeWritableProps> = {}): INode {
    assertTruthy(this.rendererMain);
    const node = new MainOnlyNode(this.rendererMain, stage);
    node.once('beforeDestroy', this.onBeforeDestroyNode.bind(this, node));
    node.x = props.x || 0;
    node.y = props.y || 0;
    node.w = props.w || 0;
    node.h = props.h || 0;
    node.parent = (props.parent as MainOnlyNode) || null;
    node.color = props.color ?? 0xffffffff;
    node.alpha = props.alpha ?? 1;
    node.texture = props.texture || null;
    node.shader = props.shader || null;

    // Since setting the `src` will trigger a texture load, we need to set it after
    // we set the texture. Otherwise, problems happen.
    node.src = props.src || '';

    this.onCreateNode(node);
    return node;
  }

  // TODO: Remove?
  destroyNode(node: INode): void {
    node.destroy();
  }

  releaseTexture(id: number): void {
    stage.getTextureManager()?.removeTextureIdFromCache(id);
  }

  getRootNode(): INode {
    assertTruthy(this.root);
    return this.root;
  }

  onCreateNode(node: INode): void {
    throw new Error('Method not implemented.');
  }

  onBeforeDestroyNode(node: INode): void {
    throw new Error('Method not implemented.');
  }
}
