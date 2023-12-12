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
  MainCoreDriver,
  RendererMain,
  ThreadXCoreDriver,
  type ICoreDriver,
  type NodeLoadedPayload,
  type RendererMainSettings,
} from '@lightningjs/renderer';
import { assertTruthy } from '@lightningjs/renderer/utils';
import coreWorkerUrl from './common/CoreWorker.js?importChunkUrl';
import coreExtensionModuleUrl from './common/AppCoreExtension.js?importChunkUrl';
import type { ExampleSettings } from './common/ExampleSettings.js';

interface TestModule {
  default: (settings: ExampleSettings) => Promise<void>;
  customSettings?: (
    urlParams: URLSearchParams,
  ) => Partial<RendererMainSettings>;
  automation?: (settings: ExampleSettings) => Promise<void>;
}

const getTestPath = (testName: string) => `./tests/${testName}.ts`;
const testRegex = /\/tests\/(.*)\.ts$/;
const getTestName = (path: string) => {
  const match = path.match(testRegex);
  if (!match) {
    throw new Error(`Invalid test path: ${path}`);
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return match[1]!;
};

const testModules = import.meta.glob('./tests/*.ts') as Record<
  string,
  () => Promise<TestModule>
>;

const appWidth = 1920;
const appHeight = 1080;
const defaultResolution = 720;
const defaultPhysicalPixelRatio = 1;

(async () => {
  // URL params
  // - driver: main | threadx (default: threadx)
  // - test: <test name> (default: test)
  // - resolution: <number> (default: 720)
  //   - Resolution (height) of to render the test at (in logical pixels)
  // - ppr: <number> (default: 1)
  //   - Device physical pixel ratio
  // - showOverlay: true | false (default: true)
  // - fps: true | false (default: false)
  //   - Log FPS to console every second
  // - multiplier: <number> (default: 1)
  //   - In tests that support it, multiply the number of objects created by
  //     this number. Useful for performance tests.
  // - finalizationRegistry: true | false (default: false)
  //   - Use FinalizationRegistryTextureUsageTracker instead of
  //     ManualCountTextureUsageTracker
  // - automation: true | false (default: false)
  //   - Run all tests in automation mode
  const urlParams = new URLSearchParams(window.location.search);
  const automation = urlParams.get('automation') === 'true';
  const test = urlParams.get('test') || (automation ? null : 'test');
  const showOverlay = urlParams.get('overlay') !== 'false';
  const logFps = urlParams.get('fps') === 'true';
  const perfMultiplier = Number(urlParams.get('multiplier')) || 1;
  const resolution = Number(urlParams.get('resolution')) || 720;
  const physicalPixelRatio =
    Number(urlParams.get('ppr')) || defaultPhysicalPixelRatio;
  const logicalPixelRatio = resolution / appHeight;

  let driverName = urlParams.get('driver');
  if (driverName !== 'main' && driverName !== 'threadx') {
    driverName = 'main';
  }

  if (test) {
    await runTest(
      test,
      driverName,
      urlParams,
      showOverlay,
      logicalPixelRatio,
      physicalPixelRatio,
      logFps,
      perfMultiplier,
    );
    return;
  }
  assertTruthy(automation);
  await runAutomation(driverName, logFps);
})().catch((err) => {
  console.error(err);
});

async function runTest(
  test: string,
  driverName: string,
  urlParams: URLSearchParams,
  showOverlay: boolean,
  logicalPixelRatio: number,
  physicalPixelRatio: number,
  logFps: boolean,
  perfMultiplier: number,
) {
  const testModule = testModules[getTestPath(test)];
  if (!testModule) {
    throw new Error(`Test "${test}" not found`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  const module = await testModule();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const customSettings: Partial<RendererMainSettings> =
    typeof module.customSettings === 'function'
      ? module.customSettings(urlParams)
      : {};

  const { renderer, appElement } = await initRenderer(
    driverName,
    logFps,
    logicalPixelRatio,
    physicalPixelRatio,
    customSettings,
  );

  if (showOverlay) {
    const overlayText = renderer.createTextNode({
      color: 0xff0000ff,
      text: `Test: ${test} | Driver: ${driverName}`,
      zIndex: 99999,
      parent: renderer.root,
      fontSize: 50,
    });
    overlayText.once(
      'loaded',
      (target: any, { dimensions }: NodeLoadedPayload) => {
        overlayText.x = renderer.settings.appWidth - dimensions.width - 20;
        overlayText.y = renderer.settings.appHeight - dimensions.height - 20;
      },
    );
  }

  const exampleSettings: ExampleSettings = {
    testName: test,
    renderer,
    driverName: driverName as 'main' | 'threadx',
    appElement,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    testRoot: renderer.root!,
    automation: false,
    perfMultiplier: perfMultiplier,
    snapshot: async () => {
      // No-op
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  await module.default(exampleSettings);
}

async function initRenderer(
  driverName: string,
  logFps: boolean,
  logicalPixelRatio: number,
  physicalPixelRatio: number,
  customSettings?: Partial<RendererMainSettings>,
) {
  let driver: ICoreDriver | null = null;

  if (driverName === 'main') {
    driver = new MainCoreDriver();
  } else {
    driver = new ThreadXCoreDriver({
      coreWorkerUrl,
    });
  }

  const renderer = new RendererMain(
    {
      appWidth,
      appHeight,
      deviceLogicalPixelRatio: logicalPixelRatio,
      devicePhysicalPixelRatio: physicalPixelRatio,
      clearColor: 0x00000000,
      coreExtensionModule: coreExtensionModuleUrl,
      fpsUpdateInterval: logFps ? 1000 : 0,
      ...customSettings,
    },
    'app',
    driver,
  );

  renderer.on('fpsUpdate', (target: RendererMain, fps: number) => {
    console.log(`FPS: ${fps}`);
  });

  await renderer.init();

  const appElement = document.querySelector('#app');

  assertTruthy(appElement instanceof HTMLDivElement);

  return { renderer, appElement };
}

async function runAutomation(driverName: string, logFps: boolean) {
  const logicalPixelRatio = defaultResolution / appHeight;
  const { renderer, appElement } = await initRenderer(
    driverName,
    logFps,
    logicalPixelRatio,
    defaultPhysicalPixelRatio,
  );

  // Iterate through all test modules
  for (const testPath in testModules) {
    const testModule = testModules[testPath];
    const testName = getTestName(testPath);
    assertTruthy(testModule);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { automation, customSettings } = await testModule();
    console.log(`Attempting to run automation for ${testName}...`);
    if (automation) {
      console.log(`Running automation for ${testName}...`);
      if (customSettings) {
        console.error('customSettings not supported for automation');
      } else {
        const testRoot = renderer.createNode({
          parent: renderer.root,
          color: 0x00000000,
        });
        const exampleSettings: ExampleSettings = {
          testName,
          renderer,
          testRoot,
          driverName: driverName as 'main' | 'threadx',
          appElement,
          automation: true,
          perfMultiplier: 1,
          snapshot: async () => {
            const snapshot = (window as any).snapshot as
              | ((testName: string) => Promise<void>)
              | undefined;
            // Allow at least a frame to render for any existing RaF pause to
            // resume and finish rendering the scene before taking the snapshot
            await delay(17);
            if (snapshot) {
              console.log(`Calling snapshot(${testName})`);
              await snapshot(testName);
            } else {
              console.error(
                'snapshot() not defined (not running in playwright?)',
              );
            }
          },
        };
        await automation(exampleSettings);
        testRoot.parent = null;
        testRoot.destroy();
      }
    }
  }
  const doneTests = (window as any).doneTests as
    | (() => Promise<void>)
    | undefined;
  if (doneTests) {
    console.error('Calling doneTests()');
    await doneTests();
  } else {
    console.error('doneTests() not defined (not running in playwright?)');
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
