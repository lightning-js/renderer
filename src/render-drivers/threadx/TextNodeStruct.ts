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

import { structProp, genTypeId } from '@lightningjs/threadx';
import { NodeStruct, type NodeStructWritableProps } from './NodeStruct.js';
import type {
  TextRendererMap,
  TrProps,
} from '../../core/text-rendering/renderers/TextRenderer.js';

export interface TextNodeStructWritableProps
  extends NodeStructWritableProps,
    Omit<TrProps, 'debug'> {
  textRendererOverride: keyof TextRendererMap | null;
}

export class TextNodeStruct
  extends NodeStruct
  implements TextNodeStructWritableProps
{
  static override readonly typeId = genTypeId('TEXT');

  @structProp('string')
  get text(): string {
    return '';
  }

  set text(value: string) {
    // Decorator will handle this
  }

  @structProp('string', {
    propToBuffer(value: TextNodeStructWritableProps['textRendererOverride']) {
      // Property accepts `null` but the buffer only accepts a string.
      // Encode `null` as a special string
      return value ?? '$$null';
    },
    bufferToProp(value: string) {
      return value === '$$null' ? null : (value as keyof TextRendererMap);
    },
  })
  get textRendererOverride(): TextNodeStructWritableProps['textRendererOverride'] {
    return null;
  }

  set textRendererOverride(
    value: TextNodeStructWritableProps['textRendererOverride'],
  ) {
    // Decorator will handle this
  }

  @structProp('number')
  get fontSize(): number {
    return 0;
  }

  set fontSize(value: number) {
    // Decorator will handle this
  }

  @structProp('string')
  get fontFamily(): TextNodeStructWritableProps['fontFamily'] {
    return '';
  }

  set fontFamily(value: TextNodeStructWritableProps['fontFamily']) {
    // Decorator will handle this
  }

  @structProp('string')
  get fontStretch(): TextNodeStructWritableProps['fontStretch'] {
    return 'normal';
  }

  set fontStretch(value: TextNodeStructWritableProps['fontStretch']) {
    // Decorator will handle this
  }

  @structProp('string')
  get fontStyle(): TextNodeStructWritableProps['fontStyle'] {
    return 'normal';
  }

  set fontStyle(value: TextNodeStructWritableProps['fontStyle']) {
    // Decorator will handle this
  }

  @structProp('string')
  get fontWeight(): TextNodeStructWritableProps['fontWeight'] {
    return 'normal';
  }

  set fontWeight(value: TextNodeStructWritableProps['fontWeight']) {
    // Decorator will handle this
  }

  @structProp('string')
  get textAlign(): TextNodeStructWritableProps['textAlign'] {
    return 'left';
  }

  set textAlign(value: TextNodeStructWritableProps['textAlign']) {
    // Decorator will handle this
  }

  @structProp('string')
  get contain(): TextNodeStructWritableProps['contain'] {
    return 'none';
  }

  set contain(value: TextNodeStructWritableProps['contain']) {
    // Decorator will handle this
  }

  @structProp('boolean')
  get scrollable(): TextNodeStructWritableProps['scrollable'] {
    return false;
  }

  set scrollable(value: TextNodeStructWritableProps['scrollable']) {
    // Decorator will handle this
  }

  @structProp('number')
  get scrollY(): TextNodeStructWritableProps['scrollY'] {
    return 0;
  }

  set scrollY(value: TextNodeStructWritableProps['scrollY']) {
    // Decorator will handle this
  }

  @structProp('number')
  get offsetY(): TextNodeStructWritableProps['offsetY'] {
    return 0;
  }

  set offsetY(value: TextNodeStructWritableProps['offsetY']) {
    // Decorator will handle this
  }

  @structProp('number')
  get letterSpacing(): TextNodeStructWritableProps['letterSpacing'] {
    return 0;
  }

  set letterSpacing(value: TextNodeStructWritableProps['letterSpacing']) {
    // Decorator will handle this
  }

  @structProp('number', {
    allowUndefined: true,
  })
  get lineHeight(): TextNodeStructWritableProps['lineHeight'] {
    return 0;
  }

  set lineHeight(value: TextNodeStructWritableProps['lineHeight']) {
    // Decorator will handle this
  }

  @structProp('number')
  get maxLines(): TextNodeStructWritableProps['maxLines'] {
    return 0;
  }

  set maxLines(value: TextNodeStructWritableProps['maxLines']) {
    // Decorator will handle this
  }

  @structProp('string')
  get textBaseline(): TextNodeStructWritableProps['textBaseline'] {
    return 'alphabetic';
  }

  set textBaseline(value: TextNodeStructWritableProps['textBaseline']) {
    // Decorator will handle this
  }

  @structProp('string')
  get verticalAlign(): TextNodeStructWritableProps['verticalAlign'] {
    return 'middle';
  }

  set verticalAlign(value: TextNodeStructWritableProps['verticalAlign']) {
    // Decorator will handle this
  }

  @structProp('string')
  get overflowSuffix(): TextNodeStructWritableProps['overflowSuffix'] {
    return '...';
  }

  set overflowSuffix(value: TextNodeStructWritableProps['overflowSuffix']) {
    // Decorator will handle this
  }
}
