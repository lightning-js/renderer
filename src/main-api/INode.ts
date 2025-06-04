/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2024 Comcast Cable Communications Management, LLC.
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
import type { IAnimationController } from '../common/IAnimationController.js';
import {
  CoreNode,
  type CoreNodeAnimateProps,
  type CoreNodeProps,
} from '../core/CoreNode.js';
import type { CoreTextNode, CoreTextNodeProps } from '../core/CoreTextNode.js';
import type { AnimationSettings } from '../core/animations/CoreAnimation.js';
import type { CoreShaderNode } from '../core/renderers/CoreShaderNode.js';

/**
 * A visual Node in the Renderer scene graph.
 *
 * @remarks
 * A Node is a basic building block of the Renderer scene graph. It can be a
 * container for other Nodes, or it can be a leaf Node that renders a solid
 * color, gradient, image, or specific texture, using a specific shader.
 *
 * For text rendering Nodes, see {@link ITextNode}.
 *
 * ## INode vs CoreNode
 * CoreNode is the name of the class for a Renderer Node and is only directly
 * used internally by the Renderer. INode describes the public API of a
 * Renderer Node including the ability to be tied to a specific Shader.
 *
 * Users of the Renderer API, should generally interact with INode objects
 * instead of CoreNode objects.
 */
export interface INode<ShaderNode extends CoreShaderNode = CoreShaderNode>
  extends Omit<CoreNode, 'shader' | 'animate' | 'parent'> {
  shader: ShaderNode;
  animate(
    props: Partial<INodeAnimateProps<ShaderNode>>,
    settings: Partial<AnimationSettings>,
  ): IAnimationController;
  parent: INode | null;
}

/**
 * Properties used to animate() a Node
 */
export interface INodeAnimateProps<
  ShNode extends CoreShaderNode = CoreShaderNode,
> extends Omit<CoreNodeAnimateProps, 'shaderProps'> {
  shaderProps: Partial<ShNode['props']>;
}

/**
 * Properties used to create a new Node
 */
export interface INodeProps<ShNode extends CoreShaderNode = CoreShaderNode>
  extends Omit<CoreNodeProps, 'shader' | 'parent'> {
  shader: ShNode;
  parent: INode | null;
}

/**
 * A visual Node in the Renderer scene graph that renders text.
 *
 * @remarks
 * A Text Node is a special type of Node that renders text using a specific
 * text renderer, such as Web/Canvas or Signed Distance Field (SDF) text.
 *
 * For non-text rendering, see {@link INode}.
 *
 * Users of the Renderer API, should generally interact with ITextNode objects
 * instead of CoreTextNode objects.
 */
export interface ITextNode extends Omit<CoreTextNode, 'animate' | 'parent'> {
  animate(
    props: Partial<INodeAnimateProps<CoreShaderNode>>,
    settings: Partial<AnimationSettings>,
  ): IAnimationController;
  parent: INode | null;
}

/**
 * Properties used to create a new Text Node
 */
export interface ITextNodeProps extends Omit<CoreTextNodeProps, 'parent'> {
  parent: INode | null;
}
