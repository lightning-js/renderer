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
  isWorkerSupported = !!self.Worker;
  imageWorkersEnabled = true;
  messageManager: Record<string, MessageCallback> = {};
  workers: Worker[] = [];
  workerIndex = 0;

  constructor(numImageWorkers: number) {
    if (this.isWorkerSupported && numImageWorkers > 0) {
      this.workers = this.createWorkers(numImageWorkers);
      this.workers.forEach((worker) => {
        worker.onmessage = this.handleMessage.bind(this);
      });
    } else {
      this.imageWorkersEnabled = false;
    }
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
        // resolve({ data: data as ImageBitmap });
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
        const response = await fetch(src);
        const blob = await response.blob();
        const hasAlphaChannel = premultiplyAlpha ?? this.hasAlphaChannel(blob.type);  

        const data = await createImageBitmap(blob, {
          premultiplyAlpha: hasAlphaChannel ? 'premultiply' : 'none',
          colorSpaceConversion: 'none',
          imageOrientation: 'none',
        });

        return { data, premultiplyAlpha };
      }

      self.onmessage = async (event) => {
        const { src, premultiplyAlpha } = event.data;

        try {
          const data = await getImage(src, premultiplyAlpha);
          self.postMessage({ src, data }, [data.data]);
        } catch (error) {
          self.postMessage({ src, error: error.message });
        }
      };
    `;

    const blob: Blob = new Blob([workerCode.replace('"use strict";', '')], {
      type: 'application/javascript',
    });
    const blobURL: string = (window.URL ? URL : webkitURL).createObjectURL(
      blob,
    );
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
