import stage, { type StageOptions } from './stage.js';
import type { Scene } from './scene/Scene.js';
import type { CoreNode } from './CoreNode.js';

export interface Application {
  get stage(): typeof stage;
  get canvas(): HTMLCanvasElement | OffscreenCanvas | undefined;
  get root(): CoreNode | null;
  get scene(): Scene | null;
}

export default (options: StageOptions): Application => {
  const resolvedOptions: Required<StageOptions> = {
    rootId: options.rootId,
    canvas: options.canvas,
    w: options.w ?? 1920,
    h: options.h ?? 1080,
    clearColor: options.clearColor ?? 0xff3677e0,
    debug: options.debug ?? {},
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
