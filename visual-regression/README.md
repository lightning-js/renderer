# Visual Regression Test Runner

This directory contains both the code for the Renderer's Visual Regression Test
Runner and a directory of certified snapshot images
(`visual-regression/certified-snapshots`) for each of the defined Visual
Regression Test Case Snapshots (Snapshots).

NOTE: Currently these tests only run the Chromium web browser as a baseline.
Other browser support may come in the future.

## How to run

```
Visual Regression Test Runner
Options:
      --help       Show help                                           [boolean]
      --version    Show version number                                 [boolean]
  -c, --capture    Capture new snapshots              [boolean] [default: false]
  -o, --overwrite  Overwrite existing snapshots (--capture must also be set)
                                                      [boolean] [default: false]
  -v, --verbose    Verbose output                     [boolean] [default: false]
  -s, --skipBuild  Skip building renderer and examples[boolean] [default: false]
  -p, --port       Port to serve examples on           [number] [default: 50535]
```

The test runner may be launched with:

```
pnpm test:visual
```

### Comparison Mode (Default)

By default, the runner will build the Renderer, then the Example Tests, and then
serve/launch the tests in a headless browser. The actual screenshot output from
the headless browser for each defined Visual Regression Snapshot will then be
compared pixel-by-pixel to the certified expected snapshot images. If a
difference is detected, the test will fail.

To make it easy to see what went wrong in any failed Snapshot, three images will
be saved to the `visual-regression/failed-results`: the certified expected
snapshot image, the actual snapshot image, and a difference between the two of
them. As a protection, a Git hook exists that will prevent a commit if this
directory contains any failed result files. The failed results are cleared
before every comparison run.

If any test fails the exit code of the test runner will be `1` to indicate there
was a failure. Otherwise it will be `0`.

### Capture Mode

In order to capture new Snapshots (or overwrite existing ones), you need to run
the Visual Regression Test Runner in Capture mode:

```
pnpm test:visual --capture
```

This will do everything that the Comparison mode does, but skip the actual
comparing and instead capture and save the Snapshot image data files to files
in the `visual-regression/certified-snapshots` directory.

As a safety feature, by default, Capture mode will not overwrite any existing
certified snapshot files. So in order to capture new ones it is recommended
to delete the specific certified snapshot files you'd like to update before
running Capture mode. If you are sure you'd like to overwrite all of the
certified snapshots, you can add the `--overwrite` CLI argument to the command.

## How to define Snapshots

The Snapshots themselves are defined in the individual Example Tests located in the
`examples/tests` directory. Note that not all Example Tests need to define Snapshots.
For an Example Test to define Snapshots, it must export an `automation()`
function. Here's an example of one from the `alpha` Example Test:

```ts
export async function automation(settings: ExampleSettings) {
  // Launch the test
  await test(settings);
  // Take/define a snapshot
  await settings.snapshot();
}
```

This method is called only when the Visual Regression Tests are run. Here the
Example Test only defines one Snapshot. It first runs the Example Test's
renderer code by calling `test()` (defined later in the Example Test's code),
and then takes a single snapshot by calling `settings.snapshot()`. When the
Visual Regression Tests are run, this Snapshot will be given the name
`alpha-1` since it defines the 1st (and only) Snapshot of the `alpha` Example
Test. Addtional snapshots can be defined by calling `settings.snapshot()`
additional times, while of course making changes to the Renderer state in
between calls.

Example Tests that utilize the `PageContainer` class to define separate pages
of static content may use the `pageContainer.snapshotPages()` helper method
to automatically take snapshots of each of the pages defined in the container.
Here's an example from the `text-rotation` Example Test:

```ts
export async function automation(settings: ExampleSettings) {
  // Snapshot all the pages (`await test()` resolves to a PageContainer instance)
  await (await test(settings)).snapshotPages();
}
```
