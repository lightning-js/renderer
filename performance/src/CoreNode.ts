/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast Cable Communications Management, LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// test modules
import { Bench } from 'tinybench';
import * as sinon from 'ts-sinon';

// src files
import { CoreNode, type CoreNodeProps } from '../../src/core/CoreNode.js';
import { Stage } from '../../src/core/Stage.js';
import { type TextureOptions } from '../../src/core/CoreTextureManager.js';
import { type BaseShaderController } from '../../src/main-api/ShaderController.js';
import { type RectWithValid } from '../../src/core/lib/utils.js';

const bench = new Bench();
const mock = sinon.stubInterface;

const defaultProps: CoreNodeProps = {
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
};

const renderableProps = {
  alpha: 1,
  autosize: false,
  clipping: false,
  color: 10,
  colorBl: 0,
  colorBottom: 0,
  colorBr: 0,
  colorLeft: 0,
  colorRight: 0,
  colorTl: 0,
  colorTop: 0,
  colorTr: 0,
  height: 10,
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
  width: 10,
  x: 100,
  y: 100,
  zIndex: 0,
  zIndexLocked: 0,
};

const stage = mock<Stage>();

const nodes: CoreNode[] = [];
const createAmount = (count = 100) => {
  for (let i = 0; i < count; i++) {
    nodes.push(new CoreNode(stage, defaultProps));
  }
};

let delta = 0;
const rootClippingRect: RectWithValid = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  valid: false,
};

const rootNode = new CoreNode(stage, defaultProps);

bench
  .add('create', () => {
    const node = new CoreNode(stage, defaultProps);
    node.parent = rootNode;
  })
  .add('create renderable', () => {
    const node = new CoreNode(stage, renderableProps);
    node.parent = rootNode;
  })
  .add('create renderable no parent', () => {
    const node = new CoreNode(stage, renderableProps);
  })
  .add('update', () => {
    const node = new CoreNode(stage, defaultProps);
    node.update(delta++, rootClippingRect);
  })
  .add('update renderable', () => {
    const node = new CoreNode(stage, renderableProps);
    node.parent = rootNode;
    node.update(delta++, rootNode.clippingRect);
  })
  .add('update animate x/y', () => {
    const node = new CoreNode(stage, renderableProps);
    node.parent = rootNode;
    node.x += 1;
    node.y += 1;
    node.update(delta++, rootNode.clippingRect);
  })
  .add('update animate alpha', () => {
    const node = new CoreNode(stage, renderableProps);
    node.parent = rootNode;
    node.alpha -= 0.1;
    node.update(delta++, rootNode.clippingRect);
  })
  .add('update zIndex', () => {
    const node = new CoreNode(stage, renderableProps);
    node.parent = rootNode;

    const childNode = new CoreNode(stage, renderableProps);
    const childNode2 = new CoreNode(stage, renderableProps);

    childNode.zIndex = 10;
    childNode2.zIndex = 5;

    childNode.parent = node;
    childNode2.parent = node;

    const d = delta++;
    node.update(d, rootNode.clippingRect);
    childNode.update(d, node.clippingRect);
    childNode2.update(d, node.clippingRect);
  })
  .add('destroy', () => {
    new CoreNode(stage, defaultProps).destroy();
  });

await bench.warmup();
await bench.run();

console.table(bench.table());
