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

import { WebPlatform } from './WebPlatform.js';

/**
 * Next-generation Web Platform implementation that uses Fetch API
 *
 * @remarks
 * This platform uses the modern Fetch API instead of XMLHttpRequest for
 * loading image resources. The Fetch API provides a more modern, promise-based
 * interface for network requests and better streaming capabilities.
 *
 * Benefits over XMLHttpRequest:
 * - Promise-based (no callback-based API)
 * - Better error handling
 * - More consistent across browsers
 * - Better streaming support
 * - Service Worker compatible
 *
 * All other platform features remain the same as WebPlatform.
 */
export class WebPlatformNext extends WebPlatform {
  override async fetch(url: string): Promise<Blob> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch resource: ${response.status} ${response.statusText}`,
        );
      }

      return await response.blob();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown fetch error';
      throw new Error(`Fetch failed for ${url}: ${errorMessage}`);
    }
  }
}
