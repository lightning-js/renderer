# Use Playwright's base image
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

# Set the working directory
WORKDIR /work

# Copy the necessary files to the container
COPY .npmrc .npmrc
COPY package.json package.json

# Install PNPM
RUN corepack enable && corepack prepare pnpm@8.15.5 --activate

# Get pnpm to install the version of Node declared in .npmrc
RUN pnpm exec ls

# Set the entry point command
CMD ["/bin/bash", "-c", "echo 'Must run with Visual Regression Test Runner: `pnpm run test:visual --ci`'"]
