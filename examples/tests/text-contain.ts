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

  const textContainBg = renderer.createNode({
    x: 5,
    y: 5,
    width: 0,
    height: 0,
    color: 0x22ff227f,
    parent: testRoot,
  });

  const textSizeBg = renderer.createNode({
    x: textContainBg.x,
    y: textContainBg.y,
    width: 0,
    height: 0,
    color: 0xff11117f,
    parent: testRoot,
  });

  const text1 = renderer.createTextNode({
    x: textContainBg.x,
    y: textContainBg.y,
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

  const textSizeInfo = renderer.createTextNode({
    x: testRoot.width,
    y: testRoot.height - 20,
    mount: 1,
    width: 0,
    height: 0,
    color: 0xff0000ff,
    fontFamily: 'Ubuntu',
    fontSize: 20,
    text: '',
    parent: testRoot,
  });

  const textContainInfo = renderer.createTextNode({
    x: testRoot.width,
    y: testRoot.height - 40,
    mount: 1,
    width: 0,
    height: 0,
    color: 0x00ff00ff,
    fontFamily: 'Ubuntu',
    fontSize: 20,
    text: '',
    parent: testRoot,
  });

  const header = renderer.createTextNode({
    x: testRoot.width,
    y: testRoot.height - 60,
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
      text1.height = 5;
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
    header.text = makeHeader(text1.textRendererOverride!, text1.contain);
    indexInfo.text = (i + 1).toString();
    textContainBg.width = text1.width;
    textContainBg.height = text1.height;
    textContainInfo.text = `Contain size: ${textContainBg.width}x${textContainBg.height}`;
    const dimensions = await waitForTextDimensions(text1);
    textSizeBg.width = dimensions.width;
    textSizeBg.height = dimensions.height;
    textSizeInfo.text = `Reported size: ${Math.round(
      textSizeBg.width,
    )}x${Math.round(textSizeBg.height)}`;
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

function makeHeader(renderer: string, contain: string) {
  return `${renderer}, contain = ${contain}`;
}
