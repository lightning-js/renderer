import type { INode } from './INode.js';
import stage, { type StageOptions } from './stage.js';

export interface Application {
  get stage(): typeof stage;
  get canvas(): HTMLCanvasElement | OffscreenCanvas | undefined;
  get root(): INode | null;
}

export default (options: StageOptions): Application => {
  const resolvedOptions: Required<StageOptions> = {
    rootNode: options.rootNode,
    w: options.w ?? 1920,
    h: options.h ?? 1080,
    context: options.context,
    clearColor: options.clearColor ?? 0xff3677e0,
  };
  stage.init(resolvedOptions);

  // set root view
  stage.setRootNode(options.rootNode);

  return {
    get stage() {
      return stage;
    },
    get canvas() {
      return stage.getCanvas();
    },
    get root() {
      return stage.getRootNode();
    },
  };
};
