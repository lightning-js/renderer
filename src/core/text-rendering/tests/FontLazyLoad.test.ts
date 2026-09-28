/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2026 Comcast Cable Communications Management, LLC.
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

/**
 * Lazy font engine initialization.
 */
import { describe, it, expect, vi } from 'vitest';
import { Stage } from '../../Stage.js';

describe('Stage.ensureTextEngineInitialized', () => {
  it('initializes each engine once on demand', () => {
    const sdfInit = vi.fn();
    const canvasInit = vi.fn();
    const stage = Object.create(Stage.prototype) as Stage;
    (stage as unknown as Record<string, unknown>)['textRenderers'] = {
      sdf: { init: sdfInit },
      canvas: { init: canvasInit },
    };
    (stage as unknown as Record<string, unknown>)['initializedTextEngines'] =
      new Set<string>();

    stage.ensureTextEngineInitialized('sdf');
    stage.ensureTextEngineInitialized('sdf');
    expect(sdfInit).toHaveBeenCalledTimes(1);
    expect(canvasInit).not.toHaveBeenCalled();

    stage.ensureTextEngineInitialized('canvas');
    expect(canvasInit).toHaveBeenCalledTimes(1);
  });
});
