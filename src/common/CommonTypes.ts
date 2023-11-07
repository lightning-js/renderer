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

/**
 * Types shared between Main Space and Core Space
 *
 * @remarks
 *
 * @module
 */

/**
 * Represents a width and height.
 */
export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Event handler for when a texture is loading
 */
export type TextureLoadingEventHandler = (target: any) => void;

/**
 * Event handler for when a texture is loaded
 */
export type TextureLoadedEventHandler = (
  target: any,
  dimensions: Readonly<Dimensions>,
) => void;

/**
 * Event handler for when a texture fails to load
 */
export type TextureFailedEventHandler = (target: any, error: Error) => void;

/**
 * Event handler for when text is loading
 */
export type TextLoadingEventHandler = (target: any) => void;

/**
 * Event handler for when text is loaded
 */
export type TextLoadedEventHandler = (
  target: any,
  dimensions: Dimensions,
) => void;

/**
 * Event handler for when text fails to load
 */
export type TextFailedEventHandler = (target: any, error: Error) => void;

/**
 * Payload for when text is loaded
 */
type TextLoadedPayload = {
  type: 'text';
  dimensions: Dimensions;
};

/**
 * Payload for when texture is loaded
 */
type TextureLoadedPayload = {
  type: 'texture';
  dimensions: Dimensions;
};

/**
 * Combined type for all loaded payloads
 */
export type LoadedPayload = TextLoadedPayload | TextureLoadedPayload;

/**
 * Payload for when text failed to load
 */
type TextFailedPayload = {
  type: 'text';
  error: Error;
};

/**
 * Payload for when texture failed to load
 */
type TextureFailedPayload = {
  type: 'texture';
  error: Error;
};

/**
 * Combined type for all failed payloads
 */
export type FailedPayload = TextFailedPayload | TextureFailedPayload;
