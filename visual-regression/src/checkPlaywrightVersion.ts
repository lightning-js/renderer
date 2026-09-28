#!/usr/bin/env node
/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2025 Comcast Cable Communications Management, LLC.
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

import chalk from 'chalk';
import {
  checkPlaywrightVersions,
  describeMismatch,
  setDockerfilePlaywrightVersion,
} from './playwrightVersion.js';

/**
 * Verifies, and with `--write` repairs, the Playwright version alignment
 * between pnpm-lock.yaml and the Dockerfile base image.
 *
 * Run without arguments in CI so a dependabot bump that leaves the Dockerfile
 * behind fails the build instead of silently breaking local snapshot capture.
 */
const write = process.argv.includes('--write');

try {
  const check = checkPlaywrightVersions();

  if (check.aligned === true) {
    console.log(
      chalk.green(
        `Playwright versions aligned (${check.lockfile}): lockfile and Dockerfile agree.`,
      ),
    );
    process.exit(0);
  }

  if (write === false) {
    console.error(chalk.red.bold(describeMismatch(check)));
    process.exit(1);
  }

  const changed = setDockerfilePlaywrightVersion(check.lockfile);
  if (changed === false) {
    // Should be unreachable: the versions differ, so the rewrite must apply.
    console.error(
      chalk.red.bold(
        `Failed to update the Dockerfile base image to ${check.lockfile}.`,
      ),
    );
    process.exit(1);
  }

  console.log(
    chalk.green(
      `Updated Dockerfile base image: ${check.dockerfile} -> ${check.lockfile}.`,
    ),
  );
  console.log(
    chalk.yellow(`Rebuild the image with 'pnpm build:docker' to pick this up.`),
  );
} catch (error) {
  console.error(
    chalk.red.bold(error instanceof Error ? error.message : String(error)),
  );
  process.exit(1);
}
