import type { ExampleSettings } from '../common/ExampleSettings.js';

export default async function ({ renderer, testRoot }: ExampleSettings) {
  const node = renderer.createNode({
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    color: 0x000000ff,
    parent: testRoot,
  });

  const label = renderer.createTextNode({
    parent: node,
    x: 40,
    y: 40,
    fontFamily: 'Ubuntu',
    fontSize: 40,
    text: 'Render to Texture',
  });

  const rttNode = renderer.createNode({
    x: 30,
    y: 110,
    width: 1500,
    height: 1500,
    parent: node,
    color: 0x0000ffff,
    rtt: true,
  });

  const rttNodeImage = renderer.createNode({
    x: 30,
    y: 110,
    width: 500,
    height: 500,
    parent: rttNode,
    src: '../assets/rocko.png',
  });

  // const rttChild1 = renderer.createTextNode({
  //   parent: rttNode,
  //   x: 120,
  //   y: 510,
  //   fontFamily: 'Ubuntu',
  //   fontSize: 20,
  //   text: 'RTT child text',
  // });

  // const rttChild2 = renderer.createNode({
  //   parent: rttNode,
  //   x: 265,
  //   y: 512,
  //   color: 0xffffffff,
  //   width: 20,
  //   height: 20,
  // });
}
