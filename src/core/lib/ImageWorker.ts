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

import { type TextureData } from '../textures/Texture.js';

export const isWorkerSupported = !!window.Worker;
const messageManager: Record<string, [(value: any) => void, (reason: any) => void]> = {};
let worker: Worker | null = null;

if (isWorkerSupported) {
  worker = worker || createWorker();
  worker.onmessage = (event: MessageEvent) => {
    const { src, data, error } = event.data as { src: string, data?: any; error?: string };
    if (src) {
      const [resolve, reject] = messageManager[src]!;

      if (error) {
        reject(new Error(error));
      } else {
        resolve(data);
      }
    }
  };
}

function createWorker(): Worker {
  const workerCode = `
    async function getImage(src, premultiplyAlpha) {
      const response = await fetch(src);
      const blob = await response.blob();
      return {
        data: await createImageBitmap(blob, {
          premultiplyAlpha: premultiplyAlpha ? 'premultiply' : 'none',
          colorSpaceConversion: 'none',
          imageOrientation: 'none',
        }),
      };
    }

    self.onmessage = async (event) => {
      const { src, premultiplyAlpha } = event.data;

      try {
        const data = await getImage(src, premultiplyAlpha);
        self.postMessage({ src, data });
      } catch (error) {
        self.postMessage({ src, error: error.message });
      }
    };
  `;

  const blob: Blob = new Blob([workerCode.replace('"use strict";', '')], { type: 'application/javascript' });
  const blobURL: string = (window.URL ? URL : webkitURL).createObjectURL(blob);
  return new Worker(blobURL);
}

function convertUrlToAbsolute(url: string): string {
  const a = document.createElement('a');
  a.href = url;
  return a.href;
}

export function getImageFromWorker(src: string, premultiplyAlpha: boolean): Promise<TextureData> {
  return new Promise((resolve, reject) => {
    try {
      if (worker) {
        const absoluteSrcUrl = convertUrlToAbsolute(src);
        messageManager[absoluteSrcUrl] = [resolve, reject];
        worker.postMessage({ src: absoluteSrcUrl, premultiplyAlpha });
      }
    } catch (error) {
      reject(error);
    }
  });
}
