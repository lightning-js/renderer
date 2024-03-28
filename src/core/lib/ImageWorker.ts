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

type MessageCallback = [(value: any) => void, (reason: any) => void];

export class ImageWorkerManager {
  imageWorkersEnabled = true;
  messageManager: Record<string, MessageCallback> = {};
  workers: Worker[] = [];
  workerIndex = 0;

  constructor(numImageWorkers: number) {
    this.workers = this.createWorkers(numImageWorkers);
    this.workers.forEach((worker) => {
      worker.onmessage = this.handleMessage.bind(this);
    });
  }

  private handleMessage(event: MessageEvent) {
    const { src, data, error } = event.data as {
      src: string;
      data?: any;
      error?: string;
    };
    const msg = this.messageManager[src];
    if (msg) {
      const [resolve, reject] = msg;
      delete this.messageManager[src];
      if (error) {
        reject(new Error(error));
      } else {
        resolve(data);
      }
    }
  }

  private createWorkers(numWorkers = 1): Worker[] {
    const workerCode = `
      function hasAlphaChannel(mimeType) {
          return (mimeType.indexOf("image/png") !== -1);
      }

      async function getImage(src, premultiplyAlpha) {
        return new Promise(function(resolve, reject) {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', src, true);
          xhr.responseType = 'blob';

          xhr.onload = function() {
            if (xhr.status === 200) {
              var blob = xhr.response;
              var hasAlphaChannel = premultiplyAlpha !== undefined ? premultiplyAlpha : hasAlphaChannel(blob.type);

              createImageBitmap(blob, {
                premultiplyAlpha: hasAlphaChannel ? 'premultiply' : 'none',
                colorSpaceConversion: 'none',
                imageOrientation: 'none'
              }).then(function(data) {
                resolve({ data: data, premultiplyAlpha: premultiplyAlpha });
              }).catch(function(error) {
                reject(error);
              });
            } else {
              reject(new Error('Failed to load image: ' + xhr.statusText));
            }
          };

          xhr.onerror = function() {
            reject(new Error('Network error occurred while trying to fetch the image.'));
          };

          xhr.send();
        });
      }

      self.onmessage = async (event) => {
        var src = event.data.src;
        var premultiplyAlpha = event.data.premultiplyAlpha;

        getImage(src, premultiplyAlpha)
          .then(function(data) {
              self.postMessage({ src: src, data: data }, [data.data]);
          })
          .catch(function(error) {
              self.postMessage({ src: src, error: error.message });
          });
      };
    `;

    const blob: Blob = new Blob([workerCode.replace('"use strict";', '')], {
      type: 'application/javascript',
    });
    const blobURL: string = (self.URL ? URL : webkitURL).createObjectURL(blob);
    const workers: Worker[] = [];
    for (let i = 0; i < numWorkers; i++) {
      workers.push(new Worker(blobURL));
    }
    return workers;
  }

  private getNextWorker(): Worker {
    const worker = this.workers[this.workerIndex];
    this.workerIndex = (this.workerIndex + 1) % this.workers.length;
    return worker!;
  }

  private convertUrlToAbsolute(url: string): string {
    const absoluteUrl = new URL(url, self.location.href);
    return absoluteUrl.href;
  }

  getImage(
    src: string,
    premultiplyAlpha: boolean | null,
  ): Promise<TextureData> {
    return new Promise((resolve, reject) => {
      try {
        if (this.workers) {
          const absoluteSrcUrl = this.convertUrlToAbsolute(src);
          this.messageManager[absoluteSrcUrl] = [resolve, reject];
          this.getNextWorker().postMessage({
            src: absoluteSrcUrl,
            premultiplyAlpha,
          });
        }
      } catch (error) {
        reject(error);
      }
    });
  }
}
