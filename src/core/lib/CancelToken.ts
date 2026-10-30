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
 * Cancellation handle for an in-flight texture load.
 *
 * @remarks
 * A minimal stand-in for `AbortSignal`, which is unavailable on the older
 * embedded browsers targeted by `WebPlatformChrome50` / `WebPlatformLegacy`.
 *
 * Platform loaders register an abort handler with {@link onCancel}; when the
 * token is cancelled they must stop the underlying request and reject with a
 * {@link TextureLoadCancelledError}.
 */
export class CancelToken {
  cancelled = false;
  private listeners: (() => void)[] = [];

  /**
   * Register a handler to run when the token is cancelled. Runs immediately
   * if the token is already cancelled.
   */
  onCancel(listener: () => void): void {
    if (this.cancelled === true) {
      listener();
      return;
    }
    this.listeners.push(listener);
  }

  cancel(): void {
    if (this.cancelled === true) {
      return;
    }
    this.cancelled = true;
    const listeners = this.listeners;
    this.listeners = [];
    for (const listener of listeners) {
      listener();
    }
  }
}

export class TextureLoadCancelledError extends Error {
  constructor() {
    super('Texture load cancelled');
    this.name = 'TextureLoadCancelledError';
  }
}
