const fs = require('fs');
const baseConfig = require('./backstop.json');

module.exports = {
  ...baseConfig,
  scenarios: getScenariosForProject('./examples/tests/'),
};

function getScenariosForProject(projectPath) {
  const filesToIgnore = [
    'animation.ts',
    'rotation.ts',
    'child-positioning.ts',
    'scale.ts',
    'test.ts',
    'text.ts',
    'textures.ts',
    'texture-memory-stress.ts',
  ];
  const files = fs
    .readdirSync(projectPath)
    .filter((file) => !filesToIgnore.includes(file));
  console.log(files);
  return files.map((file) => {
    const scenarioLabel = file.split('.')[0].split('-').join(' ');
    const testName = file.split('.')[0];

    return {
      label: scenarioLabel,
      url: `http://localhost:5174/?test=${testName}`,
      readyEvent: 'ready!',
      delay: 100,
      misMatchThreshold: 0.1,
    };
  });
}
