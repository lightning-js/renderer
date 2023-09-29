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

import type { Stage } from './Stage.js';

/**
 * Base class for Core extensions.
 *
 * @remarks
 * Core extensions are used to extend the Core Renderer with custom code such as
 * custom fonts, custom shaders, custom textures, custom animation functions,
 * and more.
 */
export abstract class CoreExtension {
  abstract run(stage: Stage): Promise<void>;
}
