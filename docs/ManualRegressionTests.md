# Manual Regression Tests

In addition to the automated [Visual Regression Tests](../visual-regression/README.md),
there are some tests that should be run manually on embedded devices to ensure
the Renderer is working properly.

## Reference-Based Texture Memory Management Test

`?test=reference-texture-memory`

This test confirms the Renderer's ability to proactively garbage collect
textures that are, at the very least, likely to not be referenced anymore in
memory.

Within an infinite loop, the test updates the texture of a single full screen
background node to a new random NoiseTexture in rapid succession.

**Expected Results**: The test runs for at least 1 hour without crashing.

To confirm that the textures are being properly disposed of, you can use the Chrome Task Manager to monitor the GPU's memory usage:

1. Click Window > Task Manager
2. Locate the "GPU Process"
3. Observe the "Memory Footprint" column
4. The value should eventually drop significantly toward a minimum and/or reach a
   threadhold.

By default, the ManualCountTextureUsageTracker is used to track texture usage. Also test the experimental FinalizationRegistryTextureUsageTracker instead, by setting the URL param "finalizationRegistry=true".

## Threshold-Based Texture Memory Management Test

`?test=threshold-texture-memory`

This test confirms the Renderer's ability to garbage collect textures from GPU VRAM
that are still referenced and assigned to Nodes but no longer visible within
the configured `boundsMargin` when the configured `txMemByteThreshold` is
exceeded.

Within an infinite loop, this test generates a grid of Nodes with random NoiseTextures
assigned first completely visible on screen (for at least a frame) and then moves
them outside of the configured `boundsMargin` before repeating the loop.

**Expected Results**: The tests runs for at least XXXX minutes on an XXXX running WPE
without crashing or the visible Nodes becoming blank.

To test that the textures are being properly disposed of, you can use the Chrome Task Manager to monitor the GPU's memory usage:

1. Click Window > Task Manager
2. Locate the "GPU Process"
3. Observe the "Memory Footprint" column
4. The value should eventually drop significantly toward a minimum and/or reach a
   threshold.
