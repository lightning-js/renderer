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

import type { FpsUpdatePayload } from '../common/CommonTypes.js';
import type {
  INode,
  INodeWritableProps,
  ITextNode,
  ITextNodeWritableProps,
} from './INode.js';
import type { RendererMain, RendererMainSettings } from './RendererMain.js';

/**
 * This interface is to be implemented by Core Drivers
 *
 * @remarks
 * Both the {@link MainCoreDriver} and the {@link ThreadXCoreDriver} exist
 * that implement this interface to support both the single-threaded and
 * multi-threaded Core modes.
 */
export interface ICoreDriver {
  init(
    rendererMain: RendererMain,
    rendererSettings: Required<RendererMainSettings>,
    canvas: HTMLCanvasElement,
  ): Promise<void>;

  createNode(props: INodeWritableProps): INode;

  createTextNode(props: ITextNodeWritableProps): ITextNode;

  // TODO: Nodes can be destroyed from the INode directly. Do we need this method
  // on this interface? All it does is call the destroy() method on the node.
  destroyNode(node: INode): void;

  getRootNode(): INode;

  releaseTexture(textureDescId: number): void;

  onCreateNode(node: INode): void;

  onBeforeDestroyNode(node: INode): void;

  onFpsUpdate(fpsData: FpsUpdatePayload): void;
}
