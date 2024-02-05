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
 * Tests that the clipping rect is updated correctly when a parent node with
 * clipping set is moved.
 *
 * Use the 'right arrow' key to move the clipping parent around.
 *
 * @param settings
 * @returns
 */
export default async function test(settings: ExampleSettings) {
  const { renderer, testRoot } = settings;

  // Set a smaller snapshot area
  testRoot.width = 200;
  testRoot.height = 200;
  testRoot.color = 0xffffffff;

  const textBg = renderer.createNode({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    color: 0x00ff00ff,
    parent: testRoot,
  });

  const text1 = renderer.createTextNode({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    color: 0x000000ff,
    fontFamily: 'Ubuntu',
    textRendererOverride: 'sdf',
    fontSize: 50,
    text: '',
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
    text: '0',
    parent: testRoot,
  });

  let i = 0;
  const mutations = [
    () => {
      text1.text = 'SDF';
      text1.textRendererOverride = 'sdf';
    },
    () => {
      text1.text = 'SDF\ngyqpj';
    },
    () => {
      text1.text = 'Canvas';
      text1.textRendererOverride = 'canvas';
    },
    () => {
      text1.text = 'Canvas\ngyqpj';
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
    indexInfo.text = i.toString();
    const dimensions = await waitForTextDimensions(text1);
    textBg.width = dimensions.width;
    textBg.height = dimensions.height;
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
