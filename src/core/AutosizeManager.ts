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

import type { CoreNode } from './CoreNode.js';
import { Matrix3d } from './lib/Matrix3d.js';

/**
 * Cached transform data for a node in the autosize chain
 */
interface AutosizeChildData {
  localTransform: Matrix3d;
  hasChanged: boolean;
  width: number;
  height: number;
}

/**
 * Result of autosize calculation containing the new dimensions
 */
interface AutosizeResult {
  width: number;
  height: number;
  hasChanged: boolean;
}

/**
 * Creates an autosize manager for efficient child bounds calculation
 *
 * @remarks
 * This function creates a closure-based manager that tracks child transform
 * changes and calculates parent dimensions based on children's bounding boxes.
 * It's optimized for performance with minimal allocations and fast lookups.
 *
 * @param parentNode - The autosize parent node
 * @returns Object with autosize management methods
 */
export function createAutosizeManager(parentNode: CoreNode) {
  const childDataMap = new Map<CoreNode, AutosizeChildData>();
  let isActive = true;
  let lastWidth = 0;
  let lastHeight = 0;
  let lastHasChanged = false;

  const corners = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];

  /**
   * Add or update a child node in the autosize calculation chain
   * @param child - Child node to add or update
   */
  const addOrUpdateChild = (child: CoreNode): void => {
    if (isActive === false) return;
    if (child === parentNode) return; // Avoid circular references

    const currentTransform = child.localTransform || Matrix3d.identity();
    const existingData = childDataMap.get(child);

    if (existingData !== undefined) {
      // Update existing child
      Matrix3d.copy(currentTransform, existingData.localTransform);
      existingData.width = child.w;
      existingData.height = child.h;
      existingData.hasChanged = true;
    } else {
      // Add new child
      childDataMap.set(child, {
        localTransform: Matrix3d.copy(currentTransform),
        hasChanged: true,
        width: child.w,
        height: child.h,
      });
    }

    // Mark parent for recalculation
    parentNode.autosizeNeedsUpdate = true;
  };

  /**
   * Remove a child node from the autosize calculation chain
   * @param child - Child node to remove
   */
  const removeChild = (child: CoreNode): void => {
    if (childDataMap.delete(child) === true) {
      parentNode.autosizeNeedsUpdate = true;
    }
  };

  /**
   * Calculate the autosize dimensions based on all child bounds
   * @returns Autosize calculation result
   */
  const calculateAutosize = (): AutosizeResult => {
    if (isActive === false || childDataMap.size === 0) {
      return { width: 0, height: 0, hasChanged: false };
    }

    let hasAnyChildChanged = false;
    for (const childData of childDataMap.values()) {
      if (childData.hasChanged) {
        hasAnyChildChanged = true;
        break;
      }
    }

    if (hasAnyChildChanged === false) {
      return {
        width: lastWidth,
        height: lastHeight,
        hasChanged: lastHasChanged,
      };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const [child, childData] of childDataMap) {
      if (!child.isRenderable) continue;

      const transform = child.localTransform || Matrix3d.identity();
      const width = childData.width;
      const height = childData.height;

      corners[0]!.x = 0;
      corners[0]!.y = 0;
      corners[1]!.x = width;
      corners[1]!.y = 0;
      corners[2]!.x = width;
      corners[2]!.y = height;
      corners[3]!.x = 0;
      corners[3]!.y = height;

      for (let i = 0; i < 4; i++) {
        const corner = corners[i];
        const localX =
          transform.ta * corner!.x + transform.tb * corner!.y + transform.tx;
        const localY =
          transform.tc * corner!.x + transform.td * corner!.y + transform.ty;

        if (localX < minX) minX = localX;
        if (localY < minY) minY = localY;
        if (localX > maxX) maxX = localX;
        if (localY > maxY) maxY = localY;
      }

      childData.hasChanged = false;
    }

    const newWidth = maxX > minX ? maxX - minX : 0;
    const newHeight = maxY > minY ? maxY - minY : 0;
    const dimensionsChanged =
      lastWidth !== newWidth || lastHeight !== newHeight;

    lastWidth = newWidth;
    lastHeight = newHeight;
    lastHasChanged = dimensionsChanged;

    return {
      width: newWidth,
      height: newHeight,
      hasChanged: dimensionsChanged,
    };
  };

  /**
   * Deactivate this autosize manager and clean up resources
   */
  const deactivate = (): void => {
    isActive = false;
    childDataMap.clear();
  };

  return {
    addOrUpdateChild,
    removeChild,
    calculateAutosize,
    deactivate,
    get active() {
      return isActive;
    },
    get childCount() {
      return childDataMap.size;
    },
  };
}
