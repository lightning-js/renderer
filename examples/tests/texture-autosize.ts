import type { ExampleSettings } from '../common/ExampleSettings.js';
import robotImg from '../assets/robot/robot.png';
import { waitForLoadedDimensions } from '../common/utils.js';

export async function automation(settings: ExampleSettings) {
  await test(settings);
  await settings.snapshot();
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
  testRoot.width = 200;
  testRoot.height = 250;
  testRoot.color = 0xffffffff;

  const image = renderer.createNode({
    mount: 0.5,
    x: testRoot.width / 2,
    y: testRoot.height / 4,
    autosize: true,
    src: robotImg,
    parent: testRoot,
  });

  const dimensions = await waitForLoadedDimensions(image);

  const dimensionsMatch =
    dimensions.width === image.width && dimensions.height === image.height;

  renderer.createTextNode({
    mountX: 0.5,
    mountY: 1,
    x: testRoot.width / 2,
    y: testRoot.height,
    textAlign: 'center',
    text: dimensionsMatch ? 'Autosize\nSuccess' : 'Autosize\nFailure',
    color: dimensionsMatch ? 0x00ff00ff : 0xff0000ff,
    fontSize: 50,
    fontFamily: 'Ubuntu',
    parent: testRoot,
  });
}
