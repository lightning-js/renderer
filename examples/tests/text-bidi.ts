/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2024 Comcast Cable Communications Management, LLC.
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

import type { ExampleSettings } from '../common/ExampleSettings.js';
import { waitForLoadedDimensions } from '../common/utils.js';

export async function automation(settings: ExampleSettings) {
  await test(settings);
  await settings.snapshot();
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  const fontFamily = 'ArialArabic';
  const fontSize = 30;
  let yPos = 0;
  testRoot.width = 500;
  testRoot.height = 500;
  testRoot.clipping = true;
  testRoot.color = 0xffffffff;

  const nodeProps: Array<{
    text: string;
    bidi?: boolean;
    textAlign?: 'left' | 'center' | 'right' | 'start' | 'end';
  }> = [
    {
      text: 'Default Text',
    },

    {
      text: 'textAlign end',
      textAlign: 'end',
    },
    {
      text: 'bidi, textAlign start',
      bidi: true,
    },
    {
      text: 'bidi, textAlign left',
      bidi: true,
      textAlign: 'left',
    },
    {
      text: 'bidi, textAlign center',
      bidi: true,
      textAlign: 'center',
    },
    {
      text: 'bidi, textAlign right',
      bidi: true,
      textAlign: 'right',
    },
    {
      text: 'bidi, textAlign end',
      bidi: true,
      textAlign: 'end',
    },
  ];

  for (const props of nodeProps) {
    renderer.createTextNode({
      text: props.text,
      y: yPos,
      width: testRoot.width,
      fontSize: 20,
      fontFamily,
      contain: 'width',
      color: 0x000000ff,
      parent: testRoot,
    });

    yPos += 20;
    props.text = 'Text (with: !أسباب لمشاهدة)';

    const text = renderer.createTextNode({
      ...props,
      y: yPos,
      width: testRoot.width,
      fontSize,
      fontFamily,
      contain: 'width',
      color: 0x0000ff77,
      parent: testRoot,
    });
    const dimensions = await waitForLoadedDimensions(text);

    yPos += dimensions.height;

    renderer.createNode({
      x: 0,
      y: yPos,
      width: testRoot.width,
      height: 2,
      color: 0x000000ff,
      parent: testRoot,
    });

    yPos += 2;
  }
}
