const fs = require('fs');

// exclude following files regression test
const ignoreList = [
  'animation.ts',
  'rotation.ts',
  'child-positioning.ts',
  'scale.ts',
  'test.ts',
  'text.ts',
  'textures.ts',
  'texture-memory-stress.ts',
];

// grab command line arg port if provided or fallback to default
// i.e $ npm run backstop 5178
const port = () => {
  return process.argv.filter((v) => /\d{4}/.test(v))[0] || '5174';
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

      if (!fileName) {
        return;
      }

      return {
        label: fileName.replace('-', ' '),
        url: `http://localhost:${port()}/?test=${fileName}`,
        readyEvent: 'ready!',
        misMatchThreshold: 0.1,
      };
    });
};

module.exports = {
  ...require('./backstop.json'),
  scenarios: resolveScenarios('./examples/tests/', ignoreList),
};
