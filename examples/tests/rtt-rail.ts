import type { INode, RendererMain } from '../../dist/exports/index.js';
import type { ExampleSettings } from '../common/ExampleSettings.js';

export default async function test({ testRoot, renderer }: ExampleSettings) {
  const rail = renderer.createNode({
    parent: testRoot,
    x: 90,
    y: 100,
  });

  const tileAmount = 20;

  for (let i = 0; i < tileAmount; i++) {
    createTile(i * 440, rail, renderer);
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      rail
        .animate(
          {
            x: rail.x + 440,
          },
          { duration: 200 },
        )
        .start();
    } else if (e.key === 'ArrowRight') {
      rail
        .animate(
          {
            x: rail.x - 440,
          },
          { duration: 200 },
        )
        .start();
    }
  });
}

function createTile(x: number, parent: INode, renderer: RendererMain) {
  const tile = renderer.createNode({
    w: 400,
    x,
    h: 400,
    parent,
    color: 0x212121ff,
  });

  const wrapper = renderer.createNode({
    w: 0,
    h: 0,
    y: 200,
    // color: 0xffffff00,
    // rtt: true,
    parent: tile,
  });

  const text = renderer.createTextNode({
    text: '',
    fontFamily: 'Ubuntu',
    parent: wrapper,
  });

  // const mini = renderer.createNode({
  //   w: 50,
  //   h: 50,
  //   color: 0xff0000ff,
  //   parent: wrapper
  // })

  text.on('loaded', () => {
    console.log('text loaded');
    // wrapper.color = 0xffffffff;
    // wrapper.w = 200;
    // wrapper.h = 200;
    // wrapper.rtt = true;
    wrapper.w = 200;
    wrapper.rtt = true;

    // wrapper.h = 200;
    // setTimeout(() => {
    //   textWrapper.rtt = true;
    // }, 50)

    wrapper
      .animate(
        {
          h: 500,
        },
        { duration: 200 },
      )
      .start();
  });

  // setTimeout(() => {
  text.text = 'habahahaba';
  // }, 200);

  return tile;
}
