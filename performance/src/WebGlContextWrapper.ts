// Tree - mimic a rendering tree with core nodes and animations
// test modules
import { Bench } from 'tinybench';
// import * as sinon from 'ts-sinon';
import { performance } from 'perf_hooks';
import { type IndividualTestResult } from './utils/types.js';

import { compareArrays } from '../../src/core/lib/WebGlContextWrapper.js';

const bench = new Bench();

// Grab command line arguments
const args = process.argv.slice(2);
const isTestRunnerTest = args.includes('--testRunner');

// generate large array with random values
const largeArray = new Array(1000).fill(0).map(() => Math.random());
const largeArrayCopy = largeArray.slice();

// change random value in at middle index
const middleIndex = Math.floor(largeArray.length / 2);
largeArrayCopy[middleIndex] = Math.random();

bench
  .add('Arrays', () => {
    compareArrays([1, 2, 3], [1, 2, 3]);
  })
  .add('Large Arrays', () => {
    compareArrays(new Array(1000).fill(1), new Array(1000).fill(1));
  })
  .add('Large Arrays diff vals', () => {
    compareArrays(new Array(1000).fill(1), new Array(1000).fill(2));
  })
  .add('Large Arrays diff lengths', () => {
    compareArrays(new Array(1000).fill(1), new Array(1001).fill(1));
  })
  .add('Large Array random diff', () => {
    compareArrays(largeArray, largeArrayCopy);
  });

await bench.warmup();
await bench.run();

if (!isTestRunnerTest) {
  console.table(bench.table());
}

if (isTestRunnerTest) {
  const results: IndividualTestResult[] = [];

  bench.tasks.forEach((task) => {
    if (!task.result) {
      return;
    }

    if (task.result.error) {
      return;
    }

    results.push({
      name: task.name,
      opsPerSecond: task.result.hz,
      avgTime: task.result.mean * 1000 * 1000,
      margin: task.result.rme,
      samples: task.result.samples.length,
    });
  });

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  process.send(results);
}
