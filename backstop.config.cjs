const fs = require('fs');

// Exclude the following files from regression testing.
const ignoreList = [
  'rotation.ts',
  'child-positioning.ts',
  'scale.ts',
  'test.ts',
  'textures.ts',
  'texture-memory-stress.ts',
  'animation.ts',
];

// To run a specific test, provide its name;
// leave it empty to run all tests (except those on the ignoreList).
const forceTest = '';

// Supply individual configuration for each test file.
const overrideConfig = [
  {
    file: 'animation.ts',
    config: {
      // move to ease-out demo
      keyboardEvents: [
        {
          key: 'ArrowRight',
          delay: 300,
        },
        {
          key: 'ArrowRight',
          delay: 300,
        },
        {
          delay: 150,
        },
      ],
    },
  },
];

// Retrieve the 'port' command line argument if it's provided, or use the default value.
// Example: $ npm run backstop 5178
const port = () => {
  return process.argv.filter((v) => /\d{4}/.test(v))[0] || '5174';
};

// Check for additional override configuration specific to a given test file.
const getConfigByFileName = (file, override) => {
  for (const entry of override) {
    if (entry.file === file) {
      return entry.config;
    }
  }
  return null;
};

const resolveScenarios = (path, ignore) => {
  return fs
    .readdirSync(path)
    .filter((file) => {
      return !ignore.includes(`${file}`);
    })
    .map((file) => {
      const getFile = /^([-\w]+)\./;
      const [match, fileName] = getFile.exec(file);

      if (!fileName || (forceTest && forceTest !== file)) {
        return;
      }

      return {
        label: fileName.replace('-', ' '),
        url: `http://localhost:${port()}/?test=${fileName}`,
        readyEvent: 'ready!',
        misMatchThreshold: 0.1,
        ...getConfigByFileName(file, overrideConfig),
      };
    })
    .filter(Boolean);
};

module.exports = {
  ...require('./backstop.json'),
  scenarios: resolveScenarios('./examples/tests/', ignoreList),
};
