import { assertTruthy } from '../../utils.js';
import type { IRenderDriver } from '../../main-api/IRenderDriver.js';
import type { INode, INodeWritableProps } from '../../main-api/INode.js';
import { MainOnlyNode } from './MainOnlyNode.js';
import { Stage } from '../../core/stage.js';
import type {
  RendererMain,
  RendererMainSettings,
} from '../../main-api/RendererMain.js';

export class MainRenderDriver implements IRenderDriver {
  private root: MainOnlyNode | null = null;
  private stage: Stage | null = null;
  private rendererMain: RendererMain | null = null;

  async init(
    rendererMain: RendererMain,
    rendererSettings: Required<RendererMainSettings>,
    canvas: HTMLCanvasElement,
  ): Promise<void> {
    this.stage = new Stage({
      rootId: 1,
      deviceLogicalPixelRatio: rendererSettings.deviceLogicalPixelRatio,
      devicePhysicalPixelRatio: rendererSettings.devicePhysicalPixelRatio,
      canvas,
      debug: {
        monitorTextureCache: false,
      },
    });
    this.rendererMain = rendererMain;
    assertTruthy(this.stage.root);
    const node = new MainOnlyNode(
      this.rendererMain,
      this.stage,
      this.stage.root,
    );
    this.root = node;
    node.once('beforeDestroy', this.onBeforeDestroyNode.bind(this, node));
    this.onCreateNode(node);
  }

  createNode(props: Partial<INodeWritableProps> = {}): INode {
    assertTruthy(this.rendererMain);
    assertTruthy(this.stage);
    const node = new MainOnlyNode(this.rendererMain, this.stage);
    node.once('beforeDestroy', this.onBeforeDestroyNode.bind(this, node));
    node.x = props.x || 0;
    node.y = props.y || 0;
    node.w = props.w || 0;
    node.h = props.h || 0;
    node.parent = (props.parent as MainOnlyNode) || null;
    node.color = props.color ?? 0xffffffff;
    node.alpha = props.alpha ?? 1;
    node.texture = props.texture || null;

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
    const { stage } = this;
    assertTruthy(stage);
    stage.txManager.removeTextureIdFromCache(id);
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
