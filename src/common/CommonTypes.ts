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

import type { CoreNodeRenderState } from '../core/CoreNode.js';

/**
 * Types shared between Main Space and Core Space
 *
 * @remarks
 *
 * @module
 */

/**
 * Represents a width and height.
 */
export interface Dimensions {
  w: number;
  h: number;
}

/**
 * Payload for when text is loaded
 */
export type NodeTextLoadedPayload = {
  type: 'text';
  dimensions: Dimensions;
};

/**
 * Payload for when texture is loaded
 */
export type NodeTextureLoadedPayload = {
  type: 'texture';
  dimensions: Dimensions;
};

/**
 * Combined type for all loaded payloads
 */
export type NodeLoadedPayload =
  | NodeTextLoadedPayload
  | NodeTextureLoadedPayload;

/**
 * Payload for when text failed to load
 */
export type NodeTextFailedPayload = {
  type: 'text';
  error: Error;
};

/**
 * Payload for when texture failed to load
 */
export type NodeTextureFailedPayload = {
  type: 'texture';
  error: Error;
};

/**
 * Payload for when texture failed to load
 */
export type NodeTextureFreedPayload = {
  type: 'texture';
};

/**
 * Combined type for all failed payloads
 */
export type NodeFailedPayload =
  | NodeTextFailedPayload
  | NodeTextureFailedPayload;

/**
 * Event handler for when the texture/text of a node has loaded
 */
export type NodeLoadedEventHandler = (
  target: any,
  payload: NodeLoadedPayload,
) => void;

/**
 * Event handler for when the texture/text of a node has failed to load
 */
export type NodeFailedEventHandler = (
  target: any,
  payload: NodeFailedPayload,
) => void;

export type NodeRenderStatePayload = {
  type: 'renderState';
  payload: CoreNodeRenderState;
};

export type NodeRenderStateEventHandler = (
  target: any,
  payload: NodeRenderStatePayload,
) => void;

/**
 * Event payload for when an FpsUpdate event is emitted by either the Stage or
 * MainRenderer
 */
export interface FpsUpdatePayload {
  fps: number;
  contextSpyData: Record<string, number> | null;
}

/**
 * Event payload for when a frame tick event is emitted by the Stage
 */
export interface FrameTickPayload {
  time: number;
  delta: number;
}

/**
 * Event payload for when a an animtion tick event is emitted
 */
export interface AnimationTickPayload {
  progress: number;
}

/**
 * Event payload for when an QuadsUpdate event is emitted by the Stage
 */
export interface QuadsUpdatePayload {
  quads: number;
}
