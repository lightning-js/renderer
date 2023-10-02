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
  CoreExtension,
  WebTrFontFace,
  type Stage,
  SdfTrFontFace,
} from '@lightningjs/renderer/core';

export default class AppCoreExtension extends CoreExtension {
  override async run(stage: Stage) {
    stage.fontManager.addFontFace(
      new WebTrFontFace('NotoSans', {}, '/fonts/NotoSans-Regular.ttf'),
    );

    stage.fontManager.addFontFace(
      new WebTrFontFace('Ubuntu', {}, '/fonts/Ubuntu-Regular.ttf'),
    );

    stage.fontManager.addFontFace(
      new SdfTrFontFace(
        'Ubuntu',
        {},
        'msdf',
        stage,
        '/fonts/Ubuntu-Regular.msdf.png',
        '/fonts/Ubuntu-Regular.msdf.json',
      ),
    );

    stage.fontManager.addFontFace(
      new SdfTrFontFace(
        'Ubuntu-ssdf',
        {},
        'ssdf',
        stage,
        '/fonts/Ubuntu-Regular.ssdf.png',
        '/fonts/Ubuntu-Regular.ssdf.json',
      ),
    );
  }
}
