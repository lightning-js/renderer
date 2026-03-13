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

import type { ImageResponse } from '../../../textures/ImageTexture.js';
import { createImageWorkerNoOptions } from './ImageWorkerNoOptions.js';
import { createImageWorker } from './ImageWorkerDefault.js';

type MessageCallback = [
  (value: ImageResponse) => void,
  (reason: unknown) => void,
];
type ImageWorkerMode = 'default' | 'noOptions' | 'legacy';

interface ImageWorkerLegacyResponse {
  data: string;
  premultiplyAlpha: boolean | null;
}

interface ImageWorkerMessage {
  id: number;
  src: string;
  data: ImageResponse;
  error: string;
  sx: number | null;
  sy: number | null;
  sw: number | null;
  sh: number | null;
}

export class ImageWorkerManager {
  imageWorkersEnabled = true;
  messageManager: Record<number, MessageCallback> = {};
  workers: Worker[] = [];
  workerLoad: number[] = [];
  nextId = 0;

  constructor(
    numImageWorkers: number,
    workerMode: ImageWorkerMode = 'default',
  ) {
    this.workers = this.createWorkers(numImageWorkers, workerMode);
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
    workerMode: ImageWorkerMode = 'default',
  ): Worker[] {
    let workerFactory = createImageWorker;

    if (workerMode === 'noOptions') {
      workerFactory = createImageWorkerNoOptions;
    }

    let workerCode = `(${workerFactory.toString()})()`;

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
  ): Promise<ImageResponse> {
    return new Promise((resolve, reject) => {
      try {
        if (this.workers) {
          const id = this.nextId++;
          this.messageManager[id] = [resolve, reject];
          const nextWorkerIndex = this.getNextWorkerIndex();

          if (nextWorkerIndex !== -1) {
            const worker = this.workers[nextWorkerIndex];
            if (worker === undefined) {
              delete this.messageManager[id];
              reject(new Error('No image worker available.'));
              return;
            }

            this.workerLoad[nextWorkerIndex] =
              (this.workerLoad[nextWorkerIndex] ?? 0) + 1;
            worker.postMessage({
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
