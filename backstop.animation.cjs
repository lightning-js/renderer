// Retrieve the 'port' command line argument if it's provided, or use the default value.
// Example: $ npm run backstop 5178
const port = () => {
  return process.argv.filter((v) => /\d{4}/.test(v))[0] || '5174';
};

// Currently, all the example animations for rendering are consolidated within a single file.
// We navigate through these animations using the ArrowRight key. If you want to take control
// of the animation's progress, you can provide your own delta's deperated by ;
// to test precise progress adjustement.
const animations = [
  'linear;100;300;500',
  'ease-in;100;300;500',
  'ease-out',
  'ease-in-out',
  'ease-in-sine',
  'ease-out-sine',
  'ease-in-out-sine',
  'ease-in-cubic;100;300;500',
  'ease-out-cubic',
  'ease-in-out-cubic;100;300;500',
  'ease-in-circ',
  'ease-out-circ',
  'ease-in-out-circ',
  'ease-in-back',
  'ease-out-back',
  'ease-in-out-back',
  'cubic-bezier(0,1.35,.99,-0.07);400;800;1200',
  'cubic-bezier(.41,.91,.99,-0.07)',
  'loopReverse',
];

const resolveScenarios = (sequence) => {
  return sequence.reduce((acc, instruction, index) => {
    const getLabel = /^(.*?)(;|$)/gi;
    const stepDeltaTime = /;(\d+)/g;
    const label = getLabel.exec(instruction);
    const steps = [...instruction.matchAll(stepDeltaTime)];

    const test = {
      label: label[1],
      url: `http://localhost:${port()}/?test=animation`,
      readyEvent: 'ready!',
      misMatchThreshold: 0.1,
      keyboardEvents: [
        {
          key: 'ArrowRight',
          delay: 300,
          repeat: index,
        },
      ],
    };

    // Push the base test to the stack
    acc.push(test);

    // With each supplied deltaTime, we add an additional scenario to the tests.
    // This new scenario includes an updated label, and we also incorporate
    // the delta value into the query string.
    if (steps?.length) {
      for (const [_, delta] of steps) {
        acc.push({
          ...test,
          label: `${test.label} deltaTime ${delta} ms`,
          url: `${test.url}&delta=${delta}`,
        });
      }
    }
    return acc;
  }, []);
};

module.exports = {
  ...{ ...require('./backstop.json'), id: 'animations' },
  scenarios: resolveScenarios(animations),
};
