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

import {
  type INode,
  type ITextNode,
  type RendererMain,
  type Dimensions,
  type TextLoadedEventHandler,
} from '@lightningjs/renderer';
import { EventEmitter } from '@lightningjs/renderer/utils';
import type { ExampleSettings } from '../common/ExampleSettings.js';

const HEADER_SIZE = 45;
const FONT_SIZE = 60;
const BUTTON_PADDING = 10;
const BEGIN_Y = HEADER_SIZE;

export default async function ({
  renderer,
  appDimensions,
  driverName,
}: ExampleSettings) {
  const header = renderer.createTextNode({
    text: `Text Event Test (${driverName})`,
    fontSize: HEADER_SIZE,
    offsetY: -5,
    parent: renderer.root,
  });

  // Poor man's marquee
  const sdfLabel = renderer.createTextNode({
    text: 'SDF:',
    fontSize: 45,
    parent: renderer.root,
    x: 100,
    y: (appDimensions.height * 1) / 4 - 45 / 2,
  });

  const marqueeSdf = new BoxedText(
    {
      x: 0,
      y: BEGIN_Y,
      boxColor1: 0x9f6dffff,
      boxColor2: 0x00aaaaff,
      textColor: 0xffffffff,
      fontFamily: 'Ubuntu',
      parent: renderer.root,
    },
    renderer,
  );

  marqueeSdf.on('afterLayout', () => {
    marqueeSdf.x = appDimensions.width / 2 - marqueeSdf.node.width / 2;
    marqueeSdf.y = (appDimensions.height * 1) / 4 - marqueeSdf.node.height / 2;
  });

  const canvasLabel = renderer.createTextNode({
    text: 'Canvas:',
    fontSize: 45,
    parent: renderer.root,
    x: 100,
    y: (appDimensions.height * 3) / 4 - 45 / 2,
  });

  const marqueeCanvas = new BoxedText(
    {
      x: 0,
      y: BEGIN_Y,
      boxColor1: 0x00aaaaff,
      boxColor2: 0x9f6dffff,
      textColor: 0xffffffff,
      fontFamily: 'NotoSans',
      parent: renderer.root,
    },
    renderer,
  );

  marqueeCanvas.on('afterLayout', () => {
    marqueeCanvas.x = appDimensions.width / 2 - marqueeCanvas.node.width / 2;
    marqueeCanvas.y =
      (appDimensions.height * 3) / 4 - marqueeCanvas.node.height / 2;
  });

  const marqueeText = `The following is a test of the textLoaded event...
From Philly's streets to Dutch canal's grace,
A code symphony spanned time and space.
Lightning 3 emerged, open and free,
TV apps bloomed like waves on the sea.

JavaScript's art with WebGL's embrace,
A framework for screens, a virtual space.
Dispersed yet aligned, the team took flight,
Philadelphia and Netherlands, day and night.

Together they wove lines of code,
Innovation sparked, passion glowed.
Lightning 3 arose, a collaborative dream,
Uniting two lands, a powerful stream.`;
  const MARQUEE_MAX = 40;
  let numChars = 0;
  let i = 0;
  let state: 'growing' | 'scrolling' | 'shrinking' = 'growing';
  // Run the marquee scroll
  setInterval(() => {
    if (state === 'growing') {
      numChars++;

      if (numChars <= MARQUEE_MAX && numChars <= marqueeText.length - i) {
        // No change
      } else if (
        numChars >= MARQUEE_MAX &&
        numChars <= marqueeText.length - i
      ) {
        numChars = MARQUEE_MAX;
        state = 'scrolling';
      } else if (numChars > 0) {
        state = 'shrinking';
      }
    } else if (state === 'shrinking') {
      i++;
      numChars--;
      if (numChars === 0) {
        i = 0;
        state = 'growing';
      }
    } else {
      i++;
      if (numChars >= marqueeText.length - i) {
        state = 'shrinking';
      }
    }
    // Set the text
    marqueeSdf.text = marqueeText.substring(i, i + numChars);
    marqueeCanvas.text = marqueeSdf.text;
  }, 50);

  const textFailedEventTest = renderer.createTextNode({
    y: 50,
    fontFamily: '$$SDF_FAILURE_TEST$$',
    textRendererOverride: 'sdf',
    parent: renderer.root,
    fontSize: 50,
  });

  let textError: Error | undefined;
  try {
    textError = await waitForTextFailed(textFailedEventTest);
  } catch (e: unknown) {
    // Nothing
  }

  textFailedEventTest.fontFamily = 'Ubuntu';
  if (textError) {
    textFailedEventTest.text = 'Failure Event Test Passed!';
    textFailedEventTest.color = 0x00ff00ff;
  } else {
    textFailedEventTest.text = 'Failure Event Test Failed!';
    textFailedEventTest.color = 0xff0000ff;
  }
}

interface BoxedTextProps {
  x: number;
  y: number;
  boxColor1: number;
  boxColor2: number;
  textColor: number;
  fontFamily: string;
  parent: INode | null;
}

class BoxedText extends EventEmitter implements BoxedTextProps {
  readonly node: INode;
  readonly textNode: ITextNode;
  constructor(
    private props: Partial<BoxedTextProps>,
    private renderer: RendererMain,
  ) {
    super();
    this.node = renderer.createNode({
      x: props.x,
      y: props.y,
      colorTop: props.boxColor1,
      colorBottom: props.boxColor2,
      shader: renderer.createShader('RoundedRectangle', {
        radius: 10,
      }),
      parent: props.parent,
    });

    this.textNode = renderer.createTextNode({
      x: 0,
      y: 0,
      fontSize: FONT_SIZE,
      offsetY: -5,
      alpha: 0,
      color: props.textColor,
      fontFamily: props.fontFamily,
      parent: this.node,
    });

    this.textNode.on('textLoaded', this.onTextLoaded);
  }

  private onTextLoaded: TextLoadedEventHandler = (target, dimensions) => {
    this.layout(dimensions);
  };

  private layout(textDimensions: Dimensions) {
    this.node.width = textDimensions.width + BUTTON_PADDING * 2;
    this.node.height = textDimensions.height + BUTTON_PADDING * 2;
    this.textNode.x = this.node.width / 2 - textDimensions.width / 2;
    this.textNode.y = this.node.height / 2 - textDimensions.height / 2;
    this.textNode.alpha = 1;
    this.emit('afterLayout');
  }

  get text(): string {
    return this.textNode.text;
  }

  set text(v: string) {
    this.textNode.text = v;
  }

  get x(): number {
    return this.node.x;
  }

  set x(v: number) {
    this.node.x = v;
  }

  get y(): number {
    return this.node.y;
  }

  set y(v: number) {
    this.node.y = v;
  }

  get boxColor1(): number {
    return this.node.colorTop;
  }

  set boxColor1(v: number) {
    this.node.colorTop = v;
  }

  get boxColor2(): number {
    return this.node.colorBottom;
  }

  set boxColor2(v: number) {
    this.node.colorBottom = v;
  }

  get textColor() {
    return this.textNode.color;
  }

  set textColor(v: number) {
    this.textNode.color = v;
  }

  get fontFamily() {
    return this.textNode.fontFamily;
  }

  set fontFamily(v: string) {
    this.textNode.fontFamily = v;
  }

  get parent() {
    return this.node.parent;
  }

  set parent(v: INode | null) {
    this.node.parent = v;
  }
}

function waitForTextFailed(textNode: ITextNode) {
  return new Promise<Error>((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('TIMEOUT'));
    }, 1000);
    textNode.once('textFailed', (target, error: Error) => {
      resolve(error);
    });
  });
}
