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
interface getImageReturn {
  data: ImageBitmap;
  premultiplyAlpha: boolean | null
}

function createImageWorker() {
  function hasAlphaChannel(mimeType: string) {
      return (mimeType.indexOf("image/png") !== -1);
  }

  function getImage(src: string, premultiplyAlpha: boolean | null) : Promise<getImageReturn> {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', src, true);
      xhr.responseType = 'blob';

      xhr.onload = function() {
        if (xhr.status === 200) {
          var blob = xhr.response;
          var withAlphaChannel = premultiplyAlpha !== undefined ? premultiplyAlpha : hasAlphaChannel(blob.type);

          createImageBitmap(blob, {
            premultiplyAlpha: withAlphaChannel ? 'premultiply' : 'none',
            colorSpaceConversion: 'none',
            imageOrientation: 'none'
          }).then(function(data) {
            resolve({ data, premultiplyAlpha: premultiplyAlpha });
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
      console.log('workerCode', 'xhr.send()');
    });
  }

  self.onmessage = (event) => {    
    var src = event.data.src;
    var premultiplyAlpha = event.data.premultiplyAlpha;

    getImage(src, premultiplyAlpha)
      .then(function(data) {
          self.postMessage([{ src: src, data: data }, { transfert: data }]);
      })
      .catch(function(error) {
          self.postMessage({ src: src, error: error.message });
      });
  };

  return { getImage };
}

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
    const workerCode = `${createImageWorker.toString()}()`;

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
        if (this.workers.length) {
          const absoluteSrcUrl = this.convertUrlToAbsolute(src);
          this.messageManager[absoluteSrcUrl] = [resolve, reject];
          const nextWorker = this.getNextWorker();
          nextWorker.postMessage({
            src: absoluteSrcUrl,
            premultiplyAlpha,
          });
        } else {
          createImageWorker().getImage(src, premultiplyAlpha).then(resolve);
        }
      } catch (error) {
        reject(error);
      }
    });
  }
}
