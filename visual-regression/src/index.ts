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
import upng from 'upng-js';
import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { execa, $ } from 'execa';

const snapshotDir = 'certified-snapshots';
const failedResultsDir = 'failed-results';

const browsers = { chromium };
let snapshotsTested = 0;
let snapshotsPassed = 0;
let snapshotsFailed = 0;
let snapshotsSkipped = 0;

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
  })
  .parseSync();

(async () => {
  const stdioOption = argv.verbose ? 'inherit' : 'ignore';

  if (!argv.skipBuild) {
    // 1. Build Renderer
    console.log(chalk.magentaBright.bold(`Building Renderer...`));
    const rendererBuildRes = await execa('pnpm', ['build-renderer'], {
      stdio: stdioOption,
    });
    if (rendererBuildRes.exitCode !== 0) {
      console.error(chalk.red.bold('Build failed!'));
      process.exit(1);
    }
    console.log(chalk.magentaBright.bold(`Building Examples...`));
    const exampleBuildRes = await execa('pnpm', ['build-examples'], {
      stdio: stdioOption,
    });
    if (exampleBuildRes.exitCode !== 0) {
      console.error(chalk.red.bold('Build failed!'));
      process.exit(1);
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

  try {
    const waitPortRes = await $({
      stdio: stdioOption,
      timeout: 10000,
    })`wait-port ${argv.port}`;

    if (waitPortRes.exitCode !== 0) {
      console.error(chalk.red.bold('Failed to start server!'));
      process.exit(1);
    }

    // Run the tests
    process.exitCode = await runTest('chromium');
  } finally {
    // Kill the serve-examples process
    serveExamplesChildProc.kill();
  }
})().catch((err) => console.error(err));

async function runTest(browserType: 'chromium') {
  console.log(
    chalk.magentaBright.bold(
      `${
        argv.capture ? 'Capturing' : 'Running'
      } Visual Regression Tests (browser: ${chalk.white.bold(browserType)})...`,
    ),
  );
  const browser = await browsers[browserType].launch(); // Or 'firefox' or 'webkit'.
  const page = await browser.newPage();
  await page.goto(`http://localhost:${argv.port}/?automation=true`);

  const testCounters: Record<string, number> = {};

  if (!argv.capture) {
    await fs.ensureDir(failedResultsDir);
    // Remove all files in the failedResultPath directory
    await fs.emptyDir(failedResultsDir);
  }

  await page.exposeFunction('snapshot', async (test: string) => {
    snapshotsTested++;
    const snapshotIndex = (testCounters[test] = (testCounters[test] || 0) + 1);
    const makeFilename = (postfix?: string) =>
      `${test}-${snapshotIndex}${postfix ? `-${postfix}` : ''}.png`;
    const snapshotPath = path.join(snapshotDir, browserType, makeFilename());
    if (argv.capture) {
      process.stdout.write(
        chalk.gray(
          `Saving snapshot for ${chalk.white(`${test}-${snapshotIndex}`)}... `,
        ),
      );
      // If file exists and overwrite is false, skip
      if (fs.existsSync(snapshotPath) && !argv.overwrite) {
        process.stdout.write(chalk.yellow.bold('SKIPPED! (already exists)\n'));
        snapshotsSkipped++;
        return;
      } else {
        await page.screenshot({ path: snapshotPath });
        process.stdout.write(chalk.green.bold('DONE!\n'));
        snapshotsPassed++;
        return;
      }
    } else {
      process.stdout.write(
        chalk.gray(`Running ${chalk.white(`${test}-${snapshotIndex}`)}... `),
      );
      const actualPng = await page.screenshot();
      const actualImage = upng.decode(actualPng);
      const expectedPng = await fs.readFile(snapshotPath, null);
      const expectedImage = upng.decode(expectedPng);
      const result = compareBuffers(actualImage, expectedImage);
      if (result.doesMatch) {
        snapshotsPassed++;
        console.log(chalk.green.bold('PASS!'));
      } else {
        snapshotsFailed++;
        console.log(chalk.red.bold('FAILED!'));
        try {
          // Ensure the failedResult directory exists
          await Promise.all([
            fs.writeFile(
              path.join(
                './',
                failedResultsDir,
                `${browserType}-${makeFilename('diff')}`,
              ),
              result.resultImageBuffer,
            ),
            fs.writeFile(
              path.join(
                './',
                failedResultsDir,
                `${browserType}-${makeFilename('actual')}`,
              ),
              actualPng,
            ),
            fs.writeFile(
              path.join(
                './',
                failedResultsDir,
                `${browserType}-${makeFilename('expected')}`,
              ),
              expectedPng,
            ),
          ]);
        } catch (e: unknown) {
          process.stderr.write(chalk.red.bold('Failed to write result:\n'));
          console.error(e);
        }
      }
    }
  });

  let resolveDonePromise: (exitCode: number) => void;
  const donePromise = new Promise<number>((resolve, reject) => {
    resolveDonePromise = resolve;
  });

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

  return donePromise;
}

function compareBuffers(
  actualImage: upng.Image,
  expectedImage: upng.Image,
): { doesMatch: boolean; resultImageBuffer: Buffer } {
  const actualData = new Uint8ClampedArray(actualImage.data);
  const expectedData = new Uint8ClampedArray(expectedImage.data);
  const resultData = new Uint8ClampedArray(expectedData.byteLength);

  // Get the N-dimensional euclidean distance between the two images regardless of channel not using colorDistance
  const maxDistance = Math.sqrt(actualData.length * 255 * 255);

  const distance = Math.sqrt(
    actualData.reduce((acc, cur, i) => {
      if (i % 4 === 3) {
        resultData[i] = 255;
      } else {
        resultData[i] = Math.abs(cur - expectedData[i]!);
      }
      if (resultData[i]! >= 5) {
        resultData[i] = 255;
      }
      return acc + Math.pow(cur - expectedData[i]!, 2);
    }, 0),
  );

  const normalizedDistance = distance / maxDistance;

  const resultImage = upng.encode(
    [resultData.buffer],
    expectedImage.width,
    expectedImage.height,
    0,
  );

  return {
    doesMatch: normalizedDistance < 0.0005,
    resultImageBuffer: Buffer.from(resultImage),
  };
}
