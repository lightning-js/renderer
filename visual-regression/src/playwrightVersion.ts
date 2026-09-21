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

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Keeping the Playwright client and the container's browser binaries in step.
 *
 * @remarks
 * The visual regression container bakes in browser binaries from a versioned
 * Playwright base image. If the client that `pnpm install` puts in the
 * container does not match that image, Playwright refuses to launch:
 *
 * ```
 * browserType.launch: Executable doesn't exist at
 * /ms-playwright/chromium_headless_shell-.../chrome-headless-shell
 * ```
 *
 * Nothing forced the two to agree, and dependabot groups all minor and patch
 * npm updates into a single PR, so a Playwright bump lands without anyone
 * touching the Dockerfile. CI does not notice because it runs on a plain
 * runner and installs the browser itself; only the containerised path that
 * contributors need in order to capture snapshots matching CI breaks.
 *
 * The lockfile is the source of truth here, not `node_modules`: the container
 * runs its own `pnpm install`, so the resolved lockfile version is what will
 * actually be present at runtime. A stale local `node_modules` must not make
 * the check pass or fail differently from CI.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Repository root, located by walking up until the workspace marker is found.
 *
 * @remarks
 * A fixed number of `..` segments would be wrong somewhere: this module runs
 * from `dist/src/` when compiled and from `visual-regression/src/` under
 * vitest. Searching for the marker works from either.
 */
const findRepoRoot = (from: string): string => {
  let dir = from;

  for (;;) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(
        `Could not locate the repository root above ${from}: ` +
          `no pnpm-workspace.yaml found in any parent directory.`,
      );
    }
    dir = parent;
  }
};

export const repoRoot = findRepoRoot(__dirname);

export const dockerfilePath = path.join(repoRoot, 'Dockerfile');
export const lockfilePath = path.join(repoRoot, 'pnpm-lock.yaml');

/**
 * Matches the `FROM` line of the Playwright base image, capturing the version.
 *
 * Tolerates any distro suffix (`-jammy`, `-noble`, ...) so a distro change
 * does not silently stop the check from matching anything.
 *
 * Trailing whitespace is `[ \t]*`, not `\s*`: under the `m` flag `\s` matches
 * newlines, so `\s*$` would swallow the blank line after the FROM and the
 * rewrite would quietly reformat the file.
 */
const dockerfileFromRe =
  /^FROM\s+mcr\.microsoft\.com\/playwright:v([0-9]+\.[0-9]+\.[0-9]+)(-[a-z]+)?[ \t]*$/m;

/**
 * Matches the resolved `playwright` entry in a pnpm lockfile importer block:
 *
 * ```yaml
 *   playwright:
 *     specifier: ^1.62.1
 *     version: 1.63.0
 * ```
 *
 * Matching the specifier/version pair rather than a `packages:` key avoids
 * having to disambiguate `playwright` from `playwright-core`.
 */
const lockfileVersionRe =
  /^[ \t]+playwright:[ \t]*\r?\n[ \t]+specifier:[ \t]*\S+[ \t]*\r?\n[ \t]+version:[ \t]*([0-9]+\.[0-9]+\.[0-9]+)/m;

/**
 * Extract the resolved Playwright version from pnpm lockfile contents.
 *
 * @returns The version, or `null` if no resolved entry is present.
 */
export const parseLockfileVersion = (contents: string): string | null =>
  lockfileVersionRe.exec(contents)?.[1] ?? null;

/**
 * Extract the Playwright version from Dockerfile contents.
 *
 * @returns The version, or `null` if there is no Playwright base image.
 */
export const parseDockerfileVersion = (contents: string): string | null =>
  dockerfileFromRe.exec(contents)?.[1] ?? null;

/**
 * Rewrite the Playwright base image version in Dockerfile contents.
 *
 * @remarks
 * Only the version is replaced. The distro suffix and every other byte of the
 * file, comments and blank lines included, are left alone, so running this is
 * safe on a file a human has annotated.
 */
export const replaceDockerfileVersion = (
  contents: string,
  version: string,
): string =>
  contents.replace(
    dockerfileFromRe,
    (_full, _version: string, distro: string | undefined) =>
      `FROM mcr.microsoft.com/playwright:v${version}${distro ?? ''}`,
  );

/**
 * The Playwright version pnpm will install, read from the lockfile.
 *
 * @throws If no resolved `playwright` entry is present.
 */
export const getLockfilePlaywrightVersion = (): string => {
  const version = parseLockfileVersion(fs.readFileSync(lockfilePath, 'utf8'));

  if (version === null) {
    throw new Error(
      `Could not find a resolved 'playwright' version in ${lockfilePath}. ` +
        `If the lockfile format changed, update parseLockfileVersion().`,
    );
  }

  return version;
};

/**
 * The Playwright version pinned by the Dockerfile's base image.
 *
 * @throws If the `FROM` line is missing or not in the expected shape.
 */
export const getDockerfilePlaywrightVersion = (): string => {
  const version = parseDockerfileVersion(
    fs.readFileSync(dockerfilePath, 'utf8'),
  );

  if (version === null) {
    throw new Error(
      `Could not find a Playwright base image in ${dockerfilePath}. ` +
        `Expected a line like 'FROM mcr.microsoft.com/playwright:v1.2.3-jammy'.`,
    );
  }

  return version;
};

/**
 * Rewrite the Dockerfile's base image to the given version.
 *
 * @returns `true` if the file changed.
 */
export const setDockerfilePlaywrightVersion = (version: string): boolean => {
  const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');
  const updated = replaceDockerfileVersion(dockerfile, version);

  if (updated === dockerfile) {
    return false;
  }

  fs.writeFileSync(dockerfilePath, updated);
  return true;
};

export interface PlaywrightVersionCheck {
  aligned: boolean;
  lockfile: string;
  dockerfile: string;
}

/**
 * Compare the lockfile and Dockerfile Playwright versions.
 */
export const checkPlaywrightVersions = (): PlaywrightVersionCheck => {
  const lockfile = getLockfilePlaywrightVersion();
  const dockerfile = getDockerfilePlaywrightVersion();
  return { aligned: lockfile === dockerfile, lockfile, dockerfile };
};

/**
 * Human-readable explanation of a mismatch, including how to fix it.
 */
export const describeMismatch = (check: PlaywrightVersionCheck): string =>
  [
    `Playwright version mismatch between the lockfile and the Dockerfile.`,
    ``,
    `  pnpm-lock.yaml installs: ${check.lockfile}`,
    `  Dockerfile base image:   ${check.dockerfile}`,
    ``,
    `The container installs Playwright from the lockfile but gets its browser`,
    `binaries from the base image, so these must agree or Playwright will`,
    `refuse to launch inside the container.`,
    ``,
    `Fix it with:`,
    ``,
    `  cd visual-regression && pnpm sync:playwright`,
    ``,
    `then rebuild the image with 'pnpm build:docker'.`,
  ].join('\n');
