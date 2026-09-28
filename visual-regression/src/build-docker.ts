#!/usr/bin/env ts-node

import { $ } from 'execa';
import { argv } from 'process';
import path from 'path';
import { fileURLToPath } from 'url';

import { detectContainerRuntime } from './detectDockerRuntime.js';
import {
  checkPlaywrightVersions,
  describeMismatch,
} from './playwrightVersion.js';

/**
 * Builds a container image using the detected container runtime.
 * Changes the working directory to one level higher than the script's location.
 * @param runtime - The container runtime (`podman` or `docker`).
 * @param imageName - The name of the container image to build.
 */
async function buildContainer(
  runtime: string,
  imageName: string,
): Promise<void> {
  // Change working directory to one level higher than the script's location
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const scriptDir = path.resolve(__dirname, '../../../');
  process.chdir(scriptDir);

  console.log(`Working directory changed to: ${scriptDir}`);
  console.log(`Using ${runtime} to build the container image: ${imageName}`);
  try {
    await $({ stdio: 'inherit' })`${runtime} build -t ${imageName} .`;
  } catch (error) {
    console.error(`Failed to build the image with ${runtime}.`, error);
    process.exit(1);
  }
}

(async () => {
  const imageName = argv[2] || 'visual-regression'; // Default image name
  try {
    // Refuse to build an image whose browser binaries cannot match the client
    // the container will install. Building it anyway produces an image that
    // fails at launch time with a message about the executable not existing,
    // which is a long way from the actual cause.
    const versions = checkPlaywrightVersions();
    if (versions.aligned === false) {
      console.error(describeMismatch(versions));
      process.exit(1);
    }
    console.log(`Playwright version: ${versions.lockfile}`);

    const runtime = await detectContainerRuntime();
    await buildContainer(runtime, imageName);
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
})();
