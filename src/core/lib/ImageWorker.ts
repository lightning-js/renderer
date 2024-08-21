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
  premultiplyAlpha: boolean | null;
}

interface ImageWorkerMessage {
  id: number;
  src: string;
  data: getImageReturn;
  error: string;
  sx: number | null;
  sy: number | null;
  sw: number | null;
  sh: number | null;
}

/**
 * Note that, within the createImageWorker function, we must only use ES5 code to keep it ES5-valid after babelifying, as
 *  the converted code of this section is converted to a blob and used as the js of the web worker thread.
 *
 * The createImageWorker function is a web worker that fetches an image from a URL and returns an ImageBitmap object.
 * The eslint @typescript rule is disabled for the entire function because the function is converted to a blob and used as the
 * js of the web worker thread, so the typescript syntax is not valid in this context.
 */

/* eslint-disable */
function createImageWorker() {
  function hasAlphaChannel(mimeType: string) {
    return mimeType.indexOf('image/png') !== -1;
  }

  function getImage(
    src: string,
    premultiplyAlpha: boolean | null,
    x: number | null,
    y: number | null,
    width: number | null,
    height: number | null,
  ): Promise<getImageReturn> {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', src, true);
      xhr.responseType = 'blob';

      xhr.onload = function () {
        if (xhr.status !== 200) {
          return reject(new Error('Failed to load image: ' + xhr.statusText));
        }

        var blob = xhr.response;
        var withAlphaChannel =
          premultiplyAlpha !== undefined
            ? premultiplyAlpha
            : hasAlphaChannel(blob.type);

        if (width !== null && height !== null) {
          createImageBitmap(blob, x || 0, y || 0, width, height, {
            premultiplyAlpha: withAlphaChannel ? 'premultiply' : 'none',
            colorSpaceConversion: 'none',
            imageOrientation: 'none',
          })
            .then(function (data) {
              resolve({ data, premultiplyAlpha: premultiplyAlpha });
            })
            .catch(function (error) {
              reject(error);
            });
          return;
        }

        createImageBitmap(blob, {
          premultiplyAlpha: withAlphaChannel ? 'premultiply' : 'none',
          colorSpaceConversion: 'none',
          imageOrientation: 'none',
        })
          .then(function (data) {
            resolve({ data, premultiplyAlpha: premultiplyAlpha });
          })
          .catch(function (error) {
            reject(error);
          });
      };

      xhr.onerror = function () {
        reject(
          new Error('Network error occurred while trying to fetch the image.'),
        );
      };

      xhr.send();
    });
  }

  self.onmessage = (event) => {
    var src = event.data.src;
    var id = event.data.id;
    var premultiplyAlpha = event.data.premultiplyAlpha;
    var x = event.data.sx;
    var y = event.data.sy;
    var width = event.data.sw;
    var height = event.data.sh;

    getImage(src, premultiplyAlpha, x, y, width, height)
      .then(function (data) {
        self.postMessage({ id: id, src: src, data: data });
      })
      .catch(function (error) {
        self.postMessage({ id: id, src: src, error: error.message });
      });
  };
}
/* eslint-enable */

export class ImageWorkerManager {
  imageWorkersEnabled = true;
  messageManager: Record<number, MessageCallback> = {};
  workers: Worker[] = [];
  workerIndex = 0;
  nextId = 0;

  constructor(numImageWorkers: number) {
    this.workers = this.createWorkers(numImageWorkers);
    this.workers.forEach((worker) => {
      worker.onmessage = this.handleMessage.bind(this);
    });
  }

  private handleMessage(event: MessageEvent) {
    const { id, data, error } = event.data as ImageWorkerMessage;
    const msg = this.messageManager[id];
    if (msg) {
      const [resolve, reject] = msg;
      delete this.messageManager[id];
      if (error) {
        reject(new Error(error));
      } else {
        resolve(data);
      }
    }
  }

  private createWorkers(numWorkers = 1): Worker[] {
    const workerCode = `(${createImageWorker.toString()})()`;

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

  private getNextWorker(): Worker | undefined {
    const worker = this.workers[this.workerIndex];
    this.workerIndex = (this.workerIndex + 1) % this.workers.length;
    return worker;
  }

  getImage(
    src: string,
    premultiplyAlpha: boolean | null,
    sx: number | null,
    sy: number | null,
    sw: number | null,
    sh: number | null,
  ): Promise<TextureData> {
    return new Promise((resolve, reject) => {
      try {
        if (this.workers) {
          const id = this.nextId++;
          this.messageManager[id] = [resolve, reject];
          const nextWorker = this.getNextWorker();
          if (nextWorker) {
            nextWorker.postMessage({
              id,
              src: src,
              premultiplyAlpha,
              sx,
              sy,
              sw,
              sh,
            });
          }
        }
      } catch (error) {
        reject(error);
      }
    });
  }
}
