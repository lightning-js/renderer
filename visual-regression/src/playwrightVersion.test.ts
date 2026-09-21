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

import { describe, it, expect } from 'vitest';
import {
  parseDockerfileVersion,
  parseLockfileVersion,
  replaceDockerfileVersion,
  checkPlaywrightVersions,
} from './playwrightVersion.js';

const DOCKERFILE = `# Use Playwright's base image.
#
# Do not edit by hand.
FROM mcr.microsoft.com/playwright:v1.63.0-jammy

# Set the working directory
WORKDIR /work
`;

const LOCKFILE = `importers:

  visual-regression:
    devDependencies:
      '@types/pngjs':
        specifier: ^6.0.5
        version: 6.0.5
      playwright:
        specifier: ^1.62.1
        version: 1.63.0
      wait-port:
        specifier: ^1.1.0
        version: 1.1.0

packages:

  playwright-core@1.63.0:
    resolution: {integrity: sha512-fake}

  playwright@1.63.0:
    resolution: {integrity: sha512-fake}
`;

describe('playwrightVersion', () => {
  describe('parseDockerfileVersion', () => {
    it('reads the version from the Playwright base image', () => {
      expect(parseDockerfileVersion(DOCKERFILE)).toBe('1.63.0');
    });

    it('accepts any distro suffix', () => {
      expect(
        parseDockerfileVersion(
          'FROM mcr.microsoft.com/playwright:v1.63.0-noble\n',
        ),
      ).toBe('1.63.0');
    });

    it('accepts no distro suffix', () => {
      expect(
        parseDockerfileVersion('FROM mcr.microsoft.com/playwright:v1.63.0\n'),
      ).toBe('1.63.0');
    });

    it('returns null when there is no Playwright base image', () => {
      expect(parseDockerfileVersion('FROM node:24-alpine\n')).toBeNull();
    });
  });

  describe('parseLockfileVersion', () => {
    it('reads the resolved version, not the specifier range', () => {
      // The specifier is ^1.62.1 but pnpm resolved 1.63.0. The container
      // installs the resolved version, so that is what must match the image.
      expect(parseLockfileVersion(LOCKFILE)).toBe('1.63.0');
    });

    it('does not mistake playwright-core for playwright', () => {
      const coreOnly = LOCKFILE.replace(
        '      playwright:\n        specifier: ^1.62.1\n        version: 1.63.0\n',
        '',
      );
      expect(parseLockfileVersion(coreOnly)).toBeNull();
    });

    it('returns null when playwright is absent', () => {
      expect(parseLockfileVersion('importers:\n\n  .: {}\n')).toBeNull();
    });
  });

  describe('replaceDockerfileVersion', () => {
    it('updates the version', () => {
      expect(
        parseDockerfileVersion(replaceDockerfileVersion(DOCKERFILE, '1.64.0')),
      ).toBe('1.64.0');
    });

    it('preserves comments and blank lines', () => {
      // A naive /\s*$/m swallows the blank line after FROM, because \s matches
      // newlines under the m flag, quietly reformatting an annotated file.
      const out = replaceDockerfileVersion(DOCKERFILE, '1.64.0');
      expect(out).toBe(DOCKERFILE.replace('v1.63.0', 'v1.64.0'));
      expect(out.split('\n').length).toBe(DOCKERFILE.split('\n').length);
    });

    it('preserves the distro suffix', () => {
      expect(
        replaceDockerfileVersion(
          'FROM mcr.microsoft.com/playwright:v1.63.0-noble\n',
          '1.64.0',
        ),
      ).toBe('FROM mcr.microsoft.com/playwright:v1.64.0-noble\n');
    });

    it('round-trips to a byte-identical file', () => {
      const drifted = replaceDockerfileVersion(DOCKERFILE, '1.55.0');
      expect(replaceDockerfileVersion(drifted, '1.63.0')).toBe(DOCKERFILE);
    });

    it('is a no-op when there is nothing to replace', () => {
      const other = 'FROM node:24-alpine\n';
      expect(replaceDockerfileVersion(other, '1.64.0')).toBe(other);
    });
  });

  describe('drift detection', () => {
    it('reports a mismatch when the Dockerfile lags the lockfile', () => {
      const drifted = replaceDockerfileVersion(DOCKERFILE, '1.62.1');
      expect(parseLockfileVersion(LOCKFILE)).not.toBe(
        parseDockerfileVersion(drifted),
      );
    });

    it('the repository itself is aligned', () => {
      // Guards the real files, so a dependabot bump that leaves the Dockerfile
      // behind fails here as well as in the dedicated CI step.
      const check = checkPlaywrightVersions();
      expect(check.dockerfile).toBe(check.lockfile);
      expect(check.aligned).toBe(true);
    });
  });
});
