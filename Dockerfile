# Use Playwright's base image.
#
# The version here supplies the browser binaries, while the container installs
# the Playwright client from pnpm-lock.yaml. The two must match or Playwright
# refuses to launch ("Executable doesn't exist at /ms-playwright/...").
#
# Do not edit by hand. `pnpm --filter visual-regression sync:playwright` rewrites
# this line from the lockfile, `check:playwright` verifies it, and CI fails on a
# mismatch so a dependabot bump cannot silently leave this behind.
FROM mcr.microsoft.com/playwright:v1.63.0-jammy

# Set the working directory
WORKDIR /work

# Copy the necessary files to the container
COPY .npmrc .npmrc
COPY package.json package.json

# Install PNPM
RUN corepack enable && corepack prepare pnpm@10.17.0 --activate

# Get pnpm to install the version of Node declared in .npmrc
RUN pnpm exec ls

# Set the entry point command
CMD ["/bin/bash", "-c", "echo 'Must run with Visual Regression Test Runner: `pnpm run test:visual --ci`'"]
