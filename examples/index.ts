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
  MainRenderDriver,
  RendererMain,
  ThreadXRenderDriver,
  type IRenderDriver,
  type Dimensions,
  type RendererMainSettings,
} from '@lightningjs/renderer';
import { assertTruthy } from '@lightningjs/renderer/utils';
import coreWorkerUrl from './common/CoreWorker.js?importChunkUrl';
import coreExtensionModuleUrl from './common/AppCoreExtension.js?importChunkUrl';
import type { ExampleSettings } from './common/ExampleSettings.js';

(async () => {
  // URL params
  // - driver: main | threadx (default: threadx)
  // - test: <test name> (default: test)
  // - showOverlay: true | false (default: true)
  // - finalizationRegistry: true | false (default: false)
  //   - Use FinalizationRegistryTextureUsageTracker instead of
  //     ManualCountTextureUsageTracker
  const urlParams = new URLSearchParams(window.location.search);
  let driverName = urlParams.get('driver');
  const test = urlParams.get('test') || 'test';
  const showOverlay = urlParams.get('overlay') !== 'false';
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const module = await import(`./tests/${test}.ts`);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const customSettings: Partial<RendererMainSettings> =
    typeof module.customSettings === 'function'
      ? module.customSettings(urlParams)
      : {};

  if (driverName !== 'main' && driverName !== 'threadx') {
    driverName = 'main';
  }

  let driver: IRenderDriver | null = null;

  if (driverName === 'main') {
    driver = new MainRenderDriver();
  } else {
    driver = new ThreadXRenderDriver({
      coreWorkerUrl,
    });
  }

  const renderer = new RendererMain(
    {
      appWidth: 1920,
      appHeight: 1080,
      deviceLogicalPixelRatio: 0.6666667,
      devicePhysicalPixelRatio: 1,
      clearColor: 0x00000000,
      coreExtensionModule: coreExtensionModuleUrl,
      ...customSettings,
    },
    'app',
    driver,
  );

  await renderer.init();

  const canvas = document.querySelector('#app>canvas');

  assertTruthy(canvas instanceof HTMLCanvasElement);

  if (showOverlay) {
    const overlayText = renderer.createTextNode({
      color: 0xff0000ff,
      text: `Test: ${test} | Driver: ${driverName}`,
      zIndex: 99999,
      parent: renderer.root,
      fontSize: 50,
    });
    overlayText.once(
      'textLoaded',
      (target: any, { width, height }: Dimensions) => {
        overlayText.x = renderer.settings.appWidth - width - 20;
        overlayText.y = renderer.settings.appHeight - height - 20;
      },
    );
  }

  const exampleSettings: ExampleSettings = {
    testName: test,
    renderer,
    driverName: driverName as 'main' | 'threadx',
    canvas,
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  await module.default(exampleSettings);
  console.log('ready!');
})().catch((err) => {
  console.error(err);
});
