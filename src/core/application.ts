import * as stage from './stage.js';
import createNode from './node.js';

export default (options) => {
  stage.init(options);

  // set root view
  stage.setRootNode(
    createNode({
      w: 1920,
      h: 1080,
      x: 0,
      y: 0,
      color: 0xff3677e0,
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
