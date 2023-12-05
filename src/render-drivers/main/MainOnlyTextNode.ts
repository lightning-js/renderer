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

import type {
  ITextNode,
  ITextNodeWritableProps,
} from '../../main-api/INode.js';
import type { Stage } from '../../core/Stage.js';
import type { RendererMain } from '../../main-api/RendererMain.js';
import { MainOnlyNode, getNewId } from './MainOnlyNode.js';
import { CoreTextNode } from '../../core/CoreTextNode.js';

export class MainOnlyTextNode extends MainOnlyNode implements ITextNode {
  protected declare coreNode: CoreTextNode;

  constructor(
    props: ITextNodeWritableProps,
    rendererMain: RendererMain,
    stage: Stage,
  ) {
    super(
      props,
      rendererMain,
      stage,
      new CoreTextNode(stage, {
        id: getNewId(),
        x: props.x,
        y: props.y,
        width: props.width,
        height: props.height,
        alpha: props.alpha,
        clipping: props.clipping,
        color: props.color,
        colorTop: props.colorTop,
        colorBottom: props.colorBottom,
        colorLeft: props.colorLeft,
        colorRight: props.colorRight,
        colorTl: props.colorTl,
        colorTr: props.colorTr,
        colorBl: props.colorBl,
        colorBr: props.colorBr,
        zIndex: props.zIndex,
        zIndexLocked: props.zIndexLocked,
        scaleX: props.scaleX,
        scaleY: props.scaleY,
        mountX: props.mountX,
        mountY: props.mountY,
        mount: props.mount,
        pivot: props.pivot,
        pivotX: props.pivotX,
        pivotY: props.pivotY,
        rotation: props.rotation,

        // Text properties
        text: props.text,
        fontSize: props.fontSize,
        fontFamily: props.fontFamily,
        fontWeight: props.fontWeight,
        fontStretch: props.fontStretch,
        fontStyle: props.fontStyle,
        contain: props.contain,
        scrollable: props.scrollable,
        letterSpacing: props.letterSpacing,
        textAlign: props.textAlign,
        scrollY: props.scrollY,
        offsetY: props.offsetY,
        textRendererOverride: props.textRendererOverride,
        debug: props.debug,
        lineHeight: props.lineHeight,
        maxLines: props.maxLines,
        maxLinesSuffix: props.maxLinesSuffix,
        textOverflow: props.textOverflow,
        // These properties will get set appropriately in the base MainOnlyNode class
        parent: null,
        texture: null,
        textureOptions: null,
        shader: null,
        shaderProps: null,
      }),
    );
  }

  get text(): string {
    return this.coreNode.text;
  }

  set text(value: string) {
    this.coreNode.text = value;
  }

  get textRendererOverride(): ITextNode['textRendererOverride'] {
    return this.coreNode.textRendererOverride;
  }

  set textRendererOverride(value: ITextNode['textRendererOverride']) {
    this.coreNode.textRendererOverride = value;
  }

  get fontSize(): number {
    return this.coreNode.fontSize;
  }

  set fontSize(value: number) {
    this.coreNode.fontSize = value;
  }

  get fontFamily(): ITextNode['fontFamily'] {
    return this.coreNode.fontFamily;
  }

  set fontFamily(value: ITextNode['fontFamily']) {
    this.coreNode.fontFamily = value;
  }

  get fontWeight(): ITextNode['fontWeight'] {
    return this.coreNode.fontWeight;
  }

  set fontWeight(value: ITextNode['fontWeight']) {
    this.coreNode.fontWeight = value;
  }

  get fontStretch(): ITextNode['fontStretch'] {
    return this.coreNode.fontStretch;
  }

  set fontStretch(value: ITextNode['fontStretch']) {
    this.coreNode.fontStretch = value;
  }

  get fontStyle(): ITextNode['fontStyle'] {
    return this.coreNode.fontStyle;
  }

  set fontStyle(value: ITextNode['fontStyle']) {
    this.coreNode.fontStyle = value;
  }

  get textAlign(): ITextNode['textAlign'] {
    return this.coreNode.textAlign;
  }

  set textAlign(value: ITextNode['textAlign']) {
    this.coreNode.textAlign = value;
  }

  get contain(): ITextNode['contain'] {
    return this.coreNode.contain;
  }

  set contain(value: ITextNode['contain']) {
    this.coreNode.contain = value;
  }

  get scrollable(): ITextNode['scrollable'] {
    return this.coreNode.scrollable;
  }

  set scrollable(value: ITextNode['scrollable']) {
    this.coreNode.scrollable = value;
  }

  get scrollY(): ITextNode['scrollY'] {
    return this.coreNode.scrollY;
  }

  set scrollY(value: ITextNode['scrollY']) {
    this.coreNode.scrollY = value;
  }

  get offsetY(): ITextNode['offsetY'] {
    return this.coreNode.offsetY;
  }

  set offsetY(value: ITextNode['offsetY']) {
    this.coreNode.offsetY = value;
  }

  get letterSpacing(): ITextNode['letterSpacing'] {
    return this.coreNode.letterSpacing;
  }

  set letterSpacing(value: ITextNode['letterSpacing']) {
    this.coreNode.letterSpacing = value;
  }

  get lineHeight(): ITextNode['lineHeight'] {
    return this.coreNode.lineHeight;
  }

  set lineHeight(value: ITextNode['lineHeight']) {
    if (value) {
      this.coreNode.maxLines = value;
    }
  }

  get maxLines(): ITextNode['maxLines'] {
    return this.coreNode.maxLines;
  }

  set maxLines(value: ITextNode['maxLines']) {
    if (value) {
      this.coreNode.maxLines = value;
    }
  }

  get maxLinesSuffix(): ITextNode['maxLinesSuffix'] {
    return this.coreNode.maxLinesSuffix;
  }

  set maxLinesSuffix(value: ITextNode['maxLinesSuffix']) {
    if (value) {
      this.coreNode.maxLinesSuffix = value;
    }
  }

  get textOverflow(): ITextNode['textOverflow'] {
    return this.coreNode.textOverflow;
  }

  set textOverflow(value: ITextNode['textOverflow']) {
    if (value) {
      this.coreNode.textOverflow = value;
    }
  }

  get debug(): ITextNode['debug'] {
    return this.coreNode.debug;
  }

  set debug(value: ITextNode['debug']) {
    this.coreNode.debug = value;
  }
}
