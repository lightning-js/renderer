/**
 * RTT Performance Harness
 *
 * Use URL parameters to configure the scene:
 *   ?rttCount=10        number of RTT containers (default 10)
 *   ?childCount=8       animated children per container (default 8)
 *   ?mode=nested        enable 3-level nested RTT containers instead of flat
 *   ?rtt=false          start with RTT disabled (pure baseline)
 *   ?activeRatio=0.25   fraction of children per container that animate
 *                       (1.0 = all animate, 0.1 = 10% animate, rest static)
 *                       Simulates realistic mostly-static RTT content.
 *
 * Animations are driven by the renderer's built-in animation system via
 * node.animate() — no manual per-frame colour computation.
 * Frame timing is driven by renderer.on('frameTick', ...) — no rAF loop.
 *
 * On-screen HUD shows:
 *   - FPS (rolling 60-frame average)
 *   - RTT node count
 *   - rttRenderTime — ms spent inside renderRTTNodes() each frame
 *   - mainRenderTime — ms for addQuads + render() pass
 *   - Total frame time
 *
 * Keyboard:
 *   Space  — toggle RTT on/off
 *   Enter  — start animations
 *   B      — start benchmark sequence (starts animations automatically)
 */
import type { ITextNode } from '@lightningjs/renderer';
import type { ExampleSettings } from '../common/ExampleSettings.js';

// ─── URL param helpers ────────────────────────────────────────────────────────

const getParam = (name: string, fallback: string): string => {
  if (typeof location === 'undefined') return fallback;
  return new URLSearchParams(location.search).get(name) ?? fallback;
};

const RTT_COUNT = parseInt(getParam('rttCount', '10'), 10);
const CHILD_COUNT = parseInt(getParam('childCount', '8'), 10);
const NESTED_MODE = getParam('mode', '') === 'nested';
const RTT_ENABLED_INIT = getParam('rtt', 'true') !== 'false';
// Fraction of children that change colour each frame (0.0–1.0).
// 1.0 = worst-case all-dirty (original behaviour), 0.1 = realistic sparse-dirty.
const ACTIVE_RATIO = Math.min(
  1,
  Math.max(0, parseFloat(getParam('activeRatio', '1.0'))),
);

// ─── Benchmark constants ──────────────────────────────────────────────────────
const BENCH_PREHEAT_RUNS = 5;
const BENCH_PREHEAT_SECS = 5; // seconds per preheat run
const BENCH_MEASURE_RUNS = 5;
const BENCH_MEASURE_SECS = 20; // seconds per measurement run

// ─── Perf measurement state ───────────────────────────────────────────────────

let rttRenderTime = 0;
let mainRenderTime = 0;
let frameCount = 0;
// Rolling FPS: store last FPS_WINDOW deltas in a typed array
const FPS_WINDOW = 60;
const frameTimes = new Float32Array(FPS_WINDOW).fill(16);
let hudFps: ITextNode | null = null;
let hudRttTime: ITextNode | null = null;
let hudMainTime: ITextNode | null = null;
let hudRttCount: ITextNode | null = null;
let hudFrameTime: ITextNode | null = null;
let hudBench: ITextNode | null = null;

// ─── Benchmark state ──────────────────────────────────────────────────────────
type BenchPhase = 'idle' | 'preheat' | 'measure' | 'done';
let benchPhase: BenchPhase = 'idle';
let benchRun = 0;
let benchRunStartTs = 0;
let benchRunFrames = 0;
let benchRunRttSum = 0;
let benchRunMainSum = 0;
let benchRunFpsSum = 0; // sum of per-frame 1000/delta

interface BenchResult {
  run: number;
  fps: number;
  rttMs: number;
  mainMs: number;
}
const benchResults: BenchResult[] = [];

// ─── Main export ─────────────────────────────────────────────────────────────

export default async function ({ renderer, testRoot }: ExampleSettings) {
  // Background
  renderer.createNode({
    x: 0,
    y: 0,
    w: 1920,
    h: 1080,
    color: 0x111111ff,
    parent: testRoot,
  });

  // ── RTT containers ────────────────────────────────────────────────────────

  const rttContainers: ReturnType<typeof renderer.createNode>[] = [];
  const animationStarts: (() => void)[] = [];

  const COLS = Math.ceil(Math.sqrt(RTT_COUNT));
  const PAD = 20;
  const CW = Math.floor((1920 - PAD * (COLS + 1)) / COLS);
  const CH = Math.floor(CW * 0.5625); // 16:9

  for (let i = 0; i < RTT_COUNT; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = PAD + col * (CW + PAD);
    const y = PAD + row * (CH + PAD);

    if (NESTED_MODE) {
      // 3-level nesting: outer > mid > inner, all RTT.
      // Each level has a solid background rect + its own animated children so
      // every FBO has real content and the nesting chain is fully stressed.
      const outerW = CW;
      const outerH = CH;
      const midW = Math.floor(CW * 0.8);
      const midH = Math.floor(CH * 0.8);
      const innerW = Math.floor(CW * 0.5);
      const innerH = Math.floor(CH * 0.5);

      const outer = renderer.createNode({
        x,
        y,
        w: outerW,
        h: outerH,
        rtt: RTT_ENABLED_INIT,
        parent: testRoot,
      });
      // Background fill for outer's FBO
      renderer.createNode({
        x: 0,
        y: 0,
        w: outerW,
        h: outerH,
        color: 0x222244ff,
        parent: outer,
      });
      animationStarts.push(
        ...addAnimatedChildren(
          renderer,
          outer,
          Math.max(2, Math.floor(CHILD_COUNT / 4)),
        ),
      );

      const mid = renderer.createNode({
        x: Math.floor((outerW - midW) / 2),
        y: Math.floor((outerH - midH) / 2),
        w: midW,
        h: midH,
        rtt: RTT_ENABLED_INIT,
        parent: outer,
      });
      // Background fill for mid's FBO
      renderer.createNode({
        x: 0,
        y: 0,
        w: midW,
        h: midH,
        color: 0x224422ff,
        parent: mid,
      });
      animationStarts.push(
        ...addAnimatedChildren(
          renderer,
          mid,
          Math.max(2, Math.floor(CHILD_COUNT / 2)),
        ),
      );

      const inner = renderer.createNode({
        x: Math.floor((midW - innerW) / 2),
        y: Math.floor((midH - innerH) / 2),
        w: innerW,
        h: innerH,
        rtt: RTT_ENABLED_INIT,
        parent: mid,
      });
      // Background fill for inner's FBO
      renderer.createNode({
        x: 0,
        y: 0,
        w: innerW,
        h: innerH,
        color: 0x442222ff,
        parent: inner,
      });
      animationStarts.push(
        ...addAnimatedChildren(renderer, inner, CHILD_COUNT),
      );

      rttContainers.push(outer, mid, inner);
    } else {
      const container = renderer.createNode({
        x,
        y,
        w: CW,
        h: CH,
        color: 0x222222ff,
        rtt: RTT_ENABLED_INIT,
        parent: testRoot,
      });

      rttContainers.push(container);
      animationStarts.push(
        ...addAnimatedChildren(renderer, container, CHILD_COUNT),
      );
    }
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  const hudNode = renderer.createNode({
    x: 1920 - 420,
    y: 10,
    w: 410,
    h: 200,
    color: 0x000000cc,
    parent: testRoot,
    zIndex: 100,
  });

  hudFps = renderer.createTextNode({
    x: 10,
    y: 10,
    w: 390,
    h: 30,
    text: 'FPS: --',
    fontSize: 24,
    color: 0x00ff00ff,
    parent: hudNode,
  });

  hudRttCount = renderer.createTextNode({
    x: 10,
    y: 40,
    w: 390,
    h: 25,
    text: `RTT nodes: ${rttContainers.length}  active: ${Math.round(
      ACTIVE_RATIO * 100,
    )}%`,
    fontSize: 20,
    color: 0xffffffff,
    parent: hudNode,
  });

  hudRttTime = renderer.createTextNode({
    x: 10,
    y: 70,
    w: 390,
    h: 25,
    text: 'rttRender: --ms',
    fontSize: 20,
    color: 0xff8800ff,
    parent: hudNode,
  });

  hudMainTime = renderer.createTextNode({
    x: 10,
    y: 100,
    w: 390,
    h: 25,
    text: 'mainRender: --ms',
    fontSize: 20,
    color: 0x88aaffff,
    parent: hudNode,
  });

  hudFrameTime = renderer.createTextNode({
    x: 10,
    y: 130,
    w: 390,
    h: 25,
    text: 'frame: --ms',
    fontSize: 20,
    color: 0xccccccff,
    parent: hudNode,
  });

  // ── Benchmark status panel ───────────────────────────────────────────────

  // Background behind bench panel
  renderer.createNode({
    x: 1920 - 420,
    y: 290,
    w: 410,
    h: 340,
    color: 0x000000dd,
    parent: testRoot,
    zIndex: 100,
  });

  hudBench = renderer.createTextNode({
    x: 1920 - 420,
    y: 290,
    w: 410,
    h: 340,
    text: 'Initialising...',
    fontSize: 18,
    color: 0x555555ff,
    parent: testRoot,
    zIndex: 101,
  });

  // ── Toggle button ────────────────────────────────────────────────────────

  let rttOn = RTT_ENABLED_INIT;

  const toggleBg = renderer.createNode({
    x: 1920 - 420,
    y: 220,
    w: 410,
    h: 60,
    color: rttOn ? 0x006600ff : 0x660000ff,
    parent: testRoot,
    zIndex: 100,
  });

  const toggleLabel = renderer.createTextNode({
    x: 10,
    y: 12,
    w: 390,
    h: 40,
    text: rttOn ? 'RTT: ON  [Space toggle]' : 'RTT: OFF [Space toggle]',
    fontSize: 22,
    color: 0xffffffff,
    parent: toggleBg,
  });

  const applyToggle = () => {
    rttOn = !rttOn;
    for (let i = 0; i < rttContainers.length; i++) {
      const c = rttContainers[i];
      if (c !== undefined) c.rtt = rttOn;
    }
    toggleBg.color = rttOn ? 0x006600ff : 0x660000ff;
    toggleLabel.text = rttOn
      ? 'RTT: ON  [Space toggle]'
      : 'RTT: OFF [Space toggle]';
    if (hudRttCount !== null)
      hudRttCount.text = `RTT nodes: ${
        rttOn ? rttContainers.length : 0
      }  active: ${Math.round(ACTIVE_RATIO * 100)}%`;
  };

  // Space = toggle RTT, Enter = start animations, B = start benchmark
  let animationsStarted = false;

  const addAnimatedChildrenForContainers = () => {
    for (let i = 0; i < animationStarts.length; i++) {
      const start = animationStarts[i];
      if (start !== undefined) start();
    }
  };

  const startAnimations = () => {
    if (animationsStarted === true) return;
    animationsStarted = true;
    addAnimatedChildrenForContainers();
  };

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      applyToggle();
    } else if (e.code === 'Enter') {
      e.preventDefault();
      startAnimations();
    } else if (e.code === 'KeyB') {
      e.preventDefault();
      startAnimations();
      startBenchmark();
    }
  });

  const startBenchmark = () => {
    if (benchPhase !== 'idle' && benchPhase !== 'done') return;
    benchPhase = 'preheat';
    benchRun = 0;
    benchResults.length = 0;
    benchRunStartTs = 0;
    benchRunFrames = 0;
    benchRunRttSum = 0;
    benchRunMainSum = 0;
    benchRunFpsSum = 0;
    if (hudBench !== null) {
      hudBench.text = `PREHEAT run 1/${BENCH_PREHEAT_RUNS} — ${BENCH_PREHEAT_SECS}s`;
      hudBench.color = 0xffcc00ff;
    }
  };

  // ── Per-frame instrumentation via renderer frameTick ─────────────────────────

  // Monkey-patch renderRTTNodes and render with performance.now() brackets so we
  // can measure RTT vs main-pass cost. Intentional for this profiling tool only —
  // do NOT use in production.
  const stage = (
    renderer as unknown as { stage: { renderer: Record<string, unknown> } }
  ).stage;
  const nativeRenderer = stage?.renderer as Record<string, unknown> | undefined;

  if (nativeRenderer !== undefined) {
    const origRTT = nativeRenderer['renderRTTNodes'] as
      | (() => void)
      | undefined;
    if (origRTT !== undefined) {
      nativeRenderer['renderRTTNodes'] = function (this: unknown) {
        const t0 = performance.now();
        origRTT.call(this);
        rttRenderTime = performance.now() - t0;
      };
    }

    const origRender = nativeRenderer['render'] as (() => void) | undefined;
    if (origRender !== undefined) {
      nativeRenderer['render'] = function (this: unknown) {
        const t0 = performance.now();
        origRender.call(this);
        mainRenderTime = performance.now() - t0;
      };
    }
  }

  // ── frameTick handler — drives HUD + benchmark, no manual animation ──────────
  // Note: EventEmitter calls listener(target, data) — first arg is the emitter.

  renderer.on(
    'frameTick',
    (_target: unknown, { time, delta }: { time: number; delta: number }) => {
      frameCount++;

      // First frame — mark scene ready and update HUD hint
      if (frameCount === 1 && hudBench !== null) {
        hudBench.text =
          'Press Enter to start animations\nPress B to start benchmark\n(5×5s preheat, 5×20s measure)';
        hudBench.color = 0xaaaaaaff;
      }

      // ── Benchmark tick ─────────────────────────────────────────────────────
      if (benchPhase === 'preheat' || benchPhase === 'measure') {
        if (benchRunStartTs === 0) benchRunStartTs = time;
        const elapsed = (time - benchRunStartTs) / 1000;
        const runSecs =
          benchPhase === 'preheat' ? BENCH_PREHEAT_SECS : BENCH_MEASURE_SECS;

        if (benchPhase === 'measure' && delta > 0) {
          benchRunFrames++;
          benchRunRttSum += rttRenderTime;
          benchRunMainSum += mainRenderTime;
          benchRunFpsSum += 1000 / delta;
        }

        if (elapsed >= runSecs) {
          if (benchPhase === 'measure') {
            const avgFps =
              benchRunFrames > 0 ? benchRunFpsSum / benchRunFrames : 0;
            const avgRtt =
              benchRunFrames > 0 ? benchRunRttSum / benchRunFrames : 0;
            const avgMain =
              benchRunFrames > 0 ? benchRunMainSum / benchRunFrames : 0;
            benchResults.push({
              run: benchRun + 1,
              fps: avgFps,
              rttMs: avgRtt,
              mainMs: avgMain,
            });
          }

          benchRun++;
          benchRunStartTs = 0;
          benchRunFrames = 0;
          benchRunRttSum = 0;
          benchRunMainSum = 0;
          benchRunFpsSum = 0;

          const preheatDone =
            benchPhase === 'preheat' && benchRun >= BENCH_PREHEAT_RUNS;
          const measureDone =
            benchPhase === 'measure' && benchRun >= BENCH_MEASURE_RUNS;

          if (preheatDone) {
            benchPhase = 'measure';
            benchRun = 0;
            if (hudBench !== null) {
              hudBench.text = `MEASURING run 1/${BENCH_MEASURE_RUNS} — ${BENCH_MEASURE_SECS}s`;
              hudBench.color = 0x00ccffff;
            }
          } else if (measureDone) {
            benchPhase = 'done';
            printBenchResults();
          } else if (benchPhase === 'preheat') {
            if (hudBench !== null)
              hudBench.text = `PREHEAT run ${
                benchRun + 1
              }/${BENCH_PREHEAT_RUNS} — ${BENCH_PREHEAT_SECS}s`;
          } else {
            if (hudBench !== null)
              hudBench.text = `MEASURING run ${
                benchRun + 1
              }/${BENCH_MEASURE_RUNS} — ${BENCH_MEASURE_SECS}s`;
          }
        }
      }

      // ── HUD update — every 10 frames ───────────────────────────────────────
      frameTimes[frameCount % FPS_WINDOW] = delta;
      if (frameCount % 10 === 0) {
        let sum = 0;
        for (let j = 0; j < FPS_WINDOW; j++) sum += frameTimes[j] ?? 0;
        const avgFrame = sum / FPS_WINDOW;
        const fps = avgFrame > 0 ? 1000 / avgFrame : 0;

        if (hudFps !== null) {
          hudFps.text = `FPS: ${fps.toFixed(1)}`;
          hudFps.color =
            fps >= 55 ? 0x00ff00ff : fps >= 30 ? 0xff8800ff : 0xff2222ff;
        }
        if (hudRttTime !== null)
          hudRttTime.text = `rttRender: ${rttRenderTime.toFixed(2)}ms`;
        if (hudMainTime !== null)
          hudMainTime.text = `mainRender: ${mainRenderTime.toFixed(2)}ms`;
        if (hudFrameTime !== null)
          hudFrameTime.text = `frame: ${avgFrame.toFixed(2)}ms`;
      }
    },
  );

  const printBenchResults = () => {
    let totalFps = 0;
    let totalRtt = 0;
    let totalMain = 0;

    let lines = '=== BENCHMARK RESULTS ===\n';
    lines += `Config: ${RTT_COUNT} RTT nodes, ${CHILD_COUNT} children, ${
      NESTED_MODE ? 'nested' : 'flat'
    }, activeRatio=${ACTIVE_RATIO}\n`;
    lines += '-'.repeat(44) + '\n';

    for (let i = 0; i < benchResults.length; i++) {
      const r = benchResults[i];
      if (r === undefined) continue;
      totalFps += r.fps;
      totalRtt += r.rttMs;
      totalMain += r.mainMs;
      lines += `Run ${r.run}: FPS=${r.fps.toFixed(1)}  rtt=${r.rttMs.toFixed(
        2,
      )}ms  main=${r.mainMs.toFixed(2)}ms\n`;
    }

    const n = benchResults.length;
    const avgFps = n > 0 ? totalFps / n : 0;
    const avgRtt = n > 0 ? totalRtt / n : 0;
    const avgMain = n > 0 ? totalMain / n : 0;

    lines += '-'.repeat(44) + '\n';
    lines += `AVG:    FPS=${avgFps.toFixed(1)}  rtt=${avgRtt.toFixed(
      2,
    )}ms  main=${avgMain.toFixed(2)}ms`;

    console.log(lines);

    if (hudBench !== null) {
      hudBench.text = lines;
      hudBench.color = 0x00ff88ff;
    }
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addAnimatedChildren(
  renderer: ExampleSettings['renderer'],
  parent: ReturnType<typeof renderer.createNode>,
  count: number,
): (() => void)[] {
  const starts: (() => void)[] = [];
  const cols = Math.ceil(Math.sqrt(count));
  const pw = (parent as unknown as { w: number }).w ?? 200;
  const ph = (parent as unknown as { h: number }).h ?? 112;
  const cw = Math.floor(pw / cols) - 4;
  const ch = Math.floor(ph / Math.ceil(count / cols)) - 4;

  // Only the first activeCount children animate; the rest stay static.
  // This models realistic RTT content where most subtrees are idle.
  const activeCount = Math.max(1, Math.floor(count * ACTIVE_RATIO));

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const child = renderer.createNode({
      x: col * (cw + 4) + 2,
      y: row * (ch + 4) + 2,
      w: cw,
      h: ch,
      color: 0x3344aaff,
      parent,
    });

    if (i < activeCount) {
      // Vary duration and delay per child to spread phases naturally.
      // stopMethod: 'reverse' produces a smooth ping-pong colour pulse.
      starts.push(() => {
        child
          .animate(
            { color: 0xff2244ff },
            {
              duration: 1600 + i * 113,
              loop: true,
              stopMethod: 'reverse',
              easing: 'ease-in-out',
              delay: i * 37,
            },
          )
          .start();
      });
    }
  }
  return starts;
}
