# Manual Regression Tests

In addition to the automated [Visual Regression Tests](../visual-regression/README.md),
there are some tests that should be run manually on embedded devices to ensure
the Renderer is working properly.

## Critical Texture Memory Cleanup Test

`?test=texture-cleanup-critical&monitor=true`

This test confirms the Renderer's ability to clean up textures when it never
has a chance to perform Idle Texture Cleanups.

Within an infinite loop, the test updates the texture of a single full screen
background node to a new random NoiseTexture in rapid succession.

**Expected Results**: The tests runs for at least 30 mins minutes without
crashing or the visible Nodes becoming black. The Memory Monitor shows loaded
textures reaching the Critical Threshold and then falling back to the target.

To further confirm that the textures are being properly disposed of, you can use
the Chrome Task Manager to monitor the GPU's memory usage:

1. Click Window > Task Manager
2. Locate the "GPU Process"
3. Observe the "Memory Footprint" column
4. Like the Memory Monitor, the value should increase, and fall significantly
   repeatedly.

## Idle Texture Memory Cleanup Test

`?test=texture-cleanup-idle&monitor=true`

This test confirms the Renderer's ability to clean up textures that are no longer
renderable (not in the configured `boundsMargin`) from GPU VRAM when the Renderer
becomes idle.

Within an infinite loop, this test generates a grid of Nodes with random NoiseTextures
assigned first completely visible on screen (for at least a frame) and then moves
them outside of the configured `boundsMargin` before repeating the loop.

**Expected Results**: The tests runs for at least 30 mins minutes without
crashing or the visible Nodes becoming black. The Memory Monitor shows loaded
textures falling to the Target Threshold roughly every 5 seconds.

To further test that the textures are being properly disposed of, you can use the Chrome Task Manager to monitor the GPU's memory usage:

1. Click Window > Task Manager
2. Locate the "GPU Process"
3. Observe the "Memory Footprint" column
4. Like the Memory Monitor, the value should increase, and fall significantly
   repeatedly.
