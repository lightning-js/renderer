import type { INode } from '../../dist/exports/index.js';
import type { ExampleSettings } from '../common/ExampleSettings.js';
import Pager from '../common/Pager.js';

export async function automation(settings: ExampleSettings) {
  const pager = await test(settings);
  await settings.snapshot();
  while (await pager.nextPage()) {
    await settings.snapshot();
  }
}

export default async function test(settings: ExampleSettings) {
  const { renderer, testRoot } = settings;
  const fontFamily = 'SDF-Ubuntu';
  const createTextAlignPage = (align: 'left' | 'center' | 'right'): INode => {
    const container = renderer.createNode({
      x: 0,
      y: 0,
      w: testRoot.w,
      h: testRoot.h,
    });

    const centerVerticalLine = renderer.createNode({
      x: testRoot.w / 2,
      y: 0,
      w: 1,
      h: testRoot.h,
      color: 0xff0000ff,
      parent: container,
    });

    const testLabel1 = renderer.createTextNode({
      x: testRoot.w / 2,
      y: 20,
      mountX: 0.5,
      text: `Text Align: ${align}, no maxWidth, no contain, mount: [0, .5, 1]`,
      fontFamily,
      fontSize: 40,
      color: 0x0000ffff,
      textAlign: 'center',
      parent: container,
    });

    const textNodeMount0 = renderer.createTextNode({
      x: testRoot.w / 2,
      y: 100,
      text: `Text align: ${align}`,
      fontFamily,
      fontSize: 30,
      color: 0x000000ff,
      textAlign: align,
      parent: container,
    });

    const textNodeMount0_5 = renderer.createTextNode({
      x: testRoot.w / 2,
      y: 150,
      mountX: 0.5,
      text: `Text align: ${align}`,
      fontFamily,
      fontSize: 30,
      color: 0x000000ff,
      textAlign: align,
      parent: container,
    });

    const textNodeMount1 = renderer.createTextNode({
      x: testRoot.w / 2,
      y: 200,
      mountX: 1,
      text: `Text align: ${align}`,
      fontFamily,
      fontSize: 30,
      color: 0x000000ff,
      textAlign: align,
      parent: container,
    });

    const testLabel2 = renderer.createTextNode({
      x: testRoot.w / 2,
      y: 300,
      mountX: 0.5,
      text: `Text Align: ${align}, maxWidth, no contain, mount: [0, .5, 1]`,
      fontFamily,
      fontSize: 40,
      color: 0x0000ffff,
      textAlign: 'center',
      parent: container,
    });

    const textNodeMaxWidthMount0 = renderer.createTextNode({
      x: testRoot.w / 2,
      y: 400,
      maxWidth: 400,
      text: `Text align: ${align}`,
      fontFamily,
      fontSize: 30,
      color: 0x000000ff,
      textAlign: align,
      parent: container,
    });

    const textNodeMaxWidthMount0_5 = renderer.createTextNode({
      x: testRoot.w / 2,
      y: 450,
      maxWidth: 400,
      mountX: 0.5,
      text: `Text align: ${align}`,
      fontFamily,
      fontSize: 30,
      color: 0x000000ff,
      textAlign: align,
      parent: container,
    });

    const textNodeMaxWidthMount1 = renderer.createTextNode({
      x: testRoot.w / 2,
      y: 500,
      maxWidth: 400,
      mountX: 1,
      text: `Text align: ${align}`,
      fontFamily,
      fontSize: 30,
      color: 0x000000ff,
      textAlign: align,
      parent: container,
    });

    const testLabel3 = renderer.createTextNode({
      x: testRoot.w / 2,
      y: 600,
      mountX: 0.5,
      text: `Text Align: ${align}, maxWidth, contain, mount: [0, .5, 1]`,
      fontFamily,
      fontSize: 40,
      color: 0x0000ffff,
      textAlign: 'center',
      parent: container,
    });

    const controlNodeMount0 = renderer.createNode({
      x: testRoot.w / 2,
      y: 700,
      w: 400,
      h: 30,
      color: 0x00ff00ff,
      parent: container,
    });

    const textNodeMaxWidthContainMount0 = renderer.createTextNode({
      x: testRoot.w / 2,
      y: 700,
      maxWidth: 400,
      contain: 'width',
      text: `Text align: ${align}`,
      fontFamily,
      fontSize: 30,
      color: 0x000000ff,
      textAlign: align,
      parent: container,
    });

    const controlNodeMount0_5 = renderer.createNode({
      x: testRoot.w / 2,
      mountX: 0.5,
      y: 750,
      w: 400,
      h: 30,
      color: 0x00ff00ff,
      parent: container,
    });

    const textNodeMaxWidthContainMount0_5 = renderer.createTextNode({
      x: testRoot.w / 2,
      y: 750,
      maxWidth: 400,
      contain: 'width',
      mountX: 0.5,
      text: `Text align: ${align}`,
      fontFamily,
      fontSize: 30,
      color: 0x000000ff,
      textAlign: align,
      parent: container,
    });

    const controlNodeMount1 = renderer.createNode({
      x: testRoot.w / 2,
      mountX: 1,
      y: 800,
      w: 400,
      h: 30,
      // rotation: (Math.PI * 2) / 16,
      color: 0x00ff00ff,
      parent: container,
    });

    const textNodeMaxWidthContainMount1 = renderer.createTextNode({
      x: testRoot.w / 2,
      y: 800,
      maxWidth: 400,
      contain: 'width',
      mountX: 1,
      text: `Text align: ${align}`,
      fontFamily,
      fontSize: 30,
      // rotation: (Math.PI * 2) / 16,
      color: 0x000000ff,
      textAlign: align,
      parent: container,
    });

    return container as INode;
  };

  return new Pager(renderer, testRoot, [
    createTextAlignPage('left'),
    createTextAlignPage('center'),
    createTextAlignPage('right'),
  ]);
}
