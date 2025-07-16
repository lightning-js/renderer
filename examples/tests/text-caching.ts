import type { ExampleSettings } from '../common/ExampleSettings.js';
import { waitForLoadedDimensions } from '../common/utils.js';

export async function automation(settings: ExampleSettings) {
  await test(settings);
  await settings.snapshot();
}

export default async function test(settings: ExampleSettings) {
  const { renderer, testRoot } = settings;

  const testText =
    'This is a performance test for text rendering with and without Caching.';

  console.log('=== Cache Performance Test ===');
  console.log('Text length:', testText.length);

  const textNodes: any[] = [];
  const nodeCount = 98; // 98 will fill the cache to max, keeping it below the limit to prevent result impact cache mis and cache hit behavior

  console.log(`Creating ${nodeCount} identical text nodes to test caching...`);

  const startTime = performance.now();

  for (let i = 0; i < nodeCount; i++) {
    const textNode = renderer.createTextNode({
      text: testText + '[Cached]',
      color: 0xffffffff,
      fontFamily: 'Ubuntu',
      parent: testRoot,
      fontSize: 24,
      lineHeight: 30,
      x: 10,
      y: 10 + i * 60,
      width: 780,
      contain: 'width',
      wordBreak: 'break-word',
    });
    textNodes.push(textNode);

    // Wait for the node to be fully loaded and rendered
    await waitForLoadedDimensions(textNode);
  }

  const endTime = performance.now();
  console.log(
    `✓ Total time to create ${nodeCount} text nodes: ${(
      endTime - startTime
    ).toFixed(2)}ms - Average time per node: ${(
      (endTime - startTime) /
      nodeCount
    ).toFixed(2)}ms`,
  );

  // Test updating text to see cache miss behavior
  console.log('\nTesting cache miss behavior...');
  const updateStartTime = performance.now();

  for (let i = 0; i < nodeCount; i++) {
    if (textNodes[i]) {
      try {
        textNodes[i].text = testText + `[${i}]`; // Change text to force cache miss

        // Add timeout to prevent hanging
        const timeout = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Timeout waiting for text to load')),
            5000,
          ),
        );
        // Wait for the updated text to be fully processed with timeout
        await Promise.race([waitForLoadedDimensions(textNodes[i]), timeout]);
      } catch (error) {
        console.error(`✗ Error updating text node ${i + 1}:`, error);
        break; // Stop on error
      }
    }
  }

  const updateEndTime = performance.now();
  console.log(
    `✓ Time to update ${nodeCount} text nodes: ${(
      updateEndTime - updateStartTime
    ).toFixed(2)}ms - Average time per node: ${(
      (updateEndTime - updateStartTime) /
      nodeCount
    ).toFixed(2)}ms`,
  );
  console.log(
    `Average time per node: ${(
      (updateEndTime - updateStartTime) /
      nodeCount
    ).toFixed(2)}ms`,
  );

  // Test cache hit behavior by reverting back
  console.log('\nTesting cache hit behavior...');
  const revertStartTime = performance.now();

  for (let i = 0; i < nodeCount; i++) {
    if (textNodes[i]) {
      textNodes[i].text = testText + 11; // Should hit cache
      // Wait for the reverted text to be fully processed
      await waitForLoadedDimensions(textNodes[i]);
    }
  }

  const revertEndTime = performance.now();
  console.log(
    `✓ Time to revert ${nodeCount} text nodes (cache hit): ${(
      revertEndTime - revertStartTime
    ).toFixed(2)}ms - Average time per node: ${(
      (revertEndTime - revertStartTime) /
      nodeCount
    ).toFixed(2)}ms`,
  );

  console.log('=== Performance Test Complete ===');
}
