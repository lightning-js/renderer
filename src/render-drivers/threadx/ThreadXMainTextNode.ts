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

import type { ITextNode } from '../../main-api/INode.js';
import type { RendererMain } from '../../main-api/RendererMain.js';
import type { NodeStructWritableProps } from './NodeStruct.js';
import type {
  TextNodeStruct,
  TextNodeStructWritableProps,
} from './TextNodeStruct.js';
import { ThreadXMainNode } from './ThreadXMainNode.js';

export class ThreadXMainTextNode extends ThreadXMainNode implements ITextNode {
  protected _debug: ITextNode['debug'] = {};

  constructor(rendererMain: RendererMain, sharedNodeStruct: TextNodeStruct) {
    super(rendererMain, sharedNodeStruct, {
      text: sharedNodeStruct.text,
      textRendererOverride: sharedNodeStruct.textRendererOverride,
      fontSize: sharedNodeStruct.fontSize,
      fontFamily: sharedNodeStruct.fontFamily,
      fontStretch: sharedNodeStruct.fontStretch,
      fontStyle: sharedNodeStruct.fontStyle,
      fontWeight: sharedNodeStruct.fontWeight,
      lineHeight: sharedNodeStruct.lineHeight,
      maxLines: sharedNodeStruct.maxLines,
      contain: sharedNodeStruct.contain,
      letterSpacing: sharedNodeStruct.letterSpacing,
      offsetY: sharedNodeStruct.offsetY,
      scrollable: sharedNodeStruct.scrollable,
      scrollY: sharedNodeStruct.scrollY,
      textAlign: sharedNodeStruct.textAlign,
    } satisfies Omit<TextNodeStructWritableProps, keyof NodeStructWritableProps>);
  }

  declare text: ITextNode['text'];
  declare textRendererOverride: ITextNode['textRendererOverride'];
  declare fontSize: ITextNode['fontSize'];
  declare fontFamily: ITextNode['fontFamily'];
  declare fontStretch: ITextNode['fontStretch'];
  declare fontStyle: ITextNode['fontStyle'];
  declare fontWeight: ITextNode['fontWeight'];
  declare lineHeight: ITextNode['lineHeight'];
  declare maxLines: ITextNode['maxLines'];
  declare textAlign: ITextNode['textAlign'];
  declare contain: ITextNode['contain'];
  declare scrollable: ITextNode['scrollable'];
  declare scrollY: ITextNode['scrollY'];
  declare offsetY: ITextNode['offsetY'];
  declare letterSpacing: ITextNode['letterSpacing'];

  get debug(): ITextNode['debug'] {
    return this._debug;
  }

  set debug(debug: ITextNode['debug']) {
    if (this._debug === debug) {
      return;
    }
    this._debug = debug;
    this.emit('debug', debug);
  }
}
