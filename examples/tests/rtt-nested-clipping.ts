import type { ExampleSettings } from '../common/ExampleSettings.js';
import rocko from '../assets/rocko.png';

export default async function test({ renderer, testRoot }: ExampleSettings) {
  const node = renderer.createNode({
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    color: 0x000000ff,
    parent: testRoot,
  });

  // RTT Node 1
  const rttNode = renderer.createNode({
    x: 100,
    y: 200,
    width: 400,
    height: 400,
    parent: node,
    rtt: true,
    zIndex: 5,
    colorTop: 0xfff00fff,
    colorBottom: 0x00ffffff,
  });

  const rect = renderer.createNode({
    x: 0,
    y: 0,
    width: 300,
    height: 300,
    parent: rttNode,
    clipping: true,
    color: 0xff0000ff,
  });

  renderer.createTextNode({
    x: 0,
    y: 0,
    text: 'Render to texture',
    parent: rttNode,
    fontSize: 48,
    color: 0xffffffff,
    fontFamily: 'Ubuntu',
  });

  renderer.createNode({
    x: 50,
    y: 100,
    width: 600,
    height: 600,
    parent: rttNode,
    src: rocko,
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 's') {
      // rect.clipping = !rect.clipping;
      rect
        .animate(
          {
            x: 100, //going to render out of bounds as well
          },
          {
            duration: 3000,
            easing: 'ease-out',
            loop: true,
            stopMethod: 'reverse',
          },
        )
        .start();
    }
  });

  // Define the page function to configure different test scenarios
}
