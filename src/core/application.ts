import type { INode } from './INode.js';
import stage, { type StageOptions } from './stage.js';
import type { Scene } from './scene/Scene.js';

export interface Application {
  get stage(): typeof stage;
  get canvas(): HTMLCanvasElement | OffscreenCanvas | undefined;
  get root(): INode | null;
  get scene(): Scene | null;
}

export default (options: StageOptions): Application => {
  const resolvedOptions: Required<StageOptions> = {
    createRootNode: options.createRootNode,
    canvas: options.canvas,
    w: options.w ?? 1920,
    h: options.h ?? 1080,
    clearColor: options.clearColor ?? 0xff3677e0,
  };

  stage.init(resolvedOptions);

  return {
    get stage() {
      return stage;
    },
    get canvas() {
      return options.canvas;
    },
    get root() {
      return stage.getRootNode();
    },
    get scene() {
      return stage.getScene();
    },
  };
};
