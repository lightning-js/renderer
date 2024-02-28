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

import { BufferStruct, structProp, genTypeId } from '@lightningjs/threadx';

export interface NodeStructWritableProps {
  x: number;
  y: number;
  width: number;
  height: number;
  alpha: number;
  clipping: boolean;
  color: number;
  colorTop: number;
  colorBottom: number;
  colorLeft: number;
  colorRight: number;
  colorTl: number;
  colorTr: number;
  colorBr: number;
  colorBl: number;
  parentId: number;
  zIndex: number;
  zIndexLocked: number;
  scaleX: number;
  scaleY: number;
  mount: number;
  mountX: number;
  mountY: number;
  pivot: number;
  pivotX: number;
  pivotY: number;
  rotation: number;
  rtt: boolean;
}

export class NodeStruct
  extends BufferStruct
  implements NodeStructWritableProps
{
  static override readonly typeId = genTypeId('NODE');

  @structProp('number')
  get x(): number {
    return 0;
  }

  set x(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get y(): number {
    return 0;
  }

  set y(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get width(): number {
    return 0;
  }

  set width(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get height(): number {
    return 0;
  }

  set height(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get alpha(): number {
    return 1;
  }

  set alpha(value: number) {
    // Decorator will handle this
  }

  @structProp('boolean')
  get clipping(): boolean {
    return false;
  }

  set clipping(value: boolean) {
    // Decorator will handle this
  }

  @structProp('number')
  get color(): number {
    return 0;
  }

  set color(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get colorTop(): number {
    return 0;
  }

  set colorTop(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get colorBottom(): number {
    return 0;
  }

  set colorBottom(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get colorLeft(): number {
    return 0;
  }

  set colorLeft(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get colorRight(): number {
    return 0;
  }

  set colorRight(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get colorTl(): number {
    return 0;
  }

  set colorTl(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get colorTr(): number {
    return 0;
  }

  set colorTr(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get colorBl(): number {
    return 0;
  }

  set colorBl(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get colorBr(): number {
    return 0;
  }

  set colorBr(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get scaleX(): number {
    return 1;
  }

  set scaleX(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get scaleY(): number {
    return 1;
  }

  set scaleY(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get mount(): number {
    return 0;
  }

  set mount(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get mountX(): number {
    return 0;
  }

  set mountX(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get mountY(): number {
    return 0;
  }

  set mountY(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get pivot(): number {
    return 0.5;
  }

  set pivot(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get pivotX(): number {
    return 0.5;
  }

  set pivotX(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get pivotY(): number {
    return 0.5;
  }

  set pivotY(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get rotation(): number {
    return 0;
  }

  set rotation(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get parentId(): number {
    return 0;
  }

  set parentId(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get zIndex(): number {
    return 0;
  }

  set zIndex(value: number) {
    // Decorator will handle this
  }

  @structProp('number')
  get zIndexLocked(): number {
    return 0;
  }

  set zIndexLocked(value: number) {
    // Decorator will handle this
  }

  @structProp('boolean')
  get rtt(): boolean {
    return false;
  }

  set rtt(value: boolean) {
    // Decorator will handle this
  }
}
