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
  RendererMain,
  type NodeLoadedPayload,
  type RendererMainSettings,
  type FpsUpdatePayload,
} from '@lightningjs/renderer';
import { assertTruthy } from '@lightningjs/renderer/utils';
import type {
  ExampleSettings,
  SnapshotOptions,
} from './common/ExampleSettings.js';
import { StatTracker } from './common/StatTracker.js';
import { installFonts } from './common/installFonts.js';

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
  // See README.md for details on the supported URL params
  const urlParams = new URLSearchParams(window.location.search);
  const automation = urlParams.get('automation') === 'true';
  /**
   * In automation mode this is a wildcard string of tests to run.
   * In manual mode this is the name of the test to run.
   */
  const test = urlParams.get('test') || (automation ? '*' : 'test');
  const showOverlay = urlParams.get('overlay') !== 'false';
  const logFps = urlParams.get('fps') === 'true';
  const enableContextSpy = urlParams.get('contextSpy') === 'true';
  const perfMultiplier = Number(urlParams.get('multiplier')) || 1;
  const resolution = Number(urlParams.get('resolution')) || 720;
  const enableInspector = urlParams.get('inspector') === 'true';
  const physicalPixelRatio =
    Number(urlParams.get('ppr')) || defaultPhysicalPixelRatio;
  const logicalPixelRatio = resolution / appHeight;

  let driverName = urlParams.get('driver');
  if (driverName !== 'main' && driverName !== 'threadx') {
    driverName = 'main';
  }

  let renderMode = urlParams.get('renderMode');
  if (
    driverName === 'threadx' ||
    (renderMode !== 'webgl' && renderMode !== 'canvas')
  ) {
    renderMode = 'webgl';
  }

  if (!automation) {
    await runTest(
      test,
      driverName,
      renderMode,
      urlParams,
      showOverlay,
      logicalPixelRatio,
      physicalPixelRatio,
      logFps,
      enableContextSpy,
      perfMultiplier,
      enableInspector,
    );
    return;
  }
  assertTruthy(automation);
  await runAutomation(driverName, renderMode, test, logFps);
})().catch((err) => {
  console.error(err);
});

async function runTest(
  test: string,
  driverName: string,
  renderMode: string,
  urlParams: URLSearchParams,
  showOverlay: boolean,
  logicalPixelRatio: number,
  physicalPixelRatio: number,
  logFps: boolean,
  enableContextSpy: boolean,
  perfMultiplier: number,
  enableInspector: boolean,
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
    renderMode,
    logFps,
    enableContextSpy,
    logicalPixelRatio,
    physicalPixelRatio,
    enableInspector,
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
    testRoot: renderer.root,
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
  renderMode: string,
  logFps: boolean,
  enableContextSpy: boolean,
  logicalPixelRatio: number,
  physicalPixelRatio: number,
  enableInspector: boolean,
  customSettings?: Partial<RendererMainSettings>,
) {
  const renderer = new RendererMain(
    {
      appWidth,
      appHeight,
      boundsMargin: [100, 100, 100, 100],
      deviceLogicalPixelRatio: logicalPixelRatio,
      devicePhysicalPixelRatio: physicalPixelRatio,
      clearColor: 0x00000000,
      fpsUpdateInterval: logFps ? 1000 : 0,
      enableContextSpy,
      enableInspector,
      renderMode: renderMode as 'webgl' | 'canvas',
      ...customSettings,
    },
    'app',
  );
  installFonts(renderer.stage);

  /**
   * Sample data captured
   */
  const samples: StatTracker = new StatTracker();
  /**
   * Number of samples to capture before calculating FPS stats
   */
  const fpsSampleCount = 100;
  /**
   * Number of samples to skip before starting to capture FPS samples.
   */
  const fpsSampleSkipCount = 10;
  /**
   * FPS sample index
   */
  let fpsSampleIndex = 0;
  let fpsSamplesLeft = fpsSampleCount;
  renderer.on(
    'fpsUpdate',
    (target: RendererMain, fpsData: FpsUpdatePayload) => {
      const captureSample = fpsSampleIndex >= fpsSampleSkipCount;
      if (captureSample) {
        samples.add('fps', fpsData.fps);

        if (fpsData.contextSpyData) {
          let totalCalls = 0;
          for (const key in fpsData.contextSpyData) {
            const numCalls = fpsData.contextSpyData[key]!;
            totalCalls += numCalls;
            samples.add(key, numCalls);
          }
          samples.add('totalCalls', totalCalls);
        }

        fpsSamplesLeft--;
        if (fpsSamplesLeft === 0) {
          const averageFps = samples.getAverage('fps');
          const p01Fps = samples.getPercentile('fps', 1);
          const p05Fps = samples.getPercentile('fps', 5);
          const p25Fps = samples.getPercentile('fps', 25);
          const medianFps = samples.getPercentile('fps', 50);
          const stdDevFps = samples.getStdDev('fps');
          console.log(`---------------------------------`);
          console.log(`Average FPS: ${averageFps}`);
          console.log(`Median FPS: ${medianFps}`);
          console.log(`P01 FPS: ${p01Fps}`);
          console.log(`P05 FPS: ${p05Fps}`);
          console.log(`P25 FPS: ${p25Fps}`);
          console.log(`Std Dev FPS: ${stdDevFps}`);
          console.log(`Num samples: ${samples.getCount('fps')}`);
          console.log(`---------------------------------`);

          // Print out median data for all context spy data
          if (fpsData.contextSpyData) {
            const contextKeys = samples
              .getSampleGroups()
              .filter((key) => key !== 'fps' && key !== 'totalCalls');
            // Print out median data for all context spy data
            for (const key of contextKeys) {
              const median = samples.getPercentile(key, 50);
              console.log(
                `median(${key}) / median(fps): ${Math.round(
                  median / medianFps,
                )}`,
              );
            }
            const medianTotalCalls = samples.getPercentile('totalCalls', 50);
            console.log(
              `median(totalCalls) / median(fps): ${Math.round(
                medianTotalCalls / medianFps,
              )}`,
            );
            console.log(`---------------------------------`);
          }
          samples.reset();
          fpsSamplesLeft = fpsSampleCount;
        }
      }
      console.log(`FPS: ${fpsData.fps} (samples left: ${fpsSamplesLeft})`);
      fpsSampleIndex++;
    },
  );

  const appElement = document.querySelector('#app');

  assertTruthy(appElement instanceof HTMLDivElement);

  return { renderer, appElement };
}

function wildcardMatch(string: string, wildcardString: string) {
  const escapeRegex = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  return new RegExp(
    `^${wildcardString.split('*').map(escapeRegex).join('.*')}$`,
  ).test(string);
}

async function runAutomation(
  driverName: string,
  renderMode: string,
  filter: string | null,
  logFps: boolean,
) {
  const logicalPixelRatio = defaultResolution / appHeight;
  const { renderer, appElement } = await initRenderer(
    driverName,
    renderMode,
    logFps,
    false,
    logicalPixelRatio,
    defaultPhysicalPixelRatio,
    false, // enableInspector
  );

  // Iterate through all test modules
  for (const testPath in testModules) {
    const testModule = testModules[testPath];
    const testName = getTestName(testPath);
    // Skip tests that don't match the filter (if provided)
    if (filter && !wildcardMatch(testName, filter)) {
      continue;
    }
    assertTruthy(testModule);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { automation, customSettings } = await testModule();
    console.log(`Attempting to run automation for ${testName}...`);
    if (automation) {
      console.log(`Running automation for ${testName}...`);
      if (customSettings) {
        console.error('customSettings not supported for automation');
      } else {
        assertTruthy(renderer.root);
        const testRoot = renderer.createNode({
          parent: renderer.root,
          x: renderer.root.x,
          y: renderer.root.y,
          width: renderer.root.width,
          height: renderer.root.height,
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
          snapshot: async (options) => {
            const snapshot = (window as any).snapshot as
              | ((testName: string, options?: SnapshotOptions) => Promise<void>)
              | undefined;

            const clipRect = options?.clip || {
              x: testRoot.x,
              y: testRoot.y,
              width: testRoot.width,
              height: testRoot.height,
            };

            const adjustedOptions = {
              ...options,
              clip: {
                x: Math.round(clipRect.x * logicalPixelRatio),
                y: Math.round(clipRect.y * logicalPixelRatio),
                width: Math.round(clipRect.width * logicalPixelRatio),
                height: Math.round(clipRect.height * logicalPixelRatio),
              },
            };

            // Allow some time for all images to load and the RaF to unpause
            // and render if needed.
            await delay(200);
            if (snapshot) {
              console.log(`Calling snapshot(${testName})`);
              await snapshot(testName, adjustedOptions);
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
