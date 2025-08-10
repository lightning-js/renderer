import type { ExampleSettings } from '../common/ExampleSettings.js';
import { waitForLoadedDimensions } from '../common/utils.js';

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
  testRoot.w = 400;
  testRoot.h = 400;
  testRoot.color = 0xffffffff;

  const textSizeAfterLoadingBg = renderer.createNode({
    x: 5,
    y: 5,
    w: 0,
    h: 0,
    color: 0x22ff227f,
    parent: testRoot,
  });

  const textReportedSizeBg = renderer.createNode({
    x: textSizeAfterLoadingBg.x,
    y: textSizeAfterLoadingBg.y,
    w: 0,
    h: 0,
    color: 0xff11117f,
    parent: testRoot,
  });

  const text1 = renderer.createTextNode({
    x: textSizeAfterLoadingBg.x,
    y: textSizeAfterLoadingBg.y,
    w: 0,
    h: 0,
    color: 0x000000ff,
    forceLoad: true,
    fontFamily: 'Ubuntu',
    textRendererOverride: 'sdf',
    fontSize: 20,
    text: `Lorem ipsum dolor sit e
Consectetur adipiscing elit. Vivamus id.
Suspendisse sollicitudin posuere felis.
Vivamus consectetur ex magna, non mollis.`,
    parent: testRoot,
  });

  const text2 = renderer.createTextNode({
    x: textSizeAfterLoadingBg.x,
    y: textSizeAfterLoadingBg.y,
    w: 0,
    h: 0,
    color: 0x000000ff,
    forceLoad: true,
    fontFamily: 'Ubuntu',
    textRendererOverride: 'canvas',
    fontSize: 20,
    text: `Lorem ipsum dolor sit e
Consectetur adipiscing elit. Vivamus id.
Suspendisse sollicitudin posuere felis.
Vivamus consectetur ex magna, non mollis.`,
    parent: testRoot,
    alpha: 0,
  });

  const indexInfo = renderer.createTextNode({
    x: testRoot.w,
    y: testRoot.h,
    mount: 1,
    color: 0x000000ff,
    fontFamily: 'Ubuntu',
    fontSize: 20,
    text: '1',
    parent: testRoot,
  });

  const textSizeAfterLoadInfo = renderer.createTextNode({
    x: testRoot.w,
    y: testRoot.h - 20,
    mount: 1,
    color: 0x00ff00ff,
    fontFamily: 'Ubuntu',
    fontSize: 20,
    text: '',
    parent: testRoot,
  });

  const textReportedSizeInfo = renderer.createTextNode({
    x: testRoot.w,
    y: testRoot.h - 40,
    mount: 1,
    color: 0xff0000ff,
    fontFamily: 'Ubuntu',
    fontSize: 20,
    text: '',
    parent: testRoot,
  });

  const textSetDimsInfo = renderer.createTextNode({
    x: testRoot.w,
    y: testRoot.h - 60,
    mount: 1,
    color: 0x0000ffff,
    fontFamily: 'Ubuntu',
    fontSize: 20,
    text: '',
    parent: testRoot,
  });

  const header = renderer.createTextNode({
    x: testRoot.w,
    y: testRoot.h - 80,
    mount: 1,
    color: 0x000000ff,
    fontFamily: 'Ubuntu',
    fontSize: 20,
    text: '',
    parent: testRoot,
  });

  let i = 0;
  const mutations = [
    () => {
      text1.alpha = 1;
      text2.alpha = 0;
      text1.maxWidth = 0;
      text1.maxHeight = 0;
    },
    () => {
      // SDF, contain width
      text1.maxWidth = 200;
    },
    () => {
      // SDF, contain width (smaller)
      text1.maxWidth = 195;
    },
    () => {
      // SDF, contain both
      text1.maxHeight = 203;
    },
    () => {
      // SDF, contain both (1 pixel larger to show another line)
      text1.maxHeight = 204;
    },
    () => {
      // Canvas, contain none
      text1.alpha = 0;
      text2.alpha = 1;
      text2.maxWidth = 0;
      text2.h = 0;
    },
    () => {
      // Canvas, contain width
      text2.maxWidth = 200;
    },
    () => {
      // Canvas, contain width (smaller)
      text2.maxWidth = 195;
      text2.maxHeight = 5;
    },
    () => {
      // Canvas, contain both
      text2.maxHeight = 203;
    },
    () => {
      // Canvas, contain both (1 pixel larger to show another line)
      text2.maxHeight = 204;
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
    const targetText = i > 4 ? text2 : text1;

    header.text = makeHeader(
      targetText.textRendererOverride!,
      targetText.w,
      targetText.h,
    );
    indexInfo.text = (i + 1).toString();
    textSetDimsInfo.text = `Set size: ${Math.round(targetText.w)}x${Math.round(
      targetText.h,
    )}`;
    const dimensions = await waitForLoadedDimensions(targetText);
    textSizeAfterLoadingBg.w = targetText.w;
    textSizeAfterLoadingBg.h = targetText.h;
    textSizeAfterLoadInfo.text = `After 'loading' size: ${Math.round(
      textSizeAfterLoadingBg.w,
    )}x${Math.round(textSizeAfterLoadingBg.h)}`;
    textReportedSizeBg.w = dimensions.w;
    textReportedSizeBg.h = dimensions.h;
    textReportedSizeInfo.text = `'loading' event size: ${Math.round(
      textReportedSizeBg.w,
    )}x${Math.round(textReportedSizeBg.h)}`;
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

function makeHeader(renderer: string, maxWidth: number, maxHeight: number) {
  return `${renderer}, maxWidth = ${maxWidth}, maxHeight = ${maxHeight}`;
}
