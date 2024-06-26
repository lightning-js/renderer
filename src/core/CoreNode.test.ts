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

import { describe, expect, it } from 'vitest';
import {
  CoreNode,
  type CoreNodeWritableProps,
  UpdateType,
} from './CoreNode.js';
import { Stage } from './Stage.js';
import { mock } from 'vitest-mock-extended';
import { type TextureOptions } from './CoreTextureManager.js';

describe('set color()', () => {
  const defaultProps: CoreNodeWritableProps = {
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
    shader: null,
    shaderProps: null,
    src: '',
    texture: null,
    textureOptions: {} as TextureOptions,
    width: 0,
    x: 0,
    y: 0,
    zIndex: 0,
    zIndexLocked: 0,
  };

  it('should set all color subcomponents.', () => {
    const node = new CoreNode(mock<Stage>(), defaultProps);
    node.colorBl = 0x99aabbff;
    node.colorBr = 0xaabbccff;
    node.colorTl = 0xbbcceeff;
    node.colorTr = 0xcceeffff;

    node.color = 0xffffffff;

    expect(node.color).toBe(0xffffffff);
    expect(node.colorBl).toBe(0xffffffff);
    expect(node.colorBr).toBe(0xffffffff);
    expect(node.colorTl).toBe(0xffffffff);
    expect(node.colorTr).toBe(0xffffffff);
    expect(node.colorLeft).toBe(0xffffffff);
    expect(node.colorRight).toBe(0xffffffff);
    expect(node.colorTop).toBe(0xffffffff);
    expect(node.colorBottom).toBe(0xffffffff);
  });

  it('should set update type.', () => {
    const node = new CoreNode(mock<Stage>(), defaultProps);
    node.updateType = 0;

    node.color = 0xffffffff;

    expect(node.updateType).toBe(UpdateType.PremultipliedColors);
  });
});
