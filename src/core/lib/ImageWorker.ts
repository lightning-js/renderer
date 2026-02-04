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

import type { CreateImageBitmapSupport } from '../lib/validateImageBitmap.js';
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
    options: {
      supportsOptionsCreateImageBitmap: boolean;
      supportsFullCreateImageBitmap: boolean;
    },
  ): Promise<getImageReturn> {
    return new Promise(function (resolve, reject) {
      var supportsOptionsCreateImageBitmap =
        options.supportsOptionsCreateImageBitmap;
      var supportsFullCreateImageBitmap = options.supportsFullCreateImageBitmap;
      var xhr = new XMLHttpRequest();
      xhr.open('GET', src, true);
      xhr.responseType = 'blob';

      xhr.onload = function () {
        // On most devices like WebOS and Tizen, the file protocol returns 0 while http(s) protocol returns 200
        if (xhr.status !== 200 && xhr.status !== 0) {
          return reject(
            new Error(
              `Image loading failed. HTTP status code: ${
                xhr.status || 'N/A'
              }. URL: ${src}`,
            ),
          );
        }

        var blob = xhr.response;
        var withAlphaChannel =
          premultiplyAlpha !== undefined
            ? premultiplyAlpha
            : hasAlphaChannel(blob.type);

        // createImageBitmap with crop and options
        if (
          supportsFullCreateImageBitmap === true &&
          width !== null &&
          height !== null
        ) {
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
        } else if (
          supportsOptionsCreateImageBitmap === false &&
          supportsOptionsCreateImageBitmap === false
        ) {
          // Fallback for browsers that do not support createImageBitmap with options
          // this is supported for Chrome v50 to v52/54 that doesn't support options
          createImageBitmap(blob)
            .then(function (data) {
              resolve({ data, premultiplyAlpha: premultiplyAlpha });
            })
            .catch(function (error) {
              reject(error);
            });
        } else {
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
        }
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

    // these will be set to true if the browser supports the createImageBitmap options or full
    var supportsOptionsCreateImageBitmap = false;
    var supportsFullCreateImageBitmap = false;

    getImage(src, premultiplyAlpha, x, y, width, height, {
      supportsOptionsCreateImageBitmap,
      supportsFullCreateImageBitmap,
    })
      .then(function (data) {
        // @ts-ignore ts has wrong postMessage signature
        self.postMessage({ id: id, src: src, data: data }, [data.data]);
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
  workerLoad: number[] = [];
  nextId = 0;

  constructor(
    numImageWorkers: number,
    createImageBitmapSupport: CreateImageBitmapSupport,
  ) {
    this.workers = this.createWorkers(
      numImageWorkers,
      createImageBitmapSupport,
    );
    this.workers.forEach((worker, index) => {
      worker.onmessage = (event) => this.handleMessage(event, index);
    });
  }

  private handleMessage(event: MessageEvent, workerIndex: number) {
    const { id, data, error } = event.data as ImageWorkerMessage;
    const msg = this.messageManager[id];

    if (this.workerLoad[workerIndex]) {
      this.workerLoad[workerIndex]--;
    }

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

  private createWorkers(
    numWorkers = 1,
    createImageBitmapSupport: CreateImageBitmapSupport,
  ): Worker[] {
    let workerCode = `(${createImageWorker.toString()})()`;

    // Replace placeholders with actual initialization values
    if (createImageBitmapSupport.options === true) {
      workerCode = workerCode.replace(
        'var supportsOptionsCreateImageBitmap = false;',
        'var supportsOptionsCreateImageBitmap = true;',
      );
    }

    if (createImageBitmapSupport.full === true) {
      workerCode = workerCode.replace(
        'var supportsOptionsCreateImageBitmap = false;',
        'var supportsOptionsCreateImageBitmap = true;',
      );

      workerCode = workerCode.replace(
        'var supportsFullCreateImageBitmap = false;',
        'var supportsFullCreateImageBitmap = true;',
      );
    }

    workerCode = workerCode.replace('"use strict";', '');
    const blob: Blob = new Blob([workerCode], {
      type: 'application/javascript',
    });
    const blobURL: string = (self.URL ? URL : webkitURL).createObjectURL(blob);
    const workers: Worker[] = [];
    for (let i = 0; i < numWorkers; i++) {
      workers.push(new Worker(blobURL));
      this.workerLoad.push(0);
    }
    return workers;
  }

  private getNextWorkerIndex(): number {
    if (this.workers.length === 0) return -1;

    let minLoad = 99;
    let workerIndex = 0;

    for (let i = 0; i < this.workers.length; i++) {
      const load = this.workerLoad[i] || 0;

      if (load === 0) {
        return i;
      }

      if (load < minLoad) {
        minLoad = load;
        workerIndex = i;
      }
    }
    return workerIndex;
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
          const nextWorkerIndex = this.getNextWorkerIndex();

          if (nextWorkerIndex !== -1) {
            const worker = this.workers[nextWorkerIndex];
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.workerLoad[nextWorkerIndex]!++;
            worker!.postMessage({
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
