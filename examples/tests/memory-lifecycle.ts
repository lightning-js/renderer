/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2026 Comcast Cable Communications Management, LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { INode } from '@lightningjs/renderer';
import rocko from '../assets/rocko.png';
import type { ExampleSettings } from '../common/ExampleSettings.js';

type Mode = 'canvas' | 'sdf' | 'image' | 'rectangle';

interface MemoryScenario {
  spawn(mode: Mode, round: number, count: number): void;
  shift(offscreen: boolean): void;
  destroy(): void;
  cleanup(): void;
  memory(): { memUsed: number; loadedTextures: number };
}

declare global {
  interface Window {
    rendererMemoryScenario?: MemoryScenario;
  }
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  let nodes: INode[] = [];

  window.rendererMemoryScenario = {
    spawn(mode, round, count) {
      if (nodes.length !== 0)
        throw new Error('Destroy the previous batch first');
      for (let i = 0; i < count; i++) {
        // All nodes fit inside the viewport. The full batch can then cross
        // the viewport boundary and return without being recreated.
        const x = (i % 6) * 300;
        const y = Math.floor(i / 6) * 35;
        if (mode === 'canvas' || mode === 'sdf') {
          nodes.push(
            renderer.createTextNode({
              x,
              y,
              maxWidth: 290,
              maxLines: 1,
              fontSize: 28,
              fontFamily: 'Ubuntu',
              textRendererOverride: mode,
              text: `Unique layout ${round}-${i}-sequence`,
              parent: testRoot,
            }),
          );
        } else {
          nodes.push(
            renderer.createNode({
              x,
              y,
              w: 280,
              h: 30,
              ...(mode === 'image' ? { src: rocko } : { color: 0xeeeeeeff }),
              parent: testRoot,
            }),
          );
        }
      }
    },
    shift(offscreen) {
      nodes.forEach((node, i) => {
        node.x = (i % 6) * 300 + (offscreen ? 4000 : 0);
      });
    },
    destroy() {
      for (const node of nodes) node.destroy();
      nodes = [];
      // Texture cleanup is separate from JS garbage collection. Its normal
      // renderability and startup-grace checks still apply here.
      renderer.cleanup();
    },
    cleanup() {
      renderer.stage.cleanup(true);
    },
    memory() {
      const { memUsed, loadedTextures } =
        renderer.stage.txMemManager.getMemoryInfo();
      return { memUsed, loadedTextures };
    },
  };
}
