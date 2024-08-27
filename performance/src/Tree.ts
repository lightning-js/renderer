// Tree - mimic a rendering tree with core nodes and animations
// test modules
import { Bench } from 'tinybench';
import * as sinon from 'ts-sinon';
import { performance } from 'perf_hooks';

// src files
import { CoreNode, type CoreNodeProps } from '../../src/core/CoreNode.js';
import { CoreTextNode } from '../../src/core/CoreTextNode.js';
import { Stage } from '../../src/core/Stage.js';
import { type TextureOptions } from '../../src/core/CoreTextureManager.js';
import { type BaseShaderController } from '../../src/main-api/ShaderController.js';
import { type RectWithValid } from '../../src/core/lib/utils.js';
import { i } from 'vitest/dist/reporters-yx5ZTtEV.js';

const bench = new Bench();
const mock = sinon.stubInterface;

// local imports
export const defaultProps: CoreNodeProps = {
  alpha: 0,
  autosize: false,
  clipping: false,
  color: 0,
  colorBl: 0,
  colorBottom: 0,
  colorBr: 0,
  colorLeft: 0,
  colorRight: 0,
  colorTl: 0,
  colorTop: 0,
  colorTr: 0,
  height: 0,
  mount: 0,
  mountX: 0,
  mountY: 0,
  parent: null,
  pivot: 0,
  pivotX: 0,
  pivotY: 0,
  rotation: 0,
  rtt: false,
  scale: 0,
  scaleX: 0,
  scaleY: 0,
  shader: mock<BaseShaderController>(),
  src: '',
  texture: null,
  textureOptions: {} as TextureOptions,
  width: 0,
  x: 0,
  y: 0,
  zIndex: 0,
  zIndexLocked: 0,
  preventCleanup: false,
};

const stage = mock<Stage>();
const root: CoreNode = new CoreNode(stage, defaultProps);
const contentNodes: CoreNode[] = [];

const buildTree = (amount = 100) => {
  // build menu
  const menu = new CoreNode(stage, defaultProps);
  menu.parent = root;
  menu.x = 0;
  menu.y = 0;
  menu.width = 200;
  menu.height = 1080;

  // build menu items
  for (let i = 0; i < 5; i++) {
    const item = new CoreNode(stage, defaultProps);
    item.parent = menu;
    item.x = 0;
    item.y = i * 100;
    item.width = 200;
    item.height = 100;
  }

  const contentContainer = new CoreNode(stage, defaultProps);
  contentContainer.parent = root;

  // build content
  for (let i = 0; i < amount; i++) {
    const content = new CoreNode(stage, defaultProps);
    content.parent = contentContainer;
    // build rows of 20 in each lane, add as many lanes as needed
    content.x = Math.floor(i / 20) * 200;
    content.y = (i % 20) * 100;
    content.width = 200;
    content.height = 100;

    contentNodes.push(content);

    // add sub content
    for (let j = 0; j < 5; j++) {
      const subContent = new CoreNode(stage, defaultProps);
      subContent.parent = content;
      subContent.x = 0;
      subContent.y = j * 20;
      subContent.width = 200;
      subContent.height = 20;
    }

    // more sub content
    for (let j = 0; j < 5; j++) {
      const subContent = new CoreNode(stage, defaultProps);
      subContent.parent = content;
      subContent.x = 20;
      subContent.y = j * 20;
      subContent.width = 10;
      subContent.height = 20;
    }
  }
};

console.log('Building tree with 2000 nodes');
buildTree(2000);

let lastFrameTime = 0;

bench.add(
  'update',
  () => {
    const newFrameTime = performance.now();
    const deltaTime = !lastFrameTime ? 100 / 6 : newFrameTime - lastFrameTime;

    root.update(deltaTime, {
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      valid: true,
    });
    lastFrameTime = newFrameTime;
  },
  {
    beforeEach: () => {
      for (let i = 0; i < contentNodes.length; i++) {
        const node = contentNodes[i];
        if (!node) {
          continue;
        }

        node.x += 1;
        node.y += 1;
      }
    },
  },
);

await bench.warmup();
await bench.run();

console.table(bench.table());
