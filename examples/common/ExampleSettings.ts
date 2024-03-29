/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast Cable Communications Management, LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the License);
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

import type { INode, RendererMain } from '@lightningjs/renderer';

/**
 * Keep in sync with `visual-regression/src/index.ts`
 */
export interface SnapshotOptions {
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ExampleSettings {
  /**
   * Name of the test being run.
   */
  testName: string;
  /**
   * Renderer instance
   */
  renderer: RendererMain;
  /**
   * Core Driver being used by the test.
   */
  driverName: 'main' | 'threadx';
  /**
   * The HTML Element that the Renderer's canvas is a child of
   */
  appElement: HTMLDivElement;
  /**
   * Renderer Node that all tests should use as their root node.
   *
   * @remarks
   * Tests should NEVER use the `renderer.root` node as this will prevent the
   * automation mode from being able to clean up after each test.
   */
  testRoot: INode;
  /**
   * Whether the test is being run in automation mode.
   */
  automation: boolean;
  /**
   * For performance tests that want to support it, use this number as a multiplier
   * for the number of objects created by a test.
   *
   * @remarks
   * This value is `1` by default.
   */
  perfMultiplier: number;
  /**
   * If the test is run in automation mode, this method will take a visual
   * snapshot of the current state of the renderer's canvas for the Visual
   * Regression Test Runner.
   *
   * This method will be a no-op if the test is not run in automation mode.
   */
  snapshot(options?: SnapshotOptions): Promise<void>;
}
