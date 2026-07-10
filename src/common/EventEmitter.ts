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

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { IEventEmitter } from './IEventEmitter.js';

export type EventListener = (target: any, data: any) => void;
/**
 * EventEmitter base class
 */
export class EventEmitter implements IEventEmitter {
  protected eventListeners: { [eventName: string]: EventListener[] } = {};

  on(event: string, listener: EventListener): void {
    let listeners = this.eventListeners[event];
    if (!listeners) {
      listeners = [];
      this.eventListeners[event] = listeners;
    }
    listeners.push(listener);
  }

  off(event: string, listener?: EventListener): void {
    const listeners = this.eventListeners[event];
    if (!listeners) {
      return;
    }
    if (!listener) {
      delete this.eventListeners[event];
      return;
    }
    const index = listeners.indexOf(listener);
    if (index >= 0) {
      listeners.splice(index, 1);
    }
  }

  once(event: string, listener: EventListener): void {
    const onceListener = (target: any, data: any) => {
      this.off(event, onceListener);
      listener(target, data);
    };
    this.on(event, onceListener);
  }

  emit(event: string, data?: any): void {
    const listeners = this.eventListeners[event];
    if (listeners === undefined || listeners.length === 0) {
      return;
    }
    // Iterate backwards: safe when once()/off() splice() during emission since
    // removals only shift elements at higher indices (already visited).
    // Zero allocations vs the previous listeners.slice() snapshot approach.
    for (let i = listeners.length - 1; i >= 0; i--) {
      listeners[i]!(this, data);
    }
  }

  removeAllListeners() {
    // Clear in place to avoid allocating a new {} object.
    const listeners = this.eventListeners;
    for (const key in listeners) {
      delete listeners[key];
    }
  }

  /**
   * Clear all listeners for the given event names by setting their array
   * length to 0, WITHOUT deleting the keys. This keeps the eventListeners
   * object in V8's fast-properties mode and avoids re-allocating the arrays
   * on the next on() call. Use this for objects with a known fixed set of
   * event names (e.g. CoreAnimation, CoreAnimationController).
   *
   * Only writes arr.length = 0 when the array is non-empty -- skips the write
   * (and the write barrier on old-gen objects) when already empty, which is
   * the common case after unregisterAnimation() has removed all listeners.
   */
  clearListeners(events: readonly string[]): void {
    const map = this.eventListeners;
    for (let i = 0; i < events.length; i++) {
      const arr = map[events[i]!];
      if (arr !== undefined && arr.length > 0) {
        arr.length = 0;
      }
    }
  }
}
