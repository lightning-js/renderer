export const boltProperties = [
  'x',
  'y',
  'z',
  'w',
  'h',
  'color',
  'alpha',
  'parentId',
  'textureId',
  'rtt',
  'scale',
  'rotation',
];

export const pipelineEvents = {
  created: 1,
  updated: 2,
  deleted: 4,
  attached: 8,
  detached: 16,
  onscreen: 32,
  offscreen: 64,
  progress: 128,
  finished: 256,
};
