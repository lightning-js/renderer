import type { ExampleSettings } from '../common/ExampleSettings.js';
import { waitForTextDimensions } from '../common/utils.js';

export async function automation(settings: ExampleSettings) {
  const next = await test(settings);
  await settings.snapshot();
  while (await next()) {
    await settings.snapshot();
  }
}

/**
 * Tests that text nodes with different contain settings and text renderers
 * are displayed correctly.
 *
 * Press the right arrow key to cycle through the different settings when
 * running in the browser.
 *
 * @param settings
 * @returns
 */
export default async function test(settings: ExampleSettings) {
  const { renderer, testRoot } = settings;

  // Set a smaller snapshot area
  testRoot.width = 400;
  testRoot.height = 400;
  testRoot.color = 0xffffffff;

  const textSizeAfterLoadingBg = renderer.createNode({
    x: 5,
    y: 5,
    width: 0,
    height: 0,
    color: 0x22ff227f,
    parent: testRoot,
  });

  const textReportedSizeBg = renderer.createNode({
    x: textSizeAfterLoadingBg.x,
    y: textSizeAfterLoadingBg.y,
    width: 0,
    height: 0,
    color: 0xff11117f,
    parent: testRoot,
  });

  const text1 = renderer.createTextNode({
    x: textSizeAfterLoadingBg.x,
    y: textSizeAfterLoadingBg.y,
    width: 0,
    height: 0,
    color: 0x000000ff,
    fontFamily: 'Ubuntu',
    textRendererOverride: 'sdf',
    fontSize: 20,
    text: `Lorem ipsum dolor sit amet
Consectetur adipiscing elit. Vivamus id.
Suspendisse sollicitudin posuere felis.
Vivamus consectetur ex magna, non mollis.`,
    parent: testRoot,
  });

  const indexInfo = renderer.createTextNode({
    x: testRoot.width,
    y: testRoot.height,
    mount: 1,
    width: 0,
    height: 0,
    color: 0x000000ff,
    fontFamily: 'Ubuntu',
    fontSize: 20,
    text: '1',
    parent: testRoot,
  });

  const textSizeAfterLoadInfo = renderer.createTextNode({
    x: testRoot.width,
    y: testRoot.height - 20,
    mount: 1,
    width: 0,
    height: 0,
    color: 0x00ff00ff,
    fontFamily: 'Ubuntu',
    fontSize: 20,
    text: '',
    parent: testRoot,
  });

  const textReportedSizeInfo = renderer.createTextNode({
    x: testRoot.width,
    y: testRoot.height - 40,
    mount: 1,
    width: 0,
    height: 0,
    color: 0xff0000ff,
    fontFamily: 'Ubuntu',
    fontSize: 20,
    text: '',
    parent: testRoot,
  });

  const textSetDimsInfo = renderer.createTextNode({
    x: testRoot.width,
    y: testRoot.height - 60,
    mount: 1,
    width: 0,
    height: 0,
    color: 0x0000ffff,
    fontFamily: 'Ubuntu',
    fontSize: 20,
    text: '',
    parent: testRoot,
  });

  const header = renderer.createTextNode({
    x: testRoot.width,
    y: testRoot.height - 80,
    mount: 1,
    width: 0,
    height: 0,
    color: 0x000000ff,
    fontFamily: 'Ubuntu',
    fontSize: 20,
    text: '',
    parent: testRoot,
  });

  let i = 0;
  const mutations = [
    () => {
      // SDF, contain none
      text1.textRendererOverride = 'sdf';
      text1.contain = 'none';
      text1.width = 0;
      text1.height = 0;
    },
    () => {
      // SDF, contain width
      text1.contain = 'width';
      text1.width = 200;
      // text1.height = 5;
    },
    () => {
      // SDF, contain width (smaller)
      text1.width = 195;
    },
    () => {
      // SDF, contain both
      text1.contain = 'both';
      text1.height = 202;
    },
    () => {
      // SDF, contain both (1 pixel larger to show another line)
      text1.height = 203;
    },
    () => {
      // Canvas, contain none
      text1.textRendererOverride = 'canvas';
      text1.contain = 'none';
      text1.width = 0;
      text1.height = 0;
    },
    () => {
      // Canvas, contain width
      text1.contain = 'width';
      text1.width = 200;
      text1.height = 5;
    },
    () => {
      // Canvas, contain width (smaller)
      text1.contain = 'width';
      text1.width = 195;
      text1.height = 5;
    },
    () => {
      // Canvas, contain both
      text1.contain = 'both';
      text1.height = 199;
    },
    () => {
      // Canvas, contain both (1 pixel larger to show another line)
      text1.height = 200;
    },
  ];
  /**
   * Run the next mutation in the list
   *
   * @param idx
   * @returns `false` if loop is set to false and we've already gone through all mutations. Otherwise `true`.
   */
  async function next(loop = false, idx = i + 1): Promise<boolean> {
    if (idx > mutations.length - 1) {
      if (!loop) {
        return false;
      }
      idx = 0;
    }
    i = idx;
    mutations[i]?.();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    header.text = makeHeader(
      text1.textRendererOverride!,
      text1.contain,
      text1.width,
      text1.height,
    );
    indexInfo.text = (i + 1).toString();
    textSetDimsInfo.text = `Set size: ${Math.round(text1.width)}x${Math.round(
      text1.height,
    )}`;
    const dimensions = await waitForTextDimensions(text1);
    textSizeAfterLoadingBg.width = text1.width;
    textSizeAfterLoadingBg.height = text1.height;
    textSizeAfterLoadInfo.text = `After 'loading' size: ${Math.round(
      textSizeAfterLoadingBg.width,
    )}x${Math.round(textSizeAfterLoadingBg.height)}`;
    textReportedSizeBg.width = dimensions.width;
    textReportedSizeBg.height = dimensions.height;
    textReportedSizeInfo.text = `'loading' event size: ${Math.round(
      textReportedSizeBg.width,
    )}x${Math.round(textReportedSizeBg.height)}`;
    return true;
  }
  await next(false, 0);

  window.addEventListener('keydown', (event) => {
    // When right arrow is pressed, call next
    if (event.key === 'ArrowRight') {
      next(true).catch(console.error);
    }
  });

  return next;
}

function makeHeader(
  renderer: string,
  contain: string,
  width: number,
  height: number,
) {
  return `${renderer}, contain = ${contain}`;
}
