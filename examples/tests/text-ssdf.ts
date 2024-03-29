import type { ExampleSettings } from '../common/ExampleSettings.js';

export async function automation(settings: ExampleSettings) {
  await test(settings);
  await settings.snapshot();
}

/**
 * Tests that Single-Channel Signed Distance Field (SSDF) fonts are rendered
 * correctly.
 *
 * Text that is thinner than the certified snapshot may indicate that the
 * SSDF font atlas texture was premultiplied before being uploaded to the GPU.
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

  renderer.createTextNode({
    text: 'SSDF',
    color: 0x000000ff,
    fontFamily: 'Ubuntu-ssdf',
    parent: testRoot,
    fontSize: 80,
  });
}
