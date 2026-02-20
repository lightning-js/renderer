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
import { WebGlRenderer, SdfTextRenderer } from '@lightningjs/renderer/webgl';
import {
  CanvasRenderer,
  CanvasTextRenderer,
} from '@lightningjs/renderer/canvas';

import {
  WebPlatform,
  WebPlatformLegacy,
} from '@lightningjs/renderer/platforms';
import { Inspector } from '@lightningjs/renderer/inspector';
import { assertTruthy } from '@lightningjs/renderer/utils';

import type {
  ExampleSettings,
  SnapshotOptions,
} from './common/ExampleSettings.js';
import { StatTracker } from './common/StatTracker.js';
import { installFonts } from './common/installFonts.js';
import { MemMonitor } from './common/MemMonitor.js';
import { setupMathRandom } from './common/setupMathRandom.js';
import { installShaders } from './common/installShaders.js';

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

const platformMap = {
  web: WebPlatform,
  legacy: WebPlatformLegacy,
};

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
  const showMemMonitor = urlParams.get('monitor') === 'true';
  const logFps = urlParams.get('fps') === 'true';
  const enableContextSpy = urlParams.get('contextSpy') === 'true';
  const perfMultiplier = Number(urlParams.get('multiplier')) || 1;
  const resolution = Number(urlParams.get('resolution')) || 720;
  const enableInspector = urlParams.get('inspector') === 'true';
  const forceWebGL2 = urlParams.get('webgl2') === 'true';
  const textureProcessingLimit =
    Number(urlParams.get('textureProcessingLimit')) || 0;
  const globalTargetFPS = Number(urlParams.get('targetFPS')) || undefined;
  const platform = urlParams.get('platform') || 'web';

  const physicalPixelRatio =
    Number(urlParams.get('ppr')) || defaultPhysicalPixelRatio;
  const logicalPixelRatio = resolution / appHeight;

  let renderMode = urlParams.get('renderMode');
  if (renderMode !== 'webgl' && renderMode !== 'canvas') {
    renderMode = 'webgl';
  }

  if (!automation) {
    await runTest(
      test,
      renderMode,
      platform,
      urlParams,
      showOverlay,
      showMemMonitor,
      logicalPixelRatio,
      physicalPixelRatio,
      logFps,
      enableContextSpy,
      perfMultiplier,
      enableInspector,
      forceWebGL2,
      textureProcessingLimit,
      globalTargetFPS,
    );
    return;
  }
  assertTruthy(automation);
  await runAutomation(renderMode, platform, test, logFps);
})().catch((err) => {
  console.error(err);
});

async function runTest(
  test: string,
  renderMode: string,
  platform: string,
  urlParams: URLSearchParams,
  showOverlay: boolean,
  showMemMonitor: boolean,
  logicalPixelRatio: number,
  physicalPixelRatio: number,
  logFps: boolean,
  enableContextSpy: boolean,
  perfMultiplier: number,
  enableInspector: boolean,
  forceWebGL2: boolean,
  textureProcessingLimit: number,
  globalTargetFPS?: number,
) {
  const testModule = testModules[getTestPath(test)];
  if (!testModule) {
    throw new Error(`Test "${test}" not found`);
  }

  const module = await testModule();

  const customSettings: Partial<RendererMainSettings> = {
    ...(typeof module.customSettings === 'function'
      ? module.customSettings(urlParams)
      : {}),
    ...(globalTargetFPS !== undefined && { targetFPS: globalTargetFPS }),
  };

  const { renderer, appElement } = await initRenderer(
    renderMode,
    platform,
    logFps,
    enableContextSpy,
    logicalPixelRatio,
    physicalPixelRatio,
    enableInspector,
    forceWebGL2,
    textureProcessingLimit,
    customSettings,
  );

  let testRoot = renderer.root;

  if (showOverlay) {
    const overlayText = renderer.createTextNode({
      color: 0xff0000ff,
      text: `Test: ${test}`,
      zIndex: 99999,
      parent: renderer.root,
      fontSize: 50,
    });
    overlayText.on(
      'loaded',
      (target: any, { type, dimensions }: NodeLoadedPayload) => {
        if (type !== 'text') {
          return;
        }

        overlayText.x = renderer.settings.appWidth - dimensions.w - 20;
        overlayText.y = renderer.settings.appHeight - dimensions.h - 20;
      },
    );
  }

  let memMonitor: MemMonitor | null = null;
  if (showMemMonitor) {
    memMonitor = new MemMonitor(renderer, {
      mount: 1,
      x: renderer.settings.appWidth - 20,
      y: renderer.settings.appHeight - 100,
      parent: renderer.root,
      zIndex: 99999,
    });
  }

  if (showOverlay || showMemMonitor) {
    // If we're showing the overlay text or mem monitor, create a new root node
    // for the test content so it doesn't interfere with the overlay.
    testRoot = renderer.createNode({
      parent: renderer.root,
      x: renderer.root.x,
      y: renderer.root.y,
      w: renderer.settings.appWidth,
      h: renderer.settings.appHeight - 100,
      color: 0x00000000,
    });
  }

  const exampleSettings: ExampleSettings = {
    testName: test,
    renderer,
    appElement,
    testRoot,
    automation: false,
    perfMultiplier: perfMultiplier,
    snapshot: async () => {
      // No-op
    },
    memMonitor,
  };

  await module.default(exampleSettings);
}

async function initRenderer(
  renderMode: string,
  platform: string,
  logFps: boolean,
  enableContextSpy: boolean,
  logicalPixelRatio: number,
  physicalPixelRatio: number,
  enableInspector: boolean,
  forceWebGL2?: boolean,
  textureProcessingTimeLimit?: number,
  customSettings?: Partial<RendererMainSettings>,
) {
  let inspector: typeof Inspector | undefined;
  if (enableInspector) inspector = Inspector;
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
      forceWebGL2,
      inspector,
      platform: platformMap[platform] || WebPlatform,
      renderEngine: renderMode === 'webgl' ? WebGlRenderer : CanvasRenderer,
      fontEngines: [SdfTextRenderer, CanvasTextRenderer],
      textureProcessingTimeLimit: textureProcessingTimeLimit,
      ...customSettings,
    },
    'app',
  );
  await installShaders(renderer.stage, renderMode);
  await installFonts(renderer.stage);

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
  renderMode: string,
  platform: string,
  filter: string | null,
  logFps: boolean,
) {
  const logicalPixelRatio = defaultResolution / appHeight;
  const { renderer, appElement } = await initRenderer(
    renderMode,
    platform,
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

    // Setup Math.random to use a seeded random number generator for consistent
    // results in automation mode.
    await setupMathRandom();

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
          w: renderer.root.w,
          h: renderer.root.h,
          color: 0x00000000,
        });
        const exampleSettings: ExampleSettings = {
          testName,
          renderer,
          testRoot,
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
              w: testRoot.w,
              h: testRoot.h,
            };

            const adjustedOptions = {
              ...options,
              clip: {
                x: Math.round(clipRect.x * logicalPixelRatio),
                y: Math.round(clipRect.y * logicalPixelRatio),
                w: Math.round(clipRect.w * logicalPixelRatio),
                h: Math.round(clipRect.h * logicalPixelRatio),
              },
            };

            // Allow some time for all images to load and the RaF to unpause
            // and render if needed.
            await new Promise((resolve) => setTimeout(resolve, 200));
            if (snapshot) {
              console.log(`Calling snapshot(${testName})`);
              await snapshot(testName, adjustedOptions);
            } else {
              console.error(
                'snapshot() not defined (not running in playwright?)',
              );
            }
          },
          memMonitor: null,
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

function waitForRendererIdle(renderer: RendererMain) {
  return new Promise<void>((resolve) => {
    let timeout: NodeJS.Timeout | undefined;
    const startTimeout = () => {
      timeout = setTimeout(() => {
        resolve();
      }, 200);
    };

    renderer.once('idle', () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      startTimeout();
    });
  });
}
