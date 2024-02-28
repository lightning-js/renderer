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

import type { NodeStruct, NodeStructWritableProps } from './NodeStruct.js';
import { SharedObject } from '@lightningjs/threadx';

export class SharedNode extends SharedObject {
  declare z$__type__Props: NodeStructWritableProps &
    SharedObject['z$__type__Props'];

  /**
   * Must have lock on sharedNode before calling constructor!
   *
   * @param sharedNodeStruct
   */
  constructor(
    sharedNodeStruct: NodeStruct,
    extendedCurProps?: Record<string, unknown>,
  ) {
    super(sharedNodeStruct, {
      ...extendedCurProps,
      x: sharedNodeStruct.x,
      y: sharedNodeStruct.y,
      width: sharedNodeStruct.width,
      height: sharedNodeStruct.height,
      alpha: sharedNodeStruct.alpha,
      clipping: sharedNodeStruct.clipping,
      color: sharedNodeStruct.color,
      colorTop: sharedNodeStruct.colorTop,
      colorBottom: sharedNodeStruct.colorBottom,
      colorLeft: sharedNodeStruct.colorLeft,
      colorRight: sharedNodeStruct.colorRight,
      colorTl: sharedNodeStruct.colorTl,
      colorTr: sharedNodeStruct.colorTr,
      colorBl: sharedNodeStruct.colorBl,
      colorBr: sharedNodeStruct.colorBr,
      parentId: sharedNodeStruct.parentId,
      zIndex: sharedNodeStruct.zIndex,
      zIndexLocked: sharedNodeStruct.zIndexLocked,
      scaleX: sharedNodeStruct.scaleX,
      scaleY: sharedNodeStruct.scaleY,
      mount: sharedNodeStruct.mount,
      mountX: sharedNodeStruct.mountX,
      mountY: sharedNodeStruct.mountY,
      pivot: sharedNodeStruct.pivot,
      pivotX: sharedNodeStruct.pivotX,
      pivotY: sharedNodeStruct.pivotY,
      rotation: sharedNodeStruct.rotation,
      rtt: sharedNodeStruct.rtt,
    } satisfies NodeStructWritableProps);
  }

  // Declare getters and setters for all properties that are automatically
  // generated on this class.
  declare x: number;
  declare y: number;
  declare width: number;
  declare height: number;
  declare alpha: number;
  declare clipping: boolean;
  declare color: number;
  declare colorTop: number;
  declare colorBottom: number;
  declare colorLeft: number;
  declare colorRight: number;
  declare colorTl: number;
  declare colorTr: number;
  declare colorBl: number;
  declare colorBr: number;
  declare scaleX: number;
  declare scaleY: number;
  declare mountX: number;
  declare mountY: number;
  declare mount: number;
  declare pivot: number;
  declare pivotX: number;
  declare pivotY: number;
  declare rotation: number;
  protected declare parentId: number;
  declare zIndex: number;
  declare zIndexLocked: number;
  declare rtt: boolean;
}
