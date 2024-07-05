# Use Playwright's base image
FROM oven/bun:latest

# Set the working directory
WORKDIR /work

# Copy the necessary files to the container
COPY .npmrc .
COPY package.json .
COPY bun.lockb .

# add playwright
RUN bunx playwright@1.45 install chromium
RUN bunx playwright@1.45 install-deps

CMD ["/bin/bash", "-c", "echo 'Must run with Visual Regression Test Runner: `bun run test:visual --ci`'"]
