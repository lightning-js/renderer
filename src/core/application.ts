import stage, { type StageOptions } from './stage.js';
import { type Node } from './scene/Node.js';
import type { Scene } from './scene/Scene.js';

export interface Application {
  get stage(): typeof stage;
  get canvas(): HTMLCanvasElement | OffscreenCanvas | undefined;
  get root(): Node | undefined;
  get scene(): Scene;
}

export default (options: StageOptions): Application => {
  const resolvedOptions: Required<StageOptions> = {
    elementId: options.elementId ?? 1,
    w: options.w ?? 1920,
    h: options.h ?? 1080,
    context: options.context,
    clearColor: options.clearColor ?? 0xff3677e0,
  };

  stage.init(resolvedOptions);

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
    get scene() {
      return stage.getScene();
    },
  };
};
