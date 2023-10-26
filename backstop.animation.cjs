// Retrieve the 'port' command line argument if it's provided, or use the default value.
// Example: $ npm run backstop 5178
const port = () => {
  return process.argv.filter((v) => /\d{4}/.test(v))[0] || '5174';
};

const resolveScenarios = () => {
  return [
    'linear',
    'ease-in',
    'ease-out',
    'ease-in-out',
    'ease-in-sine',
    'ease-out-sine',
    'ease-in-out-sine',
    'ease-in-cubic',
    'ease-out-cubic',
    'ease-in-out-cubic',
    'ease-in-circ',
    'ease-out-circ',
    'ease-in-out-circ',
    'ease-in-back',
    'ease-out-back',
    'ease-in-out-back',
    'cubic-bezier(0,1.35,.99,-0.07)',
    'cubic-bezier(.41,.91,.99,-0.07)',
    'loopReverse',
  ].map((label, index) => {
    return {
      label,
      url: `http://localhost:${port()}/?test=animation`,
      readyEvent: 'ready!',
      misMatchThreshold: 0.1,
      keyboardEvents: [
        {
          key: 'ArrowRight',
          delay: 1000,
          repeat: index,
        },
      ],
    };
  });
};

module.exports = {
  ...{ ...require('./backstop.json'), id: 'animations' },
  scenarios: resolveScenarios(),
};
