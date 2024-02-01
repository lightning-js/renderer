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

import { CoreTextNode } from '../../../core/CoreTextNode.js';
import type { Stage } from '../../../core/Stage.js';
import type { TrProps } from '../../../core/text-rendering/renderers/TextRenderer.js';
import type { NodeStructWritableProps } from '../NodeStruct.js';
import type {
  TextNodeStruct,
  TextNodeStructWritableProps,
} from '../TextNodeStruct.js';
import { ThreadXRendererNode } from './ThreadXRendererNode.js';

export class ThreadXRendererTextNode extends ThreadXRendererNode {
  declare coreNode: CoreTextNode;
  declare z$__type__Props: TextNodeStructWritableProps &
    ThreadXRendererNode['z$__type__Props'];

  constructor(stage: Stage, sharedNodeStruct: TextNodeStruct) {
    super(
      stage,
      sharedNodeStruct,
      new CoreTextNode(stage, {
        id: sharedNodeStruct.id,
        // It doesn't matter what these are initially. They will be reset
        // appropriately via the onPropertyChange() calls below and in the
        // ThreadXRendererNode constructor.
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
        zIndex: sharedNodeStruct.zIndex,
        zIndexLocked: sharedNodeStruct.zIndexLocked,
        mount: sharedNodeStruct.mount,
        mountX: sharedNodeStruct.mountX,
        mountY: sharedNodeStruct.mountY,
        pivot: sharedNodeStruct.pivot,
        pivotX: sharedNodeStruct.pivotX,
        pivotY: sharedNodeStruct.pivotY,
        scaleX: sharedNodeStruct.scaleX,
        scaleY: sharedNodeStruct.scaleY,
        rotation: sharedNodeStruct.rotation,
        rtt: sharedNodeStruct.rtt,

        // These are passed in via message handlers
        shader: null,
        shaderProps: null,
        texture: null,
        textureOptions: null,

        // Setup the parent after
        parent: null,

        // Text properties
        text: sharedNodeStruct.text,
        textRendererOverride: sharedNodeStruct.textRendererOverride,
        fontSize: sharedNodeStruct.fontSize,
        fontFamily: sharedNodeStruct.fontFamily,
        fontWeight: sharedNodeStruct.fontWeight,
        fontStretch: sharedNodeStruct.fontStretch,
        fontStyle: sharedNodeStruct.fontStyle,
        lineHeight: sharedNodeStruct.lineHeight,
        maxLines: sharedNodeStruct.maxLines,
        textBaseline: sharedNodeStruct.textBaseline,
        verticalAlign: sharedNodeStruct.verticalAlign,
        overflowSuffix: sharedNodeStruct.overflowSuffix,
        contain: sharedNodeStruct.contain,
        letterSpacing: sharedNodeStruct.letterSpacing,
        offsetY: sharedNodeStruct.offsetY,
        textAlign: sharedNodeStruct.textAlign,
        scrollable: sharedNodeStruct.scrollable,
        scrollY: sharedNodeStruct.scrollY,
        debug: {},
      }),
      {
        text: sharedNodeStruct.text,
        textRendererOverride: sharedNodeStruct.textRendererOverride,
        fontSize: sharedNodeStruct.fontSize,
        fontFamily: sharedNodeStruct.fontFamily,
        fontWeight: sharedNodeStruct.fontWeight,
        fontStretch: sharedNodeStruct.fontStretch,
        fontStyle: sharedNodeStruct.fontStyle,
        lineHeight: sharedNodeStruct.lineHeight,
        maxLines: sharedNodeStruct.maxLines,
        textBaseline: sharedNodeStruct.textBaseline,
        verticalAlign: sharedNodeStruct.verticalAlign,
        overflowSuffix: sharedNodeStruct.overflowSuffix,
        contain: sharedNodeStruct.contain,
        letterSpacing: sharedNodeStruct.letterSpacing,
        offsetY: sharedNodeStruct.offsetY,
        textAlign: sharedNodeStruct.textAlign,
        scrollable: sharedNodeStruct.scrollable,
        scrollY: sharedNodeStruct.scrollY,
      } satisfies Omit<
        TextNodeStructWritableProps,
        keyof NodeStructWritableProps | 'debug'
      >,
    );
    // Forward on CoreNode events
    this.on('debug', (target: ThreadXRendererNode, debug: TrProps['debug']) => {
      this.coreNode.debug = debug;
    });
  }

  declare text: TextNodeStructWritableProps['text'];
  declare textRendererOverride: TextNodeStructWritableProps['textRendererOverride'];
  declare fontSize: TextNodeStructWritableProps['fontSize'];
  declare fontFamily: TextNodeStructWritableProps['fontFamily'];
  declare fontWeight: TextNodeStructWritableProps['fontWeight'];
  declare fontStretch: TextNodeStructWritableProps['fontStretch'];
  declare fontStyle: TextNodeStructWritableProps['fontStyle'];
  declare lineHeight: TextNodeStructWritableProps['lineHeight'];
  declare maxLines: TextNodeStructWritableProps['maxLines'];
  declare textBaseline: TextNodeStructWritableProps['textBaseline'];
  declare verticalAlign: TextNodeStructWritableProps['verticalAlign'];
  declare overflowSuffix: TextNodeStructWritableProps['overflowSuffix'];
  declare contain: TextNodeStructWritableProps['contain'];
  declare letterSpacing: TextNodeStructWritableProps['letterSpacing'];
  declare offsetY: TextNodeStructWritableProps['offsetY'];
  declare textAlign: TextNodeStructWritableProps['textAlign'];
  declare scrollable: TextNodeStructWritableProps['scrollable'];
  declare scrollY: TextNodeStructWritableProps['scrollY'];
}
