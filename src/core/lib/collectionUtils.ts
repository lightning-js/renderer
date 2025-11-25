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

import type { CoreNode } from '../CoreNode.js';

//Bucket sort implementation for sorting CoreNode arrays by zIndex
export const bucketSortByZIndex = (nodes: CoreNode[], min: number): void => {
  const buckets: CoreNode[][] = [];
  const bucketIndices: number[] = [];
  //distribute nodes into buckets
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const index = node.props.zIndex - min;
    //create bucket if it doesn't exist
    if (buckets[index] === undefined) {
      buckets[index] = [];
      bucketIndices.push(index);
    }
    buckets[index]!.push(node);
  }

  //sort each bucket using insertion sort
  for (let i = 1; i < bucketIndices.length; i++) {
    const key = bucketIndices[i]!;
    let j = i - 1;
    while (j >= 0 && bucketIndices[j]! > key) {
      bucketIndices[j + 1] = bucketIndices[j]!;
      j--;
    }
    bucketIndices[j + 1] = key;
  }

  //flatten buckets
  let idx = 0;
  for (let i = 0; i < bucketIndices.length; i++) {
    const bucket = buckets[bucketIndices[i]!]!;
    for (let j = 0; j < bucket.length; j++) {
      nodes[idx++] = bucket[j]!;
    }
  }

  //clean up
  buckets.length = 0;
  bucketIndices.length = 0;
};

export const incrementalRepositionByZIndex = (
  changedNodes: CoreNode[],
  nodes: CoreNode[],
): void => {
  for (let i = 0; i < changedNodes.length; i++) {
    const node = changedNodes[i]!;
    const currentIndex = findChildIndexById(node, nodes);
    if (currentIndex === -1) continue;

    //remove node from current position
    nodes.splice(currentIndex, 1);

    let left = 0;
    let right = nodes.length - 1;
    const targetZIndex = node.props.zIndex;

    while (left < right) {
      const mid = (left + right) >>> 1;
      if (nodes[mid]!.props.zIndex < targetZIndex) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    nodes.splice(left, 0, node);
  }
};

export const findChildIndexById = (
  node: CoreNode,
  children: CoreNode[],
): number => {
  for (let i = 0; i < children.length; i++) {
    const child = children[i]!;

    // @ts-ignore - accessing protected property
    if (child._id === node._id) {
      return i;
    }
  }
  return -1;
};

export const removeChild = (node: CoreNode, children: CoreNode[]): void => {
  const index = findChildIndexById(node, children);
  if (index !== -1) {
    children.splice(index, 1);
  }
};
