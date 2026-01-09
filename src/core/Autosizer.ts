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

import { UpdateType, type CoreNode } from './CoreNode.js';
import type { Coord } from './lib/utils.js';

export enum AutosizeUpdateType {
  None = 0,
  Filtered = 1,
  All = 2,
}

const applyDimensions = (
  node: CoreNode,
  carryOver: boolean,
  w: number,
  h: number,
) => {
  if (carryOver === true) {
    node.w = w;
    node.h = h;
    return;
  }
  node.props.w = w;
  node.props.h = h;
};

let autosizerId = 0;

export class Autosizer {
  public id = autosizerId++;

  updateType: AutosizeUpdateType = AutosizeUpdateType.All;
  lastWidth: number = 0;
  lastHeight: number = 0;
  lastHasChanged: boolean = false;

  flaggedChildren: CoreNode[] = [];
  childMap: Map<number, CoreNode> = new Map();

  minX = Infinity;
  minY = Infinity;
  maxX = -Infinity;
  maxY = -Infinity;

  corners: [Coord, Coord, Coord, Coord] = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];

  constructor(public node: CoreNode) {}

  attach(node: CoreNode) {
    this.childMap.set(node.id, node);
    node.parentAutosizer = this;

    //bubble down to attach to grandchildren
    if (node.children.length > 0 && node.autosizer === null) {
      const children = node.children;
      for (let i = 0; i < children.length; i++) {
        this.attach(children[i]!);
      }
    }
  }

  detach(node: CoreNode) {
    if (this.childMap.delete(node.id) === true) {
      node.parentAutosizer = null;
      if (node.children.length > 0 && node.autosizer === null) {
        const children = node.children;
        for (let i = 0; i < children.length; i++) {
          this.detach(children[i]!);
        }
      }
      //detached a child, need full update
      this.setUpdateType(AutosizeUpdateType.All);
    }
  }

  patch(node: CoreNode) {
    const entry = this.childMap.get(node.id);
    if (entry === undefined) {
      return;
    }
    this.flaggedChildren.push(node);
    this.setUpdateType(AutosizeUpdateType.Filtered);
  }

  setUpdateType(updateType: AutosizeUpdateType) {
    this.updateType |= updateType;

    queueMicrotask(() => {
      this.node.setUpdateType(UpdateType.Autosize);
    });
  }

  update(carryOver = false) {
    const node = this.node;

    if (node.texture !== null && node.texture.dimensions !== null) {
      const { w, h } = node.texture.dimensions;
      applyDimensions(node, carryOver, w, h);
      this.lastWidth = w;
      this.lastHeight = h;
      this.updateType = AutosizeUpdateType.None;
      return;
    }

    let filtered: CoreNode[] =
      this.updateType === AutosizeUpdateType.Filtered
        ? this.flaggedChildren
        : Array.from(this.childMap.values());

    if (filtered.length === 0) {
      return;
    }

    const corners = this.corners;
    let minX = this.minX;
    let minY = this.minY;
    let maxX = this.maxX;
    let maxY = this.maxY;

    for (let i = 0; i < filtered.length; i++) {
      const child = filtered[i]!;
      if (child.isRenderable === false || child.localTransform === undefined) {
        continue;
      }

      const { tx, ty, ta, tb, tc, td } = child.localTransform;
      const w = child.props.w;
      const h = child.props.h;

      const childMinX = tx;
      const childMaxX = tx + w * ta;
      const childMinY = ty;
      const childMaxY = ty + h * td;

      corners[0].x = childMinX;
      corners[0].y = childMinY;
      corners[1].x = childMaxX;

      //no rotation/scale
      if (tb === 0 && tc === 0) {
        corners[1].y = childMinY;
        corners[2].x = childMaxX;
        corners[2].y = childMaxY;
        corners[3].x = childMinX;
        corners[3].y = childMaxY;
      } else {
        corners[1].y = tx + w * tc;
        corners[2].x = tx + w * ta + h * tb;
        corners[2].y = ty + w * tc + h * td;
        corners[3].x = tx + h * tb;
        corners[3].y = ty + h * td;
      }

      for (let j = 0; j < 4; j++) {
        const corner = corners[j]!;
        if (corner.x < minX) minX = corner.x;
        if (corner.y < minY) minY = corner.y;
        if (corner.x > maxX) maxX = corner.x;
        if (corner.y > maxY) maxY = corner.y;
      }
    }
    this.flaggedChildren.length = 0;
    this.updateType = AutosizeUpdateType.None;

    const newWidth = maxX > 0 ? maxX : 0;
    const newHeight = maxY > 0 ? maxY : 0;

    applyDimensions(node, carryOver, newWidth, newHeight);
    this.lastWidth = newWidth;
    this.lastHeight = newHeight;
  }

  destroy() {
    if (this.childMap.size > 0) {
      for (const child of this.childMap.values()) {
        child.parentAutosizer = null;
      }
    }
    this.childMap.clear();
    this.flaggedChildren.length = 0;
  }
}
