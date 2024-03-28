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

import type {
  FpsUpdatePayload,
  FrameTickPayload,
} from '../../common/CommonTypes.js';

/**
 * @module
 * @description
 * Message types / utils for communication between the main worker and the
 * worker worker.
 */

/**
 * Defines the shape of a message sent from the main worker to the worker
 */
export interface ThreadXRendererMessage {
  type: string;
}

/**
 * An initialization message sent from the main worker to the renderer worker
 */
export interface ThreadXRendererInitMessage extends ThreadXRendererMessage {
  type: 'init';
  canvas: OffscreenCanvas;
  appWidth: number;
  appHeight: number;
  txMemByteThreshold: number;
  boundsMargin: number | [number, number, number, number];
  deviceLogicalPixelRatio: number;
  devicePhysicalPixelRatio: number;
  clearColor: number;
  fpsUpdateInterval: number;
  enableContextSpy: boolean;
  numImageWorkers: number;
  coreExtensionModule: string | null;
}

/**
 * A message sent from the main worker to the renderer worker to release a
 * texture
 */
export interface ThreadXRendererReleaseTextureMessage
  extends ThreadXRendererMessage {
  type: 'releaseTexture';
  textureDescId: number;
}

/**
 * A message sent from the renderer worker to the main worker to update the FPS
 */
export interface ThreadXRendererFpsUpdateMessage
  extends ThreadXRendererMessage {
  type: 'fpsUpdate';
  fpsData: FpsUpdatePayload;
}

/**
 * A message sent from the renderer worker to the main worker to update the FPS
 */
export interface ThreadXRendererFrameTickMessage
  extends ThreadXRendererMessage {
  type: 'frameTick';
  frameTickData: FrameTickPayload;
}

/**
 * A map of message types to message shapes
 */
export interface ThreadXRendererMessageMap {
  init: ThreadXRendererInitMessage;
  releaseTexture: ThreadXRendererReleaseTextureMessage;
  fpsUpdate: ThreadXRendererFpsUpdateMessage;
  frameTick: ThreadXRendererFrameTickMessage;
}

/**
 * Type guard util for a message sent from the main worker to the renderer worker
 *
 * @param type
 * @param message
 * @returns
 */
export function isThreadXRendererMessage<
  Type extends keyof ThreadXRendererMessageMap,
>(type: Type, message: unknown): message is ThreadXRendererMessageMap[Type] {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    message.type === type
  );
}
