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

  const textWrapper = renderer.createNode({
    w: 100,
    h: 4,
    y: 200,
    color: 0xffffff00,
    parent: tile,
  });

  const text = renderer.createTextNode({
    text: '',
    fontFamily: 'Ubuntu',
    parent: textWrapper,
  });

  text.on('loaded', () => {
    console.log('text loaded');

    // textWrapper.rtt = true;
    textWrapper.w = 200;

    textWrapper.animate(
      {
        h: 500,
      },
      { duration: 200 },
    );
  });

  setTimeout(() => {
    text.text = 'habahahaba';
  }, 200);

  return tile;
}
