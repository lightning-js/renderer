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

import { ThreadX, BufferStruct } from '@lightningjs/threadx';
import { NodeStruct, type NodeStructWritableProps } from '../NodeStruct.js';
import { ThreadXRendererNode } from './ThreadXRendererNode.js';
import { Stage, type StageFpsUpdateHandler } from '../../../core/Stage.js';
import { assertTruthy } from '../../../utils.js';
import {
  isThreadXRendererMessage,
  type ThreadXRendererFpsUpdateMessage,
  type ThreadXRendererMessage,
} from '../ThreadXRendererMessage.js';
import { TextNodeStruct } from '../TextNodeStruct.js';
import { ThreadXRendererTextNode } from './ThreadXRendererTextNode.js';
import { loadCoreExtension } from '../../utils.js';

let canvas: OffscreenCanvas | null = null;
let stage: Stage | null = null;
let rootNode: ThreadXRendererNode | null = null;
const threadx = ThreadX.init({
  workerId: 2,
  workerName: 'renderer',
  sharedObjectFactory(buffer) {
    const typeId = BufferStruct.extractTypeId(buffer);
    if (typeId === NodeStruct.typeId) {
      const nodeStruct = new NodeStruct(buffer);
      nodeStruct.parentId = nodeStruct.parentId || 0;
      const node = nodeStruct.lock(() => {
        assertTruthy(stage);
        return new ThreadXRendererNode(stage, nodeStruct);
      });
      return node;
    } else if (typeId === TextNodeStruct.typeId) {
      const nodeStruct = new TextNodeStruct(buffer);
      nodeStruct.parentId = nodeStruct.parentId || 0;
      const node = nodeStruct.lock(() => {
        assertTruthy(stage);
        return new ThreadXRendererTextNode(stage, nodeStruct);
      });
      return node;
    }
    return null;
  },
  async onMessage(message: ThreadXRendererMessage) {
    if (isThreadXRendererMessage('init', message)) {
      canvas = message.canvas;
      const nodeStruct = new NodeStruct();
      stage = new Stage({
        rootId: nodeStruct.id,
        appWidth: message.appWidth,
        appHeight: message.appHeight,
        deviceLogicalPixelRatio: message.deviceLogicalPixelRatio,
        devicePhysicalPixelRatio: message.devicePhysicalPixelRatio,
        clearColor: message.clearColor,
        canvas,
        fpsUpdateInterval: message.fpsUpdateInterval,
        enableContextSpy: message.enableContextSpy,
        numImageWorkers: message.numImageWorkers,
        debug: {
          monitorTextureCache: false,
        },
      });

      const coreRootNode = stage.root;

      // We must initialize the root NodeStruct with the same properties from
      // the CoreNode that the Stage created.
      Object.assign(nodeStruct, {
        x: coreRootNode.x,
        y: coreRootNode.y,
        width: coreRootNode.width,
        height: coreRootNode.height,
        alpha: coreRootNode.alpha,
        clipping: coreRootNode.clipping,
        color: coreRootNode.color,
        colorTop: coreRootNode.colorTop,
        colorRight: coreRootNode.colorRight,
        colorBottom: coreRootNode.colorBottom,
        colorLeft: coreRootNode.colorLeft,
        colorTl: coreRootNode.colorTl,
        colorTr: coreRootNode.colorTr,
        colorBr: coreRootNode.colorBr,
        colorBl: coreRootNode.colorBl,
        parentId: coreRootNode.parent?.id ?? 0,
        zIndex: coreRootNode.zIndex,
        zIndexLocked: coreRootNode.zIndexLocked,
        scaleX: coreRootNode.scaleX,
        scaleY: coreRootNode.scaleY,
        mount: coreRootNode.mount,
        mountX: coreRootNode.mountX,
        mountY: coreRootNode.mountY,
        pivot: coreRootNode.pivot,
        pivotX: coreRootNode.pivotX,
        pivotY: coreRootNode.pivotY,
        rotation: coreRootNode.rotation,
        rtt: coreRootNode.rtt,
      } satisfies NodeStructWritableProps);

      // Share the root node that was created by the Stage with the main worker.
      rootNode = new ThreadXRendererNode(stage, nodeStruct, coreRootNode);
      await threadx.shareObjects('parent', [rootNode]);

      // Load the Core Extension Module if one was specified.
      if (message.coreExtensionModule) {
        await loadCoreExtension(message.coreExtensionModule, stage);
      }

      // Forward FPS updates to the main worker.
      stage.on('fpsUpdate', ((stage, fpsData) => {
        threadx.sendMessage('parent', {
          type: 'fpsUpdate',
          fpsData: fpsData,
        } satisfies ThreadXRendererFpsUpdateMessage);
      }) satisfies StageFpsUpdateHandler);

      // Return its ID so the main worker can retrieve it from the shared object
      // store.
      return rootNode.id;
    } else if (isThreadXRendererMessage('releaseTexture', message)) {
      assertTruthy(stage);
      const txManager = stage.txManager;
      assertTruthy(txManager);
      txManager.removeTextureIdFromCache(message.textureDescId);
    }
  },
  onObjectShared(object) {
    // TBD
  },
  onBeforeObjectForgotten(object) {
    if (object instanceof ThreadXRendererNode) {
      object.parent = null;
      object.destroy();
    }
  },
});
