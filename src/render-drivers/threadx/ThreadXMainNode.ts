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

import type { IAnimationController } from '../../common/IAnimationController.js';
import type {
  CustomDataMap,
  INode,
  INodeAnimatableProps,
} from '../../main-api/INode.js';
import type {
  RendererMain,
  ShaderRef,
  TextureRef,
} from '../../main-api/RendererMain.js';
import { assertTruthy } from '../../utils.js';
import type { NodeStruct } from './NodeStruct.js';
import { SharedNode } from './SharedNode.js';
import { ThreadXMainAnimationController } from './ThreadXMainAnimationController.js';
import type { AnimationSettings } from '../../core/animations/CoreAnimation.js';
import { santizeCustomDataMap } from '../utils.js';

export class ThreadXMainNode extends SharedNode implements INode {
  private nextAnimationId = 1;
  protected _parent: ThreadXMainNode | null = null;
  protected _children: ThreadXMainNode[] = [];
  protected _texture: TextureRef | null = null;
  protected _shader: ShaderRef | null = null;
  protected _data: CustomDataMap | undefined = {};
  private _src = '';
  private _parentHasRenderTexture = false;

  /**
   * FinalizationRegistry for animation controllers. When an animation
   * controller is garbage collected, we let the render worker know so that
   * it can remove it's corresponding animation controler from it's stored
   * Set. This should ultimately allow the render worker to garbage collect
   * it's animation controller. The animation itself independent from the animation
   * controller, so it will continue to run until it's finished regardless of
   * whether or not the animation controller is garbage collected.
   */
  private animationRegistry = new FinalizationRegistry((id: number) => {
    this.emit('destroyAnimation', { id });
  });

  constructor(
    private rendererMain: RendererMain,
    sharedNodeStruct: NodeStruct,
    extendedCurProps?: Record<string, unknown>,
  ) {
    super(sharedNodeStruct, extendedCurProps);
  }

  get texture(): TextureRef | null {
    return this._texture;
  }

  set texture(texture: TextureRef | null) {
    if (this._texture === texture) {
      return;
    }
    if (this._texture) {
      this.rendererMain.textureTracker.decrementTextureRefCount(this._texture);
    }
    if (texture) {
      this.rendererMain.textureTracker.incrementTextureRefCount(texture);
    }
    this._texture = texture;
    if (texture) {
      this.emit('loadTexture', texture as unknown as Record<string, unknown>);
    } else {
      this.emit('unloadTexture', {});
    }
  }

  get shader(): ShaderRef | null {
    return this._shader;
  }

  set shader(shader: ShaderRef | null) {
    if (this._shader === shader) {
      return;
    }
    this._shader = shader;
    if (shader) {
      this.emit('loadShader', shader as unknown as Record<string, unknown>);
    }
  }

  get scale(): number | null {
    if (this.scaleX !== this.scaleY) {
      return null;
    }
    return this.scaleX;
  }

  set scale(scale: number | null) {
    // We ignore `null` when it's set.
    if (scale === null) {
      return;
    }
    this.scaleX = scale;
    this.scaleY = scale;
  }

  animate(
    props: Partial<INodeAnimatableProps>,
    settings: Partial<AnimationSettings>,
  ): IAnimationController {
    const id = this.nextAnimationId++;
    this.emit('createAnimation', { id, props, settings });
    const controller = new ThreadXMainAnimationController(this, id);
    this.animationRegistry.register(controller, id);
    return controller;
  }

  get src(): string {
    return this._src;
  }

  set src(imageUrl: string) {
    if (this._src === imageUrl) {
      return;
    }
    this._src = imageUrl;
    if (!imageUrl) {
      this.texture = null;
      return;
    }
    this.texture = this.rendererMain.createTexture('ImageTexture', {
      src: imageUrl,
    });
  }

  //#region Parent/Child Props
  get parent(): ThreadXMainNode | null {
    return this._parent;
  }

  set parent(newParent: ThreadXMainNode | null) {
    const oldParent = this._parent;
    this._parent = newParent;
    this.parentId = newParent?.id ?? 0;
    if (oldParent) {
      const index = oldParent.children.indexOf(this);
      assertTruthy(
        index !== -1,
        "ThreadXMainNode.parent: Node not found in old parent's children!",
      );
      oldParent.children.splice(index, 1);
    }
    if (newParent) {
      newParent.children.push(this);
    }
  }

  set parentHasRenderTexture(hasRenderTexture: boolean) {
    this._parentHasRenderTexture = hasRenderTexture;
  }

  get parentHasRenderTexture(): boolean {
    return this._parentHasRenderTexture;
  }

  get children(): ThreadXMainNode[] {
    return this._children;
  }
  //#endregion Parent/Child Props

  get props() {
    return this.curProps;
  }

  get data(): CustomDataMap | undefined {
    return this._data;
  }

  set data(d: CustomDataMap) {
    this._data = santizeCustomDataMap(d);
  }

  override destroy() {
    super.destroy();
    this.texture = null;
  }
}
