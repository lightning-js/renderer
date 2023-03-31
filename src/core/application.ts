import stage, { type MinimalStageOptions, type StageOptions } from './stage.js';
import createNode, { type Node } from './node.js';

export interface Application {
  get stage(): typeof stage;
  get canvas(): HTMLCanvasElement | OffscreenCanvas | undefined;
  get root(): Node | null;
}

export default (options: MinimalStageOptions): Application => {
  const resolvedOptions: StageOptions = {
    elementId: options.elementId ?? 1,
    w: options.w ?? 1920,
    h: options.h ?? 1080,
    context: options.context,
    clearColor: options.clearColor ?? 0xff3677e0,
  };
  stage.init(resolvedOptions);

  // set root view
  stage.setRootNode(
    createNode({
      w: resolvedOptions.w,
      h: resolvedOptions.h,
      x: 0,
      y: 0,
      color: resolvedOptions.clearColor,
    }),
  );

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
