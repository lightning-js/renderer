import fs from 'fs';
import path from 'path';

import {
  type IndividualTestResult,
  type TestResult,
} from './src/utils/types.js';

function spawnTest(testName: string): Promise<IndividualTestResult[]> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - Bun.spawn is not typed for some reason or my tsconfig is off
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const child = Bun.spawn(
      ['bun', 'run', `./src/${testName}.ts`, '--testRunner'],
      {
        ipc(message: any) {
          resolve(message);
        },
        onExit: (proc: any, exitCode: number) => {
          if (exitCode !== 0) {
            reject(new Error(`Test process exited with error ${exitCode}`));
          }
        },
        stdio: ['inherit', 'inherit', 'inherit'],
        serialization: 'json',
      },
    );
  });
}

async function runTest(testName: string): Promise<IndividualTestResult[]> {
  const results: IndividualTestResult[] = [];
  const testResults = await spawnTest(testName);

  testResults.forEach((result) => {
    results.push({
      name: result.name,
      opsPerSecond: result.opsPerSecond,
      avgTime: result.avgTime,
      margin: result.margin,
      samples: result.samples,
    });
  });

  return results;
}

function getAllTests(): string[] {
  return fs
    .readdirSync('./src')
    .filter((file) => file.endsWith('.ts'))
    .map((file) => path.basename(file, '.ts'));
}

function saveBaseline(results: TestResult[]): void {
  fs.writeFileSync('baseline.json', JSON.stringify(results, null, 2));
  console.log('Baseline saved to baseline.json');
}

function loadBaseline(): TestResult[] {
  if (fs.existsSync('baseline.json')) {
    return JSON.parse(fs.readFileSync('baseline.json', 'utf8'));
  }
  return [];
}

function main() {
  const args = process.argv.slice(2);
  const createBaseline = args.includes('-c');
  const testToRun = args.find((arg, index) => args[index - 1] === '-t');

  const results: TestResult[] = [];
  let tests: string[] = [];

  if (testToRun !== undefined) {
    tests.push(testToRun);
  } else {
    tests = getAllTests();
  }

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  async function runTestsSequentially(testIndex = 0) {
    if (testIndex >= tests.length) {
      // All tests have been run
      return;
    }

    const testName = tests[testIndex];

    if (testName === undefined) {
      console.error('Test name is undefined');
      return;
    }

    console.log(`Running test: ${testName}`);
    try {
      const testResults = await runTest(testName);
      results.push({ name: testName, results: testResults });
      console.log(`Completed test: ${testName}`);
    } catch (error) {
      console.error(`Error running test ${testName}:`, error);
    }

    // Run the next test
    await runTestsSequentially(testIndex + 1);
  }

  // Start running tests sequentially
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  runTestsSequentially().then(() => {
    console.log('All tests completed');

    if (createBaseline) {
      saveBaseline(results);
    }

    const baseline = loadBaseline();

    if (baseline.length === 0) {
      console.log('No baseline found, skipping comparison');
      return;
    }

    results.forEach((result) => {
      const baselineResult = baseline.find((b) => b.name === result.name);
      if (baselineResult) {
        console.log(`\nResults for ${result.name}:`);
        console.log(
          'Test Name'.padEnd(30) +
            'Current (ops/s)'.padEnd(20) +
            'Baseline (ops/s)'.padEnd(20) +
            'Difference',
        );
        console.log('-'.repeat(80));

        baselineResult.results.forEach((baselineResult, index) => {
          const currentResult = result.results[index];
          if (currentResult) {
            const currentOps = currentResult.opsPerSecond.toFixed(2);
            const baselineOps = baselineResult.opsPerSecond.toFixed(2);
            const diff = (
              ((currentResult.opsPerSecond - baselineResult.opsPerSecond) /
                baselineResult.opsPerSecond) *
              100
            ).toFixed(2);

            const color =
              currentResult.opsPerSecond < baselineResult.opsPerSecond
                ? '\x1b[31m'
                : '\x1b[32m';
            const resetColor = '\x1b[0m';

            console.log(
              `${currentResult.name.padEnd(30)}${currentOps.padEnd(
                20,
              )}${color}${baselineOps.padEnd(20)}${diff}%${resetColor}`,
            );
          }
        });
      }
    });
  });
}

main();
