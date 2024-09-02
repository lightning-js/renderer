# Performance Benchmark Utility

This utility allows you to run performance benchmarks for various components of the project. It provides a simple way to execute tests, compare results against a baseline, and create new baselines.

## Usage

### Running Tests

To run all tests:
`bun run performance/index.ts`

To run a specific test:
`bun run performance/index.ts -t <test-name>`

### Creating a New Baseline

To create a new baseline:
`bun run performance/index.ts -c`

Results are saved to `performance/baseline.json` and will be automatically used for future comparisons.

## Warning

Use with care, these are limited benchmarks and highligh a specific case of the code, and should be used as approximations to see if changes have improved performance. Use them in combination with other tests such as rendering benchmarks to get a more complete picture.

Don't tunnel on performance, and use these results as a tool to guide your development.
