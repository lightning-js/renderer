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

/**
 * Visual Regression Test Runner
 *
 * @remarks
 * This script is used to run visual regression tests on the specific examples
 * in `examples/tests` that export an `automation()` function.
 *
 * See `README.md` and `pnpm start --help` (from this directory) for more info.
 *
 * @module
 */
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { execa, $ } from 'execa';
import { fileURLToPath } from 'url';
import {
  compareSnapshot,
  saveSnapshot,
  type SnapshotOptions,
} from './snapshot.js';

export const certifiedSnapshotDir = 'certified-snapshots';
export const failedResultsDir = 'failed-results';

import { detectContainerRuntime } from './detectDockerRuntime.js';

const browsers = { chromium };
let snapshotsTested = 0;
let snapshotsPassed = 0;
let snapshotsFailed = 0;
let snapshotsSkipped = 0;

/**
 * The runtime environment (local, ci, etc.)
 */
const runtimeEnv = (process.env.RUNTIME_ENV || 'local') as 'ci' | 'local';

// Guard against invalid runtime environment
if (!['ci', 'local'].includes(runtimeEnv)) {
  console.error(
    chalk.red.bold(
      `Invalid RUNTIME_ENV '${runtimeEnv}'. Must be 'ci' or 'local'`,
    ),
  );
  process.exit(1);
}

const argv = yargs(hideBin(process.argv))
  .options({
    capture: {
      type: 'boolean',
      alias: 'c',
      default: false,
      description: 'Capture new snapshots',
    },
    overwrite: {
      type: 'boolean',
      alias: 'o',
      default: false,
      description: 'Overwrite existing snapshots (--capture must also be set)',
    },
    verbose: {
      type: 'boolean',
      alias: 'v',
      default: false,
      description: 'Verbose output',
    },
    skipBuild: {
      type: 'boolean',
      alias: 's',
      default: false,
      description: 'Skip building renderer and examples',
    },
    port: {
      type: 'number',
      alias: 'p',
      default: 50535,
      description: 'Port to serve examples on',
    },
    ci: {
      type: 'boolean',
      alias: 'i',
      default: false,
      description: 'Run in docker container with `ci` runtime environment',
    },
    filter: {
      type: 'string',
      alias: 'f',
      default: '*',
      description: 'Tests to run ("*" wildcard pattern)',
    },
  })
  .parseSync();

/**
 * Main function that runs the tests in either docker ci mode or compare/capture mode
 */
(async () => {
  let exitCode = 1;
  try {
    if (argv.ci) {
      exitCode = await dockerCiMode();
    } else {
      exitCode = await compareCaptureMode();
    }
  } finally {
    process.exitCode = exitCode;
  }
})().catch((err) => console.error(err));

/**
 * Re-launches this script in a docker container with the `ci` runtime environment
 *
 * @returns Exit code
 */
async function dockerCiMode(): Promise<number> {
  // Detect container runtime
  const runtime = await detectContainerRuntime();

  // Relay the command line arguments to the docker container
  const commandLineStr = [
    argv.capture ? '--capture' : '',
    argv.overwrite ? '--overwrite' : '',
    argv.verbose ? '--verbose' : '',
    argv.skipBuild ? '--skipBuild' : '',
    argv.port ? `--port ${argv.port}` : '',
    argv.filter ? `--filter "${argv.filter}"` : '',
  ].join(' ');

  // Get the directory of the current file
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..', '..', '..');

  const childProc = $({ stdio: 'inherit' })`${runtime} run --network host \
    -v ${rootDir}:/work/ \
    -v /work/node_modules \
    -v /work/.pnpm-store \
    -v /work/examples/node_modules \
    -v /work/visual-regression/node_modules \
    -w /work/ -it visual-regression:latest \
    /bin/bash -c ${`pnpm install && RUNTIME_ENV=ci pnpm test:visual ${commandLineStr}`}
  `;
  await childProc;
  return childProc.exitCode ?? 1;
}

/**
 * The main function that builds the renderer and examples, serves the examples,
 * and runs the tests in capture or compare mode.
 *
 * @returns Exit code
 */
async function compareCaptureMode(): Promise<number> {
  const stdioOption = argv.verbose ? 'inherit' : 'ignore';

  if (!argv.skipBuild) {
    // 1. Build Renderer
    console.log(chalk.magentaBright.bold(`Building Renderer...`));
    const rendererBuildRes = await execa('pnpm', ['build:renderer'], {
      stdio: stdioOption,
    });
    if (rendererBuildRes.exitCode !== 0) {
      console.error(chalk.red.bold('Build failed!'));
      return 1;
    }
    console.log(chalk.magentaBright.bold(`Building Examples...`));
    const exampleBuildRes = await execa('pnpm', ['build:examples'], {
      stdio: stdioOption,
    });
    if (exampleBuildRes.exitCode !== 0) {
      console.error(chalk.red.bold('Build failed!'));
      return 1;
    }
  }
  console.log(
    chalk.magentaBright.bold(`Serving Examples (port: ${argv.port})...`),
  );

  // Serve the examples
  const serveExamplesChildProc = $({
    stdio: 'ignore',
    // Must run detached and kill after tests complete otherwise ghost process tree will hang
    detached: true,
    cleanup: false,
  })`pnpm serve-examples --port ${argv.port}`;

  let exitCode = 1;
  try {
    const waitPortRes = await $({
      stdio: stdioOption,
      timeout: 10000,
    })`wait-port ${argv.port}`;

    if (waitPortRes.exitCode !== 0) {
      console.error(chalk.red.bold('Failed to start server!'));
      return 1;
    }

    // Run the tests
    exitCode = await runTest('chromium');
  } finally {
    // Kill the serve-examples process
    serveExamplesChildProc.kill();
  }
  return exitCode;
}

/**
 * Run the tests in capture or compare mode depending on the `argv.capture` flag
 * for a specific browser type.
 */
async function runTest(browserType: 'chromium') {
  const paramString = Object.entries({
    browser: browserType,
    overwrite: argv.overwrite,
    filter: argv.filter,
    RUNTIME_ENV: runtimeEnv,
  }).reduce((acc, [key, value]) => {
    return `${acc ? `${acc}, ` : ''}${`${key}: ${chalk.white(value)}`}`;
  }, '');
  console.log(
    chalk.magentaBright.bold(
      `${
        argv.capture ? 'Capturing' : 'Running'
      } Visual Regression Tests (${paramString})...`,
    ),
  );

  const snapshotSubDirName = `${browserType}-${runtimeEnv}`;

  const snapshotSubDir = path.join(certifiedSnapshotDir, snapshotSubDirName);

  if (!argv.capture) {
    // If compare/run mode...
    // Make sure the snapshot directory exists. If not, error out.
    if (!fs.existsSync(snapshotSubDir)) {
      console.error(
        chalk.red.bold(
          `Snapshot directory '${snapshotSubDir}' does not exist! Did you forget to run in --capture mode first?`,
        ),
      );
      return 1;
    }

    // Ensure the failedResult directory exists
    await fs.ensureDir(failedResultsDir);
    // Remove all files in the failedResultPath directory
    await fs.emptyDir(failedResultsDir);
  }

  // Launch browser and create page
  const browser = await browsers[browserType].launch();

  const page = await browser.newPage();

  // If verbose, log out console messages from the browser
  if (argv.verbose) {
    page.on('console', (msg) => console.log(`console: ${msg.text()}`));
  }

  /**
   * Keeps track of the latest snapshot index for each test
   */
  const testCounters: Record<string, number> = {};

  // Expose the `snapshot()` function to the browser
  await page.exposeFunction(
    'snapshot',
    async (test: string, options: SnapshotOptions) => {
      snapshotsTested++;

      // Ensure clip dimensions are integers
      if (options.clip) {
        for (const key of ['x', 'y', 'w', 'h']) {
          // remap 'w' and 'h' to 'width' and 'height'
          if (key === 'w' || key === 'h') {
            options.clip[key === 'w' ? 'width' : 'height'] = Math.round(
              options.clip[key as keyof typeof options.clip],
            );
          } else {
            options.clip[key as keyof typeof options.clip] = Math.round(
              options.clip[key as keyof typeof options.clip],
            );
          }
        }
      }

      const subtestName = options.name ? `${test}_${options.name}` : test;
      const snapshotIndex = (testCounters[subtestName] =
        (testCounters[subtestName] || 0) + 1);
      const makeFilename = (postfix?: string) =>
        `${subtestName}-${snapshotIndex}${postfix ? `-${postfix}` : ''}.png`;
      const snapshotPath = path.join(snapshotSubDir, makeFilename());

      if (argv.capture) {
        // Handle snapshot capturing
        const captureResponse = await saveSnapshot(
          page,
          snapshotPath,
          options,
          subtestName,
          snapshotIndex,
          argv.overwrite,
        );
        if (captureResponse === false) {
          snapshotsSkipped++;
          return;
        }

        if (argv.overwrite) {
          snapshotsPassed++;
          return;
        }
      }

      // Handle snapshot comparison
      const resp = await compareSnapshot(
        page,
        snapshotPath,
        options,
        subtestName,
        snapshotIndex,
      );
      if (resp) {
        snapshotsPassed++;
      } else {
        snapshotsFailed++;
      }
    },
  );

  /**
   * Resolve function for the donePromise below
   */
  let resolveDonePromise: (exitCode: number) => void;
  /**
   * Promise that resolves when all tests are done
   */
  const donePromise = new Promise<number>((resolve) => {
    resolveDonePromise = resolve;
  });

  // Expose the `doneTests()` function to the browser
  // which will close the browser, calculate/print results and resolve the donePromise
  await page.exposeFunction('doneTests', async () => {
    await browser.close();

    // Summarize results

    const passPerc: string = (
      (snapshotsPassed / snapshotsTested) *
      100
    ).toFixed(1);
    const failPerc: string = (
      (snapshotsFailed / snapshotsTested) *
      100
    ).toFixed(1);
    const skipPerc: string = (
      (snapshotsSkipped / snapshotsTested) *
      100
    ).toFixed(1);

    if (argv.capture) {
      console.log(
        chalk.white.underline(`\nVisual Regression Test Capture Completed:`),
      );

      if (snapshotsPassed > 0) {
        console.log(
          chalk.green(
            `   ${snapshotsPassed} snapshots captured (${passPerc}%)`,
          ),
        );
      }

      if (snapshotsSkipped > 0) {
        console.log(
          chalk.yellow(
            `   ${snapshotsSkipped} snapshots skipped (${skipPerc}%)`,
          ),
        );
      }

      console.log(chalk.gray(`   ${snapshotsTested} snapshots detected`));
    } else {
      console.log(
        chalk.white.underline(`\nVisual Regression Tests Completed:`),
      );

      if (snapshotsFailed > 0) {
        console.log(
          chalk.red(`   ${snapshotsFailed} snapshots failed (${failPerc}%)`),
        );
        console.log(
          chalk.gray(
            `      (See \`${failedResultsDir}\` directory for failed results)`,
          ),
        );
      }

      if (snapshotsPassed > 0) {
        console.log(
          chalk.green(`   ${snapshotsPassed} snapshots passed (${passPerc}%)`),
        );
      }

      console.log(chalk.gray(`   ${snapshotsTested} snapshots tested`));
    }

    // Extra new line
    console.log(chalk.reset(''));

    if (snapshotsFailed > 0) {
      resolveDonePromise(1);
    } else {
      resolveDonePromise(0);
    }
  });

  // Go to the examples page
  await page.goto(
    `http://localhost:${argv.port}/?automation=true&test=${argv.filter}`,
  );

  return donePromise;
}
